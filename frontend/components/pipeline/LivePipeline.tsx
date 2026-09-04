"use client";

import { useMemo } from "react";
import { useRecoveryStore, MAX_WORKERS } from "@/lib/store";
import { computeStageCounts } from "@/lib/pipelineStats";
import { PipelineNode } from "./PipelineNode";
import { PipelineArrow } from "./PipelineArrow";

export function LivePipeline() {
  const transactions = useRecoveryStore((s) => s.transactions);
  const stageCounts = useMemo(() => computeStageCounts(transactions), [transactions]);

  const activeWorkers = Math.min(
    stageCounts.WORKER_ASSIGNED + stageCounts.RAG + stageCounts.ML_SCORING + stageCounts.DECISION,
    MAX_WORKERS
  );

  return (
    <div className="flex flex-wrap items-center gap-1 overflow-x-auto py-2">
      <PipelineNode label="Queue" count={stageCounts.QUEUED} active={stageCounts.QUEUED > 0} color="teal" />
      <PipelineArrow active={stageCounts.QUEUED > 0} />

      <PipelineNode
        label={`Workers ${activeWorkers}/${MAX_WORKERS}`}
        count={activeWorkers}
        active={activeWorkers > 0}
        color="amber"
      />
      <PipelineArrow active={stageCounts.RAG > 0} />

      <PipelineNode label="RAG" count={stageCounts.RAG} active={stageCounts.RAG > 0} color="violet" />
      <PipelineArrow active={stageCounts.ML_SCORING > 0} />

      <PipelineNode
        label="ML Score"
        count={stageCounts.ML_SCORING}
        active={stageCounts.ML_SCORING > 0}
        color="violet"
      />
      <PipelineArrow active={stageCounts.DECISION > 0} />

      <PipelineNode
        label="Action"
        count={stageCounts.DECISION}
        active={stageCounts.DECISION > 0}
        color="amber"
      />
      <PipelineArrow active={stageCounts.RECOVERED > 0} />

      <PipelineNode
        label="Recovered"
        count={stageCounts.RECOVERED}
        active={stageCounts.RECOVERED > 0}
        color="green"
      />
    </div>
  );
}