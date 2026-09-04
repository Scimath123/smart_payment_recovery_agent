"use client";

import { motion } from "framer-motion";
import { STAGE_ORDER } from "./stageMeta";
import type { PipelineStage } from "@/types";

export function StageTrack3D({ stage }: { stage: PipelineStage | null }) {
  const steps = STAGE_ORDER.slice(0, -1); // exclude terminal RECOVERED node
  const activeIndex = stage ? steps.indexOf(stage as (typeof steps)[number]) : -1;

  return (
    <div
      className="flex items-end gap-1.5 py-1"
      style={{ perspective: 400 }}
    >
      {steps.map((s, i) => {
        const done = activeIndex >= 0 && i < activeIndex;
        const current = i === activeIndex;
        return (
          <motion.div
            key={s}
            initial={false}
            animate={{
              rotateX: current ? -22 : 0,
              translateZ: current ? 10 : 0,
              scaleY: done ? 1 : current ? 1.15 : 0.6,
              opacity: done || current ? 1 : 0.35,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`h-3 flex-1 rounded-sm will-change-transform ${
              done || current ? "bg-teal" : "bg-panel-border"
            }`}
            style={{ transformOrigin: "bottom" }}
          />
        );
      })}
    </div>
  );
}