import type { WsEvent } from "@/types";
import { useRecoveryStore } from "./store";

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE ?? "ws://localhost:8000";
const MAX_BACKOFF_MS = 30_000;
const HEARTBEAT_MS = 25_000; // keeps the connection lively; backend's
// /ws/feed loop just blocks on receive_text(), it doesn't require this,
// but sending something periodically surfaces dead connections faster.

class RecoveryWebSocket {
  private ws: WebSocket | null = null;
  private attempt = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private manuallyClosed = false;

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.manuallyClosed = false;
    useRecoveryStore.getState().setConnectionStatus(this.attempt === 0 ? "connecting" : "reconnecting");

    const socket = new WebSocket(`${WS_BASE}/ws/feed`);
    this.ws = socket;

    socket.onopen = () => {
      this.attempt = 0;
      useRecoveryStore.getState().setConnectionStatus("connected");
      // A real backend connection just succeeded — Demo Mode (if active)
      // must yield immediately, per Section 32: live always takes priority.
      useRecoveryStore.getState().forceLiveMode();
      this.heartbeatTimer = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send("ping");
      }, HEARTBEAT_MS);
    };

    socket.onmessage = (msg) => {
      let event: WsEvent;
      try {
        event = JSON.parse(msg.data);
      } catch {
        return; // malformed event, drop it silently
      }
      if (!event.event || !event.transaction_id) return; // guard unknown shapes
      useRecoveryStore.getState().ingestEvent(event);
    };

    socket.onclose = () => {
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      if (this.manuallyClosed) {
        useRecoveryStore.getState().setConnectionStatus("offline");
        return;
      }
      useRecoveryStore.getState().setConnectionStatus("reconnecting");
      this.scheduleReconnect();
    };

    socket.onerror = () => {
      socket.close();
    };
  }

  private scheduleReconnect() {
    this.attempt += 1;
    const delay = Math.min(1000 * 2 ** this.attempt, MAX_BACKOFF_MS);
    setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    this.manuallyClosed = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.ws?.close();
    this.ws = null;
  }
}

export const recoveryWebSocket = new RecoveryWebSocket();