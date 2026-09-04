"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  className?: string;
  children?: ReactNode;
}) {
  const [delay] = useState(() => Math.random() * 2);

  return (
    <motion.section
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay }}
      className={cn(
        "card-float rounded-xl border border-panel-border bg-panel p-4 will-change-transform",
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted" strokeWidth={2} />}
        <h2 className="font-sans text-xs font-semibold uppercase tracking-wide text-muted">
          {title}
        </h2>
      </div>
      {children ?? (
        <p className="font-mono text-xs text-muted">— not yet wired —</p>
      )}
    </motion.section>
  );
}