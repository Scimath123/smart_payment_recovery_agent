import type { PipelineStage } from "@/types";
import type { TrackedTransaction } from "./store";

export function computeStageCounts(
  transactions: Record<string, TrackedTransaction>
): Record<PipelineStage, number> {
  const counts: Record<PipelineStage, number> = {
    QUEUED: 0,
    WORKER_ASSIGNED: 0,
    RAG: 0,
    ML_SCORING: 0,
    DECISION: 0,
    RECOVERED: 0,
    FAILED_AGAIN: 0,
    ESCALATED: 0,
    CIRCUIT_OPEN: 0,
  };
  for (const txn of Object.values(transactions)) {
    if (txn.stage) counts[txn.stage] += 1;
  }
  return counts;
}

const ACTIVE_AGENT_STAGES = ["WORKER_ASSIGNED", "RAG", "ML_SCORING", "DECISION"];


export function selectFocusTransaction(
  transactions: Record<string, TrackedTransaction>
): TrackedTransaction | null {
  const all = Object.values(transactions);
  if (all.length === 0) return null;

  const active = all
    .filter((t) => t.stage && ACTIVE_AGENT_STAGES.includes(t.stage))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  if (active.length > 0) return active[0];

  const decided = all
    .filter((t) => t.agent_decision)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  return decided[0] ?? null;
}