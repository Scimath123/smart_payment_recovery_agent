"use client";

import { useRecoveryStore } from "@/lib/store";

export function MoneyFlow() {
  const metrics = useRecoveryStore((s) => s.metrics);
  const atRisk = useRecoveryStore((s) => s.revenueAtRiskEstimate());

  const recovered = metrics?.revenue_recovered_usd ?? 0;
  const total = atRisk + recovered;
  const recoveredPct = total > 0 ? Math.round((recovered / total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex justify-between font-mono text-xs text-muted">
        <span>Tracked at risk</span>
        <span className="text-amber">${atRisk.toLocaleString()}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-panel-border">
        <div
          className="h-2 rounded-full bg-green transition-all duration-700"
          style={{ width: `${recoveredPct}%` }}
        />
      </div>
      <div className="flex justify-between font-mono text-xs text-muted">
        <span>Recovered</span>
        <span className="text-green">${recovered.toLocaleString()}</span>
      </div>
      <p className="font-mono text-[10px] text-muted/70">
        &quot;At risk&quot; reflects only transactions this session has observed, not a full
        database sum — the backend has no endpoint for total pending exposure.
      </p>
    </div>
  );
}