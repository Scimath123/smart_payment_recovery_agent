"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function PipelineNode({
  label,
  count,
  active,
  color = "teal",
}: {
  label: string;
  count: number;
  active: boolean;
  color?: "teal" | "amber" | "violet" | "green" | "red";
}) {
  const colorClass = {
    teal: "border-teal/40 text-teal",
    amber: "border-amber/40 text-amber",
    violet: "border-violet/40 text-violet",
    green: "border-green/40 text-green",
    red: "border-red/40 text-red",
  }[color];

  return (
    <motion.div
      animate={active ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={{ duration: 0.6, repeat: active ? Infinity : 0, repeatDelay: 1.2 }}
      className={cn(
        "flex min-w-[110px] flex-col items-center gap-1 rounded-lg border bg-panel/80 px-4 py-3",
        active ? colorClass : "border-panel-border text-muted"
      )}
    >
      <span className="font-mono text-[10px] uppercase tracking-wide">{label}</span>
      <span className="font-mono text-xl font-semibold">{count}</span>
      {active && <span className={cn("h-1.5 w-1.5 rounded-full", `bg-${color}`)} />}
    </motion.div>
  );
}