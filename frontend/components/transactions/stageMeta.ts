import type { PipelineStage } from "@/types";

export const STAGE_ORDER: PipelineStage[] = [
  "QUEUED",
  "WORKER_ASSIGNED",
  "RAG",
  "ML_SCORING",
  "DECISION",
  "RECOVERED",
];

export const STAGE_LABEL: Record<PipelineStage, string> = {
  QUEUED: "Queued",
  WORKER_ASSIGNED: "Worker Assigned",
  RAG: "RAG Retrieval",
  ML_SCORING: "ML Scoring",
  DECISION: "Recovery Action",
  RECOVERED: "Recovered",
  FAILED_AGAIN: "Failed Again",
  ESCALATED: "Escalated",
  CIRCUIT_OPEN: "Circuit Open",
};

export const STAGE_COLOR: Record<PipelineStage, string> = {
  QUEUED: "text-muted",
  WORKER_ASSIGNED: "text-amber",
  RAG: "text-violet",
  ML_SCORING: "text-violet",
  DECISION: "text-amber",
  RECOVERED: "text-green",
  FAILED_AGAIN: "text-red",
  ESCALATED: "text-red",
  CIRCUIT_OPEN: "text-red",
};