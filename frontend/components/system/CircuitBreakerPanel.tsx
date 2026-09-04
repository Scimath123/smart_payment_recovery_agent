"use client";

import { cn } from "@/lib/utils";
import { useRecoveryStore } from "@/lib/store";

export function CircuitBreakerPanel() {
  const breakers = useRecoveryStore((s) => s.circuitBreaker);

  if (breakers.length === 0) {
    return <p className="font-mono text-xs text-muted">No category data yet.</p>;
  }

  return (
    <div className="space-y-2">
      {breakers.map((b) => (
        <div
          key={b.category}
          className={cn(
            "flex items-center justify-between rounded-md border px-3 py-2",
            b.circuit_open ? "border-red/40 bg-red/5" : "border-panel-border"
          )}
        >
          <div>
            <p className="font-mono text-xs text-foreground">{b.category}</p>
            <p className="font-mono text-[10px] text-muted">
              {b.recoveries_last_hour}/{b.attempts_last_hour} recovered
              {b.success_rate !== null && ` · ${Math.round(b.success_rate * 100)}%`}
            </p>
          </div>
          <span
            className={cn(
              "font-mono text-[10px] uppercase",
              b.circuit_open ? "text-red" : "text-green"
            )}
          >
            {b.circuit_open ? "● OPEN" : "● CLOSED"}
          </span>
        </div>
      ))}
    </div>
  );
}