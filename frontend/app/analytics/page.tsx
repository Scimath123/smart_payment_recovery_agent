"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { DashboardShell } from "@/components/layout/Dashboardshell";
import { Panel } from "@/components/layout/Panel";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useRecoveryStore } from "@/lib/store";

const OUTCOME_COLORS = ["#4ade80", "#f87171", "#a1a1aa"]; // recovered, escalated, pending
const PATH_COLORS = ["#2dd4bf", "#a78bfa"]; // fast path, agent path

export default function AnalyticsPage() {
  useDashboardData();

  const metrics = useRecoveryStore((s) => s.metrics);
  const fastPathCount = useRecoveryStore((s) => s.fastPathCount);
  const agentPathCount = useRecoveryStore((s) => s.agentPathCount);

  const outcomeData = metrics
    ? [
        { name: "Recovered", value: metrics.recovered },
        { name: "Escalated", value: metrics.escalated },
        { name: "Pending", value: metrics.pending },
      ]
    : [];

  const pathData = [
    { name: "Fast Path", value: fastPathCount },
    { name: "Agent Path", value: agentPathCount },
  ];

  return (
    <DashboardShell>
      <div className="grid grid-cols-2 gap-4">
        <Panel title="Transaction Outcomes (all-time)">
          {outcomeData.length === 0 || outcomeData.every((d) => d.value === 0) ? (
            <p className="font-mono text-xs text-muted">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={outcomeData} dataKey="value" nameKey="name" outerRadius={80}>
                  {outcomeData.map((_, i) => (
                    <Cell key={i} fill={OUTCOME_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Fast Path vs Agent Path (this session)">
          {fastPathCount + agentPathCount === 0 ? (
            <p className="font-mono text-xs text-muted">No decisions made yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pathData} dataKey="value" nameKey="name" outerRadius={80}>
                  {pathData.map((_, i) => (
                    <Cell key={i} fill={PATH_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Recovery Rate by Failure Type / Revenue Over Time">
          <p className="font-mono text-xs text-muted">
            Not shown: the backend has no per-category recovery-rate endpoint and
            no time-series revenue endpoint, so these charts would need to be
            built from data this client happens to have observed live — not a
            reliable historical picture. Add a backend endpoint for either before
            building these for real.
          </p>
        </Panel>
      </div>
    </DashboardShell>
  );
}