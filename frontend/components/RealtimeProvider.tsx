"use client";

import { useWebSocketConnection } from "@/hooks/useWebsocketConnection";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useWebSocketConnection();
  return <>{children}</>;
}