"use client";

import { useState } from "react";
import { reportFailedTransaction } from "@/lib/api";

const CATEGORIES = [
  { category: "insufficient_funds", error_text: "Do Not Honour - Insufficient funds" },
  { category: "bank_timeout", error_text: "Bank server did not respond in time" },
  { category: "otp_fail", error_text: "3DS authentication timeout after 30s" },
  { category: "risk_block", error_text: "Do Not Honour - Bank declined due to risk parameters" },
  { category: "network_error", error_text: "Network error - request could not be completed" },
];

function randomPayload(runId: number, i: number) {
  const pick = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const amount = Math.round((Math.random() * 9000 + 100) * 100) / 100;
  return {
    transaction_id: `burst_${runId}_${i}`,
    idempotency_key: `burst_idem_${runId}_${i}`,
    error_text: pick.error_text,
    transaction_data: {
      category: pick.category,
      amount_usd: amount,
      account_balance_usd: Math.round(Math.random() * 10000),
      auth_method: "3D Secure",
      channel: "Online",
      card_type: "Visa",
      merchant_category: "Retail",
      cvv_retry_count: Math.floor(Math.random() * 3),
      velocity_score: Math.round(Math.random() * 100),
      merchant_risk_score: Math.round(Math.random() * 100),
      time_of_day_hour: new Date().getHours(),
      day_of_week: new Date().getDay(),
    },
  };
}

const BURST_SIZE = 20;
const STAGGER_MS = 80; // spread real requests slightly so the backend's
// 5-worker pool visibly queues rather than everything landing in one tick

export function BurstControl() {
  const [firing, setFiring] = useState(false);
  const [sent, setSent] = useState(0);

  async function fireBurst() {
    setFiring(true);
    setSent(0);
    const runId = Date.now();

    for (let i = 0; i < BURST_SIZE; i++) {
      try {
        await reportFailedTransaction(randomPayload(runId, i));
        setSent((n) => n + 1);
      } catch {
        // one failed POST shouldn't abort the whole burst — continue
      }
      await new Promise((r) => setTimeout(r, STAGGER_MS));
    }
    setFiring(false);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={fireBurst}
        disabled={firing}
        className="rounded-md border border-amber/40 px-3 py-1.5 font-mono text-xs text-amber transition-colors hover:bg-amber/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {firing ? `⚡ Firing ${sent}/${BURST_SIZE}` : "⚡ Simulate Failure Burst"}
      </button>
      <span className="font-mono text-[10px] text-muted">
        real requests to /transaction/fail
      </span>
    </div>
  );
}