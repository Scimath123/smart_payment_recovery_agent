"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRecoveryStore } from "@/lib/store";

export function LiveRecoveryTicker() {
  const recoveries = useRecoveryStore((s) => s.liveRecoveries).slice(0, 8);

  if (recoveries.length === 0) {
    return <p className="font-mono text-xs text-muted">No recoveries yet this session.</p>;
  }

  return (
    <div className="space-y-1">
      <AnimatePresence initial={false}>
        {recoveries.map((r) => (
          <motion.div
            key={`${r.transaction_id}-${r.at}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex justify-between font-mono text-xs"
          >
            <span className="text-muted">{r.transaction_id}</span>
            <span className="text-green">+${r.amount_usd.toLocaleString()}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}