"use client";

import { cn } from "@/lib/utils";
import { useRecoveryStore, MAX_WORKERS } from "@/lib/store";

export function WorkerPool() {
  const activeWorkers = useRecoveryStore((s) => s.activeWorkerCount());
  const slots = Array.from({ length: MAX_WORKERS }, (_, i) => i < activeWorkers);

  return (
    <div>
      <div className="grid grid-cols-5 gap-2">
        {slots.map((busy, i) => (
          <div
            key={i}
            className={cn(
              "rounded-md border px-2 py-3 text-center font-mono text-[11px]",
              busy
                ? "border-amber/40 bg-amber/10 text-amber"
                : "border-panel-border text-muted"
            )}
          >
            <div>W{String(i + 1).padStart(2, "0")}</div>
            <div className="mt-1 text-[10px]">{busy ? "BUSY" : "IDLE"}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 font-mono text-[11px] text-muted">
        {activeWorkers}/{MAX_WORKERS} active · {Math.round((activeWorkers / MAX_WORKERS) * 100)}% utilization
      </p>
      <p className="mt-1 font-mono text-[10px] text-muted/70">
        Slots reflect concurrent processing capacity, not specific worker identity — the backend doesn&apos;t report which of the 5 workers handled which transaction.
      </p>
    </div>
  );
}