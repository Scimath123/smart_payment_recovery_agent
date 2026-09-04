"use client";

import { useRecoveryStore } from "@/lib/store";

const STATUS_MAP = {
  connecting: { label: "CONNECTING", dot: "●", color: "text-amber animate-pulse" },
  connected: { label: "LIVE", dot: "●", color: "text-teal" },
  reconnecting: { label: "RECONNECTING", dot: "◌", color: "text-amber animate-pulse" },
  offline: { label: "OFFLINE", dot: "○", color: "text-red" },
} as const;

export function ConnectionBadge() {
  const status = useRecoveryStore((s) => s.connectionStatus);
  const { label, dot, color } = STATUS_MAP[status];

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs">
      <span className={color}>{dot}</span>
      <span className="text-muted">{label}</span>
    </div>
  );
}