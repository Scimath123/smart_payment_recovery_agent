"""
generate_failure_corpus.py
Builds data/failure_corpus.csv for the RAG pipeline, using the real
credit_card_fraud_2026.csv as the base transaction source.

Run: python generate_failure_corpus.py
"""

import pandas as pd
import numpy as np
import random
import os

random.seed(42)
np.random.seed(42)


base = pd.read_csv("credit_card_fraud_2026.csv")


base = base.sample(n=min(2000, len(base)), random_state=42).reset_index(drop=True)


failure_templates = {
    "insufficient_funds": [
        "TXN_FAILED: Insufficient balance in account",
        "Do Not Honour - Insufficient funds",
        "Decline code 51: Not enough balance",
        "Available balance too low for this transaction",
    ],
    "bank_timeout": [
        "Bank server did not respond in time",
        "Gateway timeout - issuing bank unreachable",
        "Connection timeout during authorization",
        "Issuer server not responding, request expired",
    ],
    "otp_fail": [
        "NPCI: UPI PIN retries exceeded",
        "3DS authentication timeout after 30s",
        "OTP verification failed - incorrect code entered",
        "Customer authentication failed - OTP mismatch",
    ],
    "card_expired": [
        "Card expired - decline code 54",
        "Expiry date validation failed",
        "Card no longer valid, expiry passed",
    ],
    "network_error": [
        "Network error - request could not be completed",
        "ISO8583 message parsing error",
        "Connection reset before response received",
        "Gateway unreachable - network failure",
    ],
    "risk_block": [
        "Transaction blocked - suspicious activity detected",
        "Do Not Honour - Bank declined due to risk parameters",
        "Card flagged for review - high risk score",
    ],
}

base_success_rate = {
    "insufficient_funds": 0.55,
    "bank_timeout": 0.65,
    "otp_fail": 0.40,
    "card_expired": 0.05,
    "network_error": 0.60,
    "risk_block": 0.20,
}

retry_actions = ["retry_same_card", "retry_upi", "retry_wallet", "delay_2hr_retry", "no_retry"]
delays = [0, 30, 120, 360]


def assign_category(row):
   

    # Low balance relative to transaction amount -> insufficient funds
    if row["account_balance_usd"] < row["amount_usd"] * 1.1:
        return "insufficient_funds"

    # High CVV retry count -> OTP / auth failure
    if row["cvv_retry_count"] >= 2:
        return "otp_fail"

    # High velocity score or VPN/IP mismatch or scam flag -> risk block
    if (
        row["velocity_score"] > 60
        or row["used_vpn"]
        or row["ip_country_mismatch"]
        or row["is_ai_generated_scam_attempt"]
    ):
        return "risk_block"

    # Very old card -> more likely expired
    if row["card_age_months"] > 55 and np.random.rand() < 0.3:
        return "card_expired"

    # Otherwise split across remaining categories (weighted so the corpus
    # doesn't get dominated by timeout/network only — keeps RAG retrieval
    # demo-able across all categories, not just the two common ones)
    return random.choices(
        ["bank_timeout", "network_error", "insufficient_funds", "otp_fail", "card_expired"],
        weights=[0.35, 0.30, 0.15, 0.12, 0.08],
        k=1,
    )[0]


rows = []
for i, txn in base.iterrows():
    category = assign_category(txn)
    error_text = random.choice(failure_templates[category])
    action = random.choice(retry_actions)
    delay = random.choice(delays)

    success_prob = base_success_rate[category]
    if action == "no_retry":
        success_prob = 0.0
    elif action == "delay_2hr_retry" and category == "insufficient_funds":
        success_prob += 0.15  # payday effect
    success_prob = min(max(success_prob, 0.0), 0.95)

    outcome = "recovered" if np.random.rand() < success_prob else "failed_again"

    rows.append({
        "transaction_id": f"txn_{int(txn['transaction_id']):05d}",
        "amount_usd": float(txn["amount_usd"]),
        "merchant_category": txn["merchant_category"],
        "card_type": txn["card_type"],
        "auth_method": txn["auth_method"],
        "channel": txn["channel"],
        "device_type": txn["device_type"],
        "account_balance_usd": float(txn["account_balance_usd"]),
        "cvv_retry_count": int(txn["cvv_retry_count"]),
        "velocity_score": float(txn["velocity_score"]),
        "merchant_risk_score": float(txn["merchant_risk_score"]),
        "time_of_day_hour": int(txn["time_of_day_hour"]),
        "day_of_week": int(txn["day_of_week"]),
        "error_text": error_text,
        "category": category,
        "retry_action_taken": action,
        "delay_before_retry_min": delay,
        "outcome": outcome,
    })

failure_corpus = pd.DataFrame(rows)

os.makedirs("data", exist_ok=True)
failure_corpus.to_csv("data/failure_corpus.csv", index=False)

print("Shape:", failure_corpus.shape)
print("\nCategory distribution:")
print(failure_corpus["category"].value_counts())
print("\nOutcome distribution:")
print(failure_corpus["outcome"].value_counts())
print("\nRecovery rate by category:")
print(failure_corpus.groupby("category")["outcome"].apply(lambda s: (s == "recovered").mean()).round(2))
print("\nSample rows:")
print(failure_corpus[["transaction_id", "error_text", "category", "retry_action_taken", "outcome"]].head(8))