"use client";

import { useRecoveryStore } from "@/lib/store";

export function ModeBanner() {
  const mode = useRecoveryStore((s) => s.mode);

  if (mode === "live") return null;

  return (
    <div className="border-b border-violet/30 bg-violet/10 px-6 py-1.5 text-center font-mono text-[11px] text-violet">
      ◐ DEMO MODE — simulated data, not connected to real backend
    </div>
  );
}