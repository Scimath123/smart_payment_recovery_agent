import type { WsEvent } from "@/types";

export function timelineFor(events: WsEvent[], transactionId: string): WsEvent[] {
  // events are stored newest-first; timeline reads oldest-first
  return events.filter((e) => e.transaction_id === transactionId).slice().reverse();
}