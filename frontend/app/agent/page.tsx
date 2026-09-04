"use client";

import { DashboardShell } from "@/components/layout/Dashboardshell";
import { Panel } from "@/components/layout/Panel";
import { AgentIntelligencePanel } from "@/components/agent/AgentIntelligencePanel";
import { DecisionLog } from "@/components/agent/DecisionLog";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function AgentActivityPage() {
  useDashboardData();

  return (
    <DashboardShell>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Currently Analyzing">
          <AgentIntelligencePanel />
        </Panel>
        <Panel title="Recent Decisions (this session)">
          <DecisionLog />
        </Panel>
      </div>
    </DashboardShell>
  );
}