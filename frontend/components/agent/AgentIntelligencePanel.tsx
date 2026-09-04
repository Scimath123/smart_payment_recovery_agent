"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRecoveryStore } from "@/lib/store";
import { selectFocusTransaction } from "@/lib/pipelineStats";
import { ProbabilityBar } from "./ProbabilityBar";

export function AgentIntelligencePanel() {
  const transactions = useRecoveryStore((s) => s.transactions);
  const fastPathCount = useRecoveryStore((s) => s.fastPathCount);
  const agentPathCount = useRecoveryStore((s) => s.agentPathCount);
  const focus = selectFocusTransaction(transactions);

  return (
    <div>
      <div className="flex gap-5 font-mono text-[11px] text-muted">
        <span>
          Fast path <span className="font-semibold text-teal">{fastPathCount}</span>
        </span>
        <span>
          Agent path <span className="font-semibold text-violet">{agentPathCount}</span>
        </span>
      </div>

      <AnimatePresence mode="wait">
        {!focus ? (
          <motion.p
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="section-block font-mono text-xs text-muted"
          >
            No transaction currently being analyzed.
          </motion.p>
        ) : (
          <motion.div
            key={focus.transaction_id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="section-block font-mono text-[12px] text-muted">
              Analyzing <span className="font-medium text-foreground">{focus.transaction_id}</span>
            </p>

            {focus.ragTopSimilarity !== undefined && (
              <div className="section-block">
                <p className="font-mono text-[10px] font-medium uppercase tracking-wide text-violet">
                  RAG Retrieval
                </p>
                <p className="mt-1.5 font-mono text-[12px] leading-relaxed text-muted">
                  {focus.ragCasesFound ?? "—"} similar cases found · top match{" "}
                  <span className="font-medium text-foreground">
                    {Math.round(focus.ragTopSimilarity * 100)}%
                  </span>
                </p>
              </div>
            )}

            {focus.mlTopStrategy && (
              <div className="section-block">
                <p className="font-mono text-[10px] font-medium uppercase tracking-wide text-violet">
                  ML Recovery Model
                </p>
                <div className="mt-2">
                  <ProbabilityBar
                    label={focus.mlTopStrategy.retry_action}
                    value={focus.mlTopStrategy.predicted_success_prob}
                  />
                </div>
                <p className="mt-1.5 font-mono text-[10px] text-muted">
                  top-ranked strategy · {focus.mlTopStrategy.delay_before_retry_min} min delay
                </p>
              </div>
            )}

            {focus.agent_decision && (
              <div className="section-block">
                <p className="font-mono text-[10px] font-medium uppercase tracking-wide text-amber">
                  Decision
                </p>
                <p className="mt-1.5 font-mono text-sm font-medium text-foreground">
                  {focus.agent_decision.action}
                  {focus.agent_decision.delay_before_retry_min > 0 &&
                    ` after ${focus.agent_decision.delay_before_retry_min} min`}
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted">
                  {Math.round(focus.agent_decision.confidence * 100)}% confidence ·{" "}
                  <span className="text-violet">
                    {focus.agent_decision.tier_used === "fast_path" ? "fast path" : "agent path"}
                  </span>
                </p>
                <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted">
                  {focus.agent_decision.reasoning}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}