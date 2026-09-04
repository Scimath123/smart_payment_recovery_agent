"use client";

import { DashboardShell } from "@/components/layout/Dashboardshell";
import { Panel } from "@/components/layout/Panel";
import { ConnectionBadge } from "@/components/layout/ConnectionBadge";
import { CircuitBreakerPanel } from "@/components/system/CircuitBreakerPanel";
import { QueueVisualization } from "@/components/queue/QueueVisualization";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function HealthPage() {
  useDashboardData();

  return (
    <DashboardShell>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Queue">
          <QueueVisualization />
        </Panel>
        <Panel title="WebSocket">
          <ConnectionBadge />
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Circuit Breaker">
          <CircuitBreakerPanel />
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Agent / Database Metrics">
          <p className="font-mono text-xs text-muted">
            LLM calls/min, cache hit rate, average processing time, and database
            health are not currently exposed by any backend endpoint — showing
            fabricated numbers here would misrepresent the system, so this
            section is intentionally empty until the backend adds them.
          </p>
        </Panel>
      </div>
    </DashboardShell>
  );
}