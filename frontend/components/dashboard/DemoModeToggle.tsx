"use client";

import { useState, useRef } from "react";
import { useRecoveryStore } from "@/lib/store";
import { runDemoBurst } from "@/lib/demoSimulator";
import { cn } from "@/lib/utils";

export function DemoModeToggle() {
  const connectionStatus = useRecoveryStore((s) => s.connectionStatus);
  const mode = useRecoveryStore((s) => s.mode);
  const enterDemoMode = useRecoveryStore((s) => s.enterDemoMode);
  const forceLiveMode = useRecoveryStore((s) => s.forceLiveMode);
  const [running, setRunning] = useState(false);
  const stopRef = useRef<() => void>(() => {});

  const disabled = connectionStatus === "connected";

  function start() {
    enterDemoMode();
    setRunning(true);
    stopRef.current = runDemoBurst(12);
  }

  function stop() {
    stopRef.current();
    setRunning(false);
    forceLiveMode();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={running ? stop : start}
        disabled={disabled}
        className={cn(
          "rounded-md border px-3 py-1.5 font-mono text-xs transition-colors",
          disabled
            ? "cursor-not-allowed border-panel-border text-muted/50"
            : running
              ? "border-red/40 text-red hover:bg-red/10"
              : "border-violet/40 text-violet hover:bg-violet/10"
        )}
        title={disabled ? "Backend is live — Demo Mode unavailable while connected" : undefined}
      >
        {running ? "■ Stop Demo" : mode === "demo" ? "▶ Restart Demo" : "▶ Demo Mode"}
      </button>
      {disabled && (
        <span className="font-mono text-[10px] text-muted">live backend connected</span>
      )}
    </div>
  );
}