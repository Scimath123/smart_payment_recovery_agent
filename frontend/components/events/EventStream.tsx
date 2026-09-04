"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRecoveryStore } from "@/lib/store";

const MAX_VISIBLE = 40;

export function EventStream() {
  const events = useRecoveryStore((s) => s.events).slice(0, MAX_VISIBLE);

  if (events.length === 0) {
    return <p className="font-mono text-xs text-muted">No events yet.</p>;
  }

  return (
    <div className="max-h-80 space-y-1 overflow-y-auto font-mono text-xs">
      <AnimatePresence initial={false}>
        {events.map((e, i) => (
          <motion.div
            key={`${e.transaction_id}-${e.event}-${i}`}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            className="flex gap-3 text-muted"
          >
            <span className="text-foreground/60">{new Date().toLocaleTimeString()}</span>
            <span className="text-teal">{e.transaction_id}</span>
            <span>{e.event}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}