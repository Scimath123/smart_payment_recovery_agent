export type TxnStatus =
  | "FAILED"
  | "AGENT_EVALUATING"
  | "RETRY_SCHEDULED"
  | "RECOVERED"
  | "FAILED_AGAIN"
  | "ESCALATED";

export type AgentDecision = {
  action: string;
  delay_before_retry_min: number;
  confidence: number;
  reasoning: string;
  tier_used: "fast_path" | "llm_reasoning";
};

export type Transaction = {
  transaction_id: string;
  status: TxnStatus;
  error_text: string;
  retry_count: number;
  category: string | null;
  amount_usd: number | null;
  agent_decision: AgentDecision | null;
  updated_at: string;
};

export type DashboardMetrics = {
  total_failed: number;
  recovered: number;
  escalated: number;
  pending: number;
  recovery_rate: number;
  revenue_recovered_usd: number;
  queue_depth: number;
};

// Real event types your patched worker.py actually emits
export type WsEventType =
  | "QUEUED"
  | "WORKER_ASSIGNED"
  | "RAG_STARTED"
  | "RAG_COMPLETED"
  | "ML_SCORING"
  | "ML_SCORED"
  | "RETRY_SCHEDULED"
  | "RECOVERED"
  | "FAILED_AGAIN"
  | "ESCALATED"
  | "CIRCUIT_OPEN";

export type WsEvent = {
  event: WsEventType;
  transaction_id: string;
  status?: TxnStatus;
  decision?: AgentDecision;
  tier_used?: "fast_path" | "llm_reasoning";
  top_similarity?: number;
  cases_found?: number;
  top_strategy?: { retry_action: string; delay_before_retry_min: number; predicted_success_prob: number };
  amount_usd?: number;
  category?: string;
};

// --- Additions below: needed by lib/api.ts, lib/websocket.ts, lib/store.ts ---

export type CircuitBreakerStatus = {
  category: string;
  attempts_last_hour: number;
  recoveries_last_hour: number;
  success_rate: number | null;
  circuit_open: boolean;
};

export type FailedTransactionPayload = {
  transaction_id: string;
  idempotency_key: string;
  error_text: string;
  transaction_data: Record<string, unknown>;
};

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "offline";


export type PipelineStage =
  | "QUEUED"
  | "WORKER_ASSIGNED"
  | "RAG"
  | "ML_SCORING"
  | "DECISION"
  | "RECOVERED"
  | "FAILED_AGAIN"
  | "ESCALATED"
  | "CIRCUIT_OPEN";