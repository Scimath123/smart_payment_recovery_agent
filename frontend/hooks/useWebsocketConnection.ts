import { useEffect } from "react";
import { recoveryWebSocket } from "@/lib/websocket";

export function useWebSocketConnection() {
  useEffect(() => {
    recoveryWebSocket.connect();
    return () => recoveryWebSocket.disconnect();
  }, []);
}