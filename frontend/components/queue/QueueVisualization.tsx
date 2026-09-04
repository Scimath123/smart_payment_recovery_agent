"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRecoveryStore } from "@/lib/store";

const MAX_DOTS = 60; // caps DOM nodes during a burst (Section 38)

export function QueueVisualization() {
  const transactions = useRecoveryStore((s) => s.transactions);
  const queued = Object.values(transactions).filter((t) => t.stage === "QUEUED");

  return (
    <div>
      <p className="font-mono text-xs text-muted">
        Depth <span className="text-foreground">{queued.length}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <AnimatePresence>
          {queued.slice(0, MAX_DOTS).map((t) => (
            <motion.span
              key={t.transaction_id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="h-3 w-3 rounded-full bg-teal/70"
              title={t.transaction_id}
            />
          ))}
        </AnimatePresence>
        {queued.length === 0 && (
          <p className="font-mono text-xs text-muted">Queue empty</p>
        )}
      </div>
    </div>
  );
}