import { useRecoveryStore } from "./store";
import type { WsEvent } from "@/types";

const FAILURE_TEMPLATES: Record<string, string[]> = {
  insufficient_funds: ["Do Not Honour - Insufficient funds", "Decline code 51: Not enough balance"],
  bank_timeout: ["Bank server did not respond in time", "Gateway timeout - issuing bank unreachable"],
  otp_fail: ["3DS authentication timeout after 30s", "OTP verification failed - incorrect code entered"],
  card_expired: ["Card expired - decline code 54"],
  network_error: ["Network error - request could not be completed", "ISO8583 message parsing error"],
  risk_block: ["Transaction blocked - suspicious activity detected", "Do Not Honour - Bank declined due to risk parameters"],
};
const CATEGORIES = Object.keys(FAILURE_TEMPLATES);
const ACTIONS = ["retry_same_card", "retry_upi", "retry_wallet", "delay_2hr_retry"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function emit(event: WsEvent) {
  useRecoveryStore.getState().ingestEvent(event, { demo: true });
}

function scheduleTransaction(id: string, timers: ReturnType<typeof setTimeout>[]) {
  const category = pick(CATEGORIES);
  const errorText = pick(FAILURE_TEMPLATES[category]);
  const amount = Math.round((Math.random() * 9000 + 100) * 100) / 100;
  const tier: "fast_path" | "llm_reasoning" = Math.random() < 0.7 ? "fast_path" : "llm_reasoning";
  const action = pick(ACTIONS);
  const confidence = Math.round((0.4 + Math.random() * 0.5) * 100) / 100;
  const recovered = Math.random() < confidence;

  const steps: Array<{ delay: number; build: () => WsEvent }> = [
    { delay: 0, build: () => ({ event: "QUEUED", transaction_id: id, amount_usd: amount, category }) },
    { delay: 250, build: () => ({ event: "WORKER_ASSIGNED", transaction_id: id }) },
    { delay: 500, build: () => ({ event: "RAG_STARTED", transaction_id: id }) },
    {
      delay: 900,
      build: () => ({
        event: "RAG_COMPLETED",
        transaction_id: id,
        top_similarity: Math.round((0.6 + Math.random() * 0.35) * 100) / 100,
        cases_found: 5,
      }),
    },
    { delay: 1100, build: () => ({ event: "ML_SCORING", transaction_id: id }) },
    {
      delay: 1500,
      build: () => ({
        event: "ML_SCORED",
        transaction_id: id,
        top_strategy: { retry_action: action, delay_before_retry_min: 30, predicted_success_prob: confidence },
      }),
    },
    {
      delay: 1900,
      build: () => ({
        event: "RETRY_SCHEDULED",
        transaction_id: id,
        tier_used: tier,
        decision: {
          action,
          delay_before_retry_min: 30,
          confidence,
          reasoning: `Simulated ${tier === "fast_path" ? "fast-path" : "agent"} decision based on retrieved cases and ML score.`,
          tier_used: tier,
        },
      }),
    },
    {
      delay: 2400,
      build: () => ({
        event: recovered ? "RECOVERED" : "FAILED_AGAIN",
        transaction_id: id,
        status: recovered ? "RECOVERED" : "FAILED_AGAIN",
        amount_usd: recovered ? amount : undefined,
      }),
    },
  ];

  for (const step of steps) {
    timers.push(setTimeout(() => emit({ ...step.build(), error_text: errorText } as WsEvent), step.delay));
  }
}

/** Fires `count` synthetic transactions with staggered start times to mimic
 *  a burst. Returns a stop function that clears all pending timers. Never
 *  touches the real backend — purely client-side, ids prefixed `demo_`. */
export function runDemoBurst(count: number): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  const runId = Date.now();

  for (let i = 0; i < count; i++) {
    const id = `demo_${runId}_${i}`;
    const stagger = Math.random() * 1500;
    timers.push(setTimeout(() => scheduleTransaction(id, timers), stagger));
  }

  return () => {
    for (const t of timers) clearTimeout(t);
  };
}