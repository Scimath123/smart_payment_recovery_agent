import { create } from "zustand";
import type {
  Transaction,
  WsEvent,
  DashboardMetrics,
  CircuitBreakerStatus,
  ConnectionStatus,
  PipelineStage,
} from "@/types";

export const MAX_WORKERS = 5;
const MAX_EVENT_HISTORY = 300;
const MAX_LIVE_RECOVERIES = 30;

function stageForEvent(eventType: WsEvent["event"]): PipelineStage | null {
  switch (eventType) {
    case "QUEUED": return "QUEUED";
    case "WORKER_ASSIGNED": return "WORKER_ASSIGNED";
    case "RAG_STARTED":
    case "RAG_COMPLETED": return "RAG";
    case "ML_SCORING":
    case "ML_SCORED": return "ML_SCORING";
    case "RETRY_SCHEDULED": return "DECISION";
    case "RECOVERED": return "RECOVERED";
    case "FAILED_AGAIN": return "FAILED_AGAIN";
    case "ESCALATED": return "ESCALATED";
    case "CIRCUIT_OPEN": return "CIRCUIT_OPEN";
    default: return null;
  }
}

const ACTIVE_STAGES: PipelineStage[] = ["WORKER_ASSIGNED", "RAG", "ML_SCORING", "DECISION"];
const TERMINAL_STAGES: PipelineStage[] = ["RECOVERED", "FAILED_AGAIN", "ESCALATED", "CIRCUIT_OPEN"];

type LiveRecovery = { transaction_id: string; amount_usd: number; at: number };

export type TrackedTransaction = Transaction & {
  stage: PipelineStage | null;
  ragTopSimilarity?: number;
  ragCasesFound?: number;
  mlTopStrategy?: { retry_action: string; delay_before_retry_min: number; predicted_success_prob: number };
  isDemo?: boolean;
};

interface RecoveryState {
  connectionStatus: ConnectionStatus;
  mode: "live" | "demo";
  metrics: DashboardMetrics | null;
  circuitBreaker: CircuitBreakerStatus[];
  transactions: Record<string, TrackedTransaction>;
  events: WsEvent[];
  liveRecoveries: LiveRecovery[];
  fastPathCount: number;
  agentPathCount: number;

  setConnectionStatus: (s: ConnectionStatus) => void;
  setMetrics: (m: DashboardMetrics) => void;
  setCircuitBreaker: (c: CircuitBreakerStatus[]) => void;
  hydrateFeed: (feed: Transaction[]) => void;
  ingestEvent: (event: WsEvent, opts?: { demo?: boolean }) => void;

  enterDemoMode: () => void;
  /** Called by websocket.ts the instant a real connection succeeds — forces
   *  live mode and wipes any synthetic demo transactions, per the rule that
   *  a real backend connection always takes priority over Demo Mode. */
  forceLiveMode: () => void;

  activeWorkerCount: () => number;
  queueDepthFromEvents: () => number;
  /** Client-side estimate only — sums amount_usd for transactions currently
   *  tracked in-memory (via feed hydration + WS events) that are not yet in
   *  a terminal state. The backend has no endpoint for this figure, so it
   *  is necessarily a lower bound limited to what this client has observed,
   *  not an authoritative DB aggregate. Label it as an estimate in the UI. */
  revenueAtRiskEstimate: () => number;
}

export const useRecoveryStore = create<RecoveryState>((set, get) => ({
  connectionStatus: "connecting",
  mode: "live",
  metrics: null,
  circuitBreaker: [],
  transactions: {},
  events: [],
  liveRecoveries: [],
  fastPathCount: 0,
  agentPathCount: 0,

  setConnectionStatus: (s) => set({ connectionStatus: s }),
  setMetrics: (m) => set({ metrics: m }),
  setCircuitBreaker: (c) => set({ circuitBreaker: c }),

  hydrateFeed: (feed) =>
    set((state) => {
      const next = { ...state.transactions };
      for (const txn of feed) {
        const existing = next[txn.transaction_id];
        // feed data is authoritative for everything except the live pipeline
        // stage and RAG/ML summaries, which only WS events know about
        next[txn.transaction_id] = {
          ...txn,
          stage: existing?.stage ?? null,
          ragTopSimilarity: existing?.ragTopSimilarity,
          ragCasesFound: existing?.ragCasesFound,
          mlTopStrategy: existing?.mlTopStrategy,
          isDemo: false,
        };
      }
      return { transactions: next };
    }),

  ingestEvent: (event, opts) =>
    set((state) => {
      const stage = stageForEvent(event.event);
      const prev = state.transactions[event.transaction_id];
      const isDemo = opts?.demo ?? prev?.isDemo ?? false;

      const updated: TrackedTransaction = {
        transaction_id: event.transaction_id,
        status: (event.status ?? prev?.status ?? "FAILED") as Transaction["status"],
        error_text: prev?.error_text ?? "",
        retry_count: prev?.retry_count ?? 0,
        category: event.category ?? prev?.category ?? null,
        amount_usd: event.amount_usd ?? prev?.amount_usd ?? null,
        agent_decision: event.decision ?? prev?.agent_decision ?? null,
        updated_at: new Date().toISOString(),
        stage: stage ?? prev?.stage ?? null,
        ragTopSimilarity: event.top_similarity ?? prev?.ragTopSimilarity,
        ragCasesFound: event.cases_found ?? prev?.ragCasesFound,
        mlTopStrategy: event.top_strategy ?? prev?.mlTopStrategy,
        isDemo,
      };

      const transactions = { ...state.transactions, [event.transaction_id]: updated };
      const events = [event, ...state.events].slice(0, MAX_EVENT_HISTORY);

      let liveRecoveries = state.liveRecoveries;
      if (event.event === "RECOVERED" && typeof event.amount_usd === "number") {
        liveRecoveries = [
          { transaction_id: event.transaction_id, amount_usd: event.amount_usd, at: Date.now() },
          ...state.liveRecoveries,
        ].slice(0, MAX_LIVE_RECOVERIES);
      }

      let { fastPathCount, agentPathCount } = state;
      if (event.event === "RETRY_SCHEDULED" && event.tier_used) {
        if (event.tier_used === "fast_path") fastPathCount += 1;
        else agentPathCount += 1;
      }

      return { transactions, events, liveRecoveries, fastPathCount, agentPathCount };
    }),

  enterDemoMode: () => set({ mode: "demo" }),

  forceLiveMode: () =>
    set((state) => {
      if (state.mode === "live") return {};
      const transactions: Record<string, TrackedTransaction> = {};
      for (const [id, txn] of Object.entries(state.transactions)) {
        if (!txn.isDemo) transactions[id] = txn;
      }
      const events = state.events.filter((e) => !e.transaction_id.startsWith("demo_"));
      return { mode: "live", transactions, events };
    }),

  activeWorkerCount: () => {
    const { transactions } = get();
    const count = Object.values(transactions).filter(
      (t) => t.stage && ACTIVE_STAGES.includes(t.stage)
    ).length;
    return Math.min(count, MAX_WORKERS);
  },

  queueDepthFromEvents: () => {
    const { transactions } = get();
    return Object.values(transactions).filter((t) => t.stage === "QUEUED").length;
  },

  revenueAtRiskEstimate: () => {
    const { transactions } = get();
    return Object.values(transactions)
      .filter((t) => !t.stage || !TERMINAL_STAGES.includes(t.stage))
      .reduce((sum, t) => sum + (t.amount_usd ?? 0), 0);
  },
}));