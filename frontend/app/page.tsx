"use client";

import {
  AlertTriangle,
  ShieldAlert,
  Wallet,
  TrendingUp,
  Activity,
  Bot,
  Workflow,
  ListTree,
  Terminal,
  DollarSign,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/Dashboardshell";
import { Panel } from "@/components/layout/Panel";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { LivePaymentActivity } from "@/components/transactions/LivePaymentActivity";
import { EventStream } from "@/components/events/EventStream";
import { LivePipeline } from "@/components/pipeline/LivePipeline";
import { QueueVisualization } from "@/components/queue/QueueVisualization";
import { WorkerPool } from "@/components/workers/WorkerPool";
import { AgentIntelligencePanel } from "@/components/agent/AgentIntelligencePanel";
import { MoneyFlow } from "@/components/dashboard/MoneyFlow";
import { LiveRecoveryTicker } from "@/components/dashboard/LiveRecoveryTicker";
import { CircuitBreakerPanel } from "@/components/system/CircuitBreakerPanel";
import { BurstControl } from "@/components/dashboard/BurstControl";
import { DemoModeToggle } from "@/components/dashboard/DemoModeToggle";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useRecoveryStore } from "@/lib/store";

export default function OverviewPage() {
  useDashboardData();

  const metrics = useRecoveryStore((s) => s.metrics);
  const atRiskEstimate = useRecoveryStore((s) => s.revenueAtRiskEstimate());

  return (
    <DashboardShell>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <BurstControl />
        <DemoModeToggle />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          index={0}
          icon={AlertTriangle}
          label="Failed Transactions"
          value={metrics ? String(metrics.total_failed) : "—"}
        />
        <KpiCard
          index={1}
          icon={ShieldAlert}
          label="Revenue at Risk (tracked)"
          value={`$${atRiskEstimate.toLocaleString()}`}
          accent="amber"
          note="Client-side estimate — see notes"
        />
        <KpiCard
          index={2}
          icon={Wallet}
          label="Revenue Recovered"
          value={metrics ? `$${metrics.revenue_recovered_usd.toLocaleString()}` : "—"}
          accent="green"
          featured
        />
        <KpiCard
          index={3}
          icon={TrendingUp}
          label="Recovery Rate"
          value={metrics ? `${(metrics.recovery_rate * 100).toFixed(1)}%` : "—"}
          accent="teal"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Live Payment Activity" icon={Activity} className="lg:col-span-2">
          <LivePaymentActivity />
        </Panel>
        <Panel title="AI Agent Intelligence" icon={Bot}>
          <AgentIntelligencePanel />
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Live Agent Pipeline (this session)" icon={Workflow}>
          <LivePipeline />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Queue / Worker Pool" icon={ListTree}>
          <div className="space-y-4">
            <QueueVisualization />
            <div className="border-t border-panel-border pt-4">
              <WorkerPool />
            </div>
          </div>
        </Panel>
        <Panel title="Live System Events" icon={Terminal}>
          <EventStream />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Money Flow" icon={DollarSign}>
          <MoneyFlow />
        </Panel>
        <Panel title="Live Recovery Ticker" icon={Zap}>
          <LiveRecoveryTicker />
        </Panel>
        <Panel title="Circuit Breaker" icon={ShieldCheck}>
          <CircuitBreakerPanel />
        </Panel>
      </div>
    </DashboardShell>
  );
}