"use client";

import { DashboardShell } from "@/components/layout/Dashboardshell";
import { Panel } from "@/components/layout/Panel";
import { TransactionsExplorer } from "@/components/transactions/TransactionsExplorer";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function TransactionsPage() {
  useDashboardData();

  return (
    <DashboardShell>
      <Panel title="Transaction Explorer">
        <TransactionsExplorer />
      </Panel>
    </DashboardShell>
  );
}