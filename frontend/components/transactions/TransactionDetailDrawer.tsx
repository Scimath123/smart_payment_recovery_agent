"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRecoveryStore } from "@/lib/store";
import { timelineFor } from "@/lib/eventHistory";
import { STAGE_LABEL, STAGE_COLOR } from "./stageMeta";
import { ProbabilityBar } from "@/components/agent/ProbabilityBar";

export function TransactionDetailDrawer({
  transactionId,
  onClose,
}: {
  transactionId: string | null;
  onClose: () => void;
}) {
  const txn = useRecoveryStore((s) => (transactionId ? s.transactions[transactionId] : null));
  const events = useRecoveryStore((s) => s.events);

  if (!transactionId || !txn) return null;
  const timeline = timelineFor(events, transactionId);

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-40 bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        key="drawer"
        className="card-float fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-panel-border bg-panel p-6"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <button
          onClick={onClose}
          className="mb-5 font-mono text-xs text-muted transition-colors hover:text-foreground"
        >
          ✕ Close
        </button>

        <p className="font-mono text-[13px] text-muted">{txn.transaction_id}</p>
        <p className="mt-1.5 font-mono text-3xl font-semibold leading-none text-foreground">
          {txn.amount_usd !== null ? `$${txn.amount_usd.toLocaleString()}` : "—"}
        </p>
        {txn.category && (
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-muted">
            {txn.category}
          </p>
        )}

        {txn.error_text && (
          <div className="mt-4 rounded-lg border border-red/30 bg-red/5 p-3.5">
            <p className="font-mono text-[12px] leading-relaxed text-red">
              &ldquo;{txn.error_text}&rdquo;
            </p>
          </div>
        )}

        <div className="section-block">
          <p className="mb-2.5 font-mono text-[10px] font-medium uppercase tracking-wide text-muted">
            Timeline
          </p>
          {timeline.length === 0 ? (
            <p className="font-mono text-xs text-muted">
              No live events recorded for this transaction in this session.
            </p>
          ) : (
            <div className="space-y-2">
              {timeline.map((e, i) => (
                <div key={i} className="flex gap-2 font-mono text-[12px] text-muted">
                  <span className="text-teal">→</span>
                  <span>{e.event}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {txn.ragTopSimilarity !== undefined && (
          <div className="section-block">
            <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-wide text-violet">
              RAG Retrieval
            </p>
            <p className="font-mono text-[12px] leading-relaxed text-muted">
              {txn.ragCasesFound ?? "—"} similar cases · top match{" "}
              <span className="font-medium text-foreground">
                {Math.round(txn.ragTopSimilarity * 100)}%
              </span>
            </p>
          </div>
        )}

        {txn.mlTopStrategy && (
          <div className="section-block">
            <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-wide text-violet">
              ML Recovery Model
            </p>
            <ProbabilityBar
              label={txn.mlTopStrategy.retry_action}
              value={txn.mlTopStrategy.predicted_success_prob}
            />
          </div>
        )}

        {txn.agent_decision && (
          <div className="section-block">
            <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-wide text-amber">
              Agent Decision
            </p>
            <p className="font-mono text-sm font-medium text-foreground">
              {txn.agent_decision.action}
              {txn.agent_decision.delay_before_retry_min > 0 &&
                ` after ${txn.agent_decision.delay_before_retry_min} min`}
            </p>
            <p className="mt-1.5 font-mono text-[11px] text-muted">
              {Math.round(txn.agent_decision.confidence * 100)}% confidence ·{" "}
              {txn.agent_decision.tier_used === "fast_path" ? "fast path" : "agent path"}
            </p>
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted">
              {txn.agent_decision.reasoning}
            </p>
          </div>
        )}

        {txn.stage && (
          <div className="section-block">
            <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-wide text-muted">
              Current Stage
            </p>
            <span
              className={`inline-block rounded-full border border-current/20 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide ${STAGE_COLOR[txn.stage]}`}
            >
              {STAGE_LABEL[txn.stage]}
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}