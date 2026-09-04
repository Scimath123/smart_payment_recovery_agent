"use client";

import { AnimatePresence } from "framer-motion";
import { useRecoveryStore } from "@/lib/store";
import { TransactionCard } from "./TransactionCard";

const MAX_CARDS = 24; // caps DOM nodes during a burst — Section 38 perf rule

export function LivePaymentActivity() {
  const transactions = useRecoveryStore((s) => s.transactions);

  const sorted = Object.values(transactions)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, MAX_CARDS);

  if (sorted.length === 0) {
    return <p className="font-mono text-xs text-muted">No transactions yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
      <AnimatePresence mode="popLayout">
        {sorted.map((txn) => (
          <TransactionCard key={txn.transaction_id} txn={txn} />
        ))}
      </AnimatePresence>
    </div>
  );
}