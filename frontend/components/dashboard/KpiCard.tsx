"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTilt } from "@/hooks/useTilt";

export function KpiCard({
  label,
  value,
  accent,
  note,
  icon: Icon,
  featured = false,
  index = 0,
}: {
  label: string;
  value: string;
  accent?: "teal" | "green" | "red" | "amber";
  note?: string;
  icon?: LucideIcon;
  featured?: boolean;
  index?: number;
}) {
  const { rotateX, rotateY, onMouseMove, onMouseLeave } = useTilt();

  const accentBar =
    accent === "teal" ? "bg-teal" :
    accent === "green" ? "bg-green" :
    accent === "red" ? "bg-red" :
    accent === "amber" ? "bg-amber" :
    "bg-panel-border";

  const accentText =
    accent === "teal" ? "text-teal" :
    accent === "green" ? "text-green" :
    accent === "red" ? "text-red" :
    accent === "amber" ? "text-amber" :
    "text-muted";

  return (
    <motion.div
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.4 }}
      title={note}
      className={cn(
        "card-float relative overflow-hidden rounded-2xl border border-panel-border bg-panel p-5 will-change-transform",
        featured && "border-green/30 bg-gradient-to-br from-green/[0.06] to-transparent"
      )}
    >
      <span className={cn("absolute left-0 top-0 h-full w-0.5", accentBar)} />

      <div className="flex items-center justify-between">
        <p className="font-sans text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        {Icon && (
          <Icon className={cn("h-4 w-4", accentText)} strokeWidth={2} />
        )}
      </div>

      <p
        className={cn(
          "mt-2 font-mono font-semibold text-foreground",
          featured ? "text-3xl" : "text-2xl",
          accentText
        )}
      >
        {value}
      </p>
    </motion.div>
  );
}