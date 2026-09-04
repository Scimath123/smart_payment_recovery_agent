"use client";

import { useRecoveryStore, MAX_WORKERS } from "@/lib/store";
import { ConnectionBadge } from "./ConnectionBadge";

export function Header() {
  const activeWorkers = useRecoveryStore((s) => s.activeWorkerCount());
  const queueDepth = useRecoveryStore((s) => s.queueDepthFromEvents());

  return (
    <header className="flex items-center justify-between border-b border-panel-border bg-panel px-6 py-4">
      <div>
        <h1 className="text-sm font-semibold tracking-wide text-foreground">
          SMART RETRY &amp; RECOVERY
        </h1>
        <p className="font-mono text-xs text-muted">AI Revenue Recovery Control Center</p>
      </div>

      <div className="flex items-center gap-6 font-mono text-xs text-muted">
        <ConnectionBadge />
        <span>
          Workers <span className="text-foreground">{activeWorkers}/{MAX_WORKERS}</span>
        </span>
        <span>
          Queue <span className="text-foreground">{queueDepth}</span>
        </span>
      </div>
    </header>
  );
}