"use client";

import { motion } from "framer-motion";

export function PipelineArrow({ active }: { active: boolean }) {
  return (
    <div className="relative flex h-px w-8 items-center bg-panel-border">
      {active && (
        <motion.div
          className="absolute h-1.5 w-1.5 rounded-full bg-teal"
          animate={{ left: ["0%", "90%"] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  );
}