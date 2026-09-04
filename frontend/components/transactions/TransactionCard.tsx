"use client";
import { StageTrack3D } from "./StageTrack3D";
import { motion } from "framer-motion";
import type { TrackedTransaction } from "@/lib/store";
import { STAGE_ORDER, STAGE_LABEL, STAGE_COLOR } from "./stageMeta";
import { useTilt } from "@/hooks/useTilt";

function formatAmount(amount: number | null) {
  if (amount === null) return "—";
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function TransactionCard({ txn }: { txn: TrackedTransaction }) {
  const stageIndex = txn.stage ? STAGE_ORDER.indexOf(txn.stage) : -1;
  const isTerminal = ["RECOVERED", "FAILED_AGAIN", "ESCALATED", "CIRCUIT_OPEN"].includes(
    txn.stage ?? ""
  );
  const { rotateX, rotateY, onMouseMove, onMouseLeave } = useTilt();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{ rotateX, rotateY, transformPerspective: 800 }}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="card-float rounded-xl border border-panel-border bg-panel/70 p-5 will-change-transform"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-mono text-[13px] leading-none text-muted">
              {txn.transaction_id}
            </p>
            <p className="mt-1.5 font-mono text-xl font-semibold leading-none text-foreground">
              {formatAmount(txn.amount_usd)}
            </p>
          </div>
          {txn.stage && (
            <span
              className={`shrink-0 rounded-full border border-current/20 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${STAGE_COLOR[txn.stage]}`}
            >
              {STAGE_LABEL[txn.stage]}
            </span>
          )}
        </div>

        {txn.error_text && (
          <p className="section-block line-clamp-2 font-mono text-[11px] leading-relaxed text-muted/90">
            &ldquo;{txn.error_text}&rdquo;
          </p>
        )}

              {!isTerminal && stageIndex >= 0 && (
          <div className="mt-3">
            <StageTrack3D stage={txn.stage} />
          </div>
        )}

        {txn.agent_decision && (
          <div className="section-block">
            <p className="font-mono text-[12px] leading-snug text-foreground">
              {txn.agent_decision.action}
              <span className="text-muted"> · {Math.round(txn.agent_decision.confidence * 100)}% confidence</span>
            </p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-violet">
              {txn.agent_decision.tier_used === "fast_path" ? "fast path" : "agent path"}
            </p>
          </div>
        )}

        {txn.category && (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted/70">
            {txn.category}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}