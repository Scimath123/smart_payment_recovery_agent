"use client";

import { useMemo, useState } from "react";
import { useRecoveryStore } from "@/lib/store";
import { STAGE_LABEL, STAGE_COLOR } from "./stageMeta";
import { TransactionDetailDrawer } from "./TransactionDetailDrawer";

const STATUS_OPTIONS = ["ALL", "FAILED", "AGENT_EVALUATING", "RETRY_SCHEDULED", "RECOVERED", "FAILED_AGAIN", "ESCALATED"];

export function TransactionsExplorer() {
  const transactions = useRecoveryStore((s) => s.transactions);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const all = Object.values(transactions);
  const categories = useMemo(
    () => Array.from(new Set(all.map((t) => t.category).filter(Boolean))) as string[],
    [all]
  );

  const filtered = all
    .filter((t) => statusFilter === "ALL" || t.status === statusFilter)
    .filter((t) => categoryFilter === "ALL" || t.category === categoryFilter)
    .filter((t) => !search || t.transaction_id.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transaction ID..."
          className="rounded-md border border-panel-border bg-background px-3 py-1.5 font-mono text-xs text-foreground placeholder:text-muted focus:border-teal/40 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-panel-border bg-background px-3 py-1.5 font-mono text-xs text-foreground focus:border-teal/40 focus:outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-panel-border bg-background px-3 py-1.5 font-mono text-xs text-foreground focus:border-teal/40 focus:outline-none"
        >
          <option value="ALL">ALL CATEGORIES</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="self-center font-mono text-[11px] text-muted">
          {filtered.length} of {all.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="font-mono text-xs text-muted">No transactions match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-panel-border text-left text-muted">
                <th className="py-2 pr-4">Transaction</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Retries</th>
                <th className="py-2 pr-4">Agent Decision</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.transaction_id}
                  onClick={() => setSelected(t.transaction_id)}
                  className="cursor-pointer border-b border-panel-border/50 hover:bg-panel-border/20"
                >
                  <td className="py-2 pr-4 text-foreground">{t.transaction_id}</td>
                  <td className="py-2 pr-4 text-foreground">
                    {t.amount_usd !== null ? `$${t.amount_usd.toLocaleString()}` : "—"}
                  </td>
                  <td className="py-2 pr-4 text-muted">{t.category ?? "—"}</td>
                  <td className="py-2 pr-4 text-muted">{t.retry_count}</td>
                  <td className="py-2 pr-4 text-muted">
                    {t.agent_decision ? t.agent_decision.action : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={t.stage ? STAGE_COLOR[t.stage] : "text-muted"}>
                      {t.stage ? STAGE_LABEL[t.stage] : t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TransactionDetailDrawer transactionId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}