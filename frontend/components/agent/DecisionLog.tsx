"use client";

import { useRecoveryStore } from "@/lib/store";

export function DecisionLog() {
  const transactions = useRecoveryStore((s) => s.transactions);

  const decided = Object.values(transactions)
    .filter((t) => t.agent_decision)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 30);

  if (decided.length === 0) {
    return (
      <p className="font-mono text-xs text-muted">
        No agent decisions recorded yet this session.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {decided.map((t) => (
        <div
          key={t.transaction_id}
          className="card-float rounded-xl border border-panel-border bg-panel/60 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="truncate font-mono text-[12px] text-foreground">
              {t.transaction_id}
            </span>
            <span
              className={`shrink-0 rounded-full border border-current/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                t.agent_decision!.tier_used === "fast_path" ? "text-teal" : "text-violet"
              }`}
            >
              {t.agent_decision!.tier_used === "fast_path" ? "fast path" : "agent path"}
            </span>
          </div>

          <p className="mt-2 font-mono text-[12px] leading-snug text-foreground">
            {t.agent_decision!.action}
            <span className="text-muted">
              {" "}
              · {Math.round(t.agent_decision!.confidence * 100)}% confidence
            </span>
          </p>

          <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted">
            {t.agent_decision!.reasoning}
          </p>
        </div>
      ))}
    </div>
  );
}