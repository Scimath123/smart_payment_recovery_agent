
import os
import joblib
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "retry_recovery_lgbm.pkl")
ENCODERS_PATH = os.path.join(BASE_DIR, "models", "label_encoders.pkl")
FEATURE_COLUMNS_PATH = os.path.join(BASE_DIR, "models", "feature_columns.pkl")

CATEGORICAL_COLS = [
    "category", "retry_action_taken", "auth_method",
    "channel", "card_type", "merchant_category",
]
NUMERIC_COLS = [
    "amount_usd", "account_balance_usd", "cvv_retry_count",
    "velocity_score", "merchant_risk_score", "time_of_day_hour",
    "day_of_week", "delay_before_retry_min",
]

# Loaded once, reused across calls
_model = None
_encoders = None
_feature_columns = None


def _load_artifacts():
    global _model, _encoders, _feature_columns
    if _model is None:
        _model = joblib.load(MODEL_PATH)
        _encoders = joblib.load(ENCODERS_PATH)
        _feature_columns = joblib.load(FEATURE_COLUMNS_PATH)
    return _model, _encoders, _feature_columns


def score_recovery_strategy(transaction: dict, candidate_actions: list = None, candidate_delays: list = None):
    """
    Score every (retry_action, delay) combination for a given failed
    transaction and return them ranked by predicted P(success).

    transaction: dict with keys matching CATEGORICAL_COLS + NUMERIC_COLS,
                 EXCLUDING retry_action_taken and delay_before_retry_min
                 (those are the decision variables being scored).
    candidate_actions: list of retry actions to evaluate (default: all seen in training).
    candidate_delays: list of delay values in minutes (default: [0, 30, 120, 360]).

    Returns:
        {
            "ranked_strategies": [ {retry_action, delay_before_retry_min,
                                     predicted_success_prob}, ... ] sorted desc,
            "best_strategy": the top entry,
            "summary": human-readable string for the agent
        }
    """
    model, encoders, feature_columns = _load_artifacts()

    if candidate_actions is None:
        candidate_actions = list(encoders["retry_action_taken"].classes_)
    if candidate_delays is None:
        candidate_delays = [0, 30, 120, 360]

    rows = []
    combos = []
    for action in candidate_actions:
        for delay in candidate_delays:
            row = dict(transaction)
            row["retry_action_taken"] = action
            row["delay_before_retry_min"] = delay

            enc_row = {}
            for col in CATEGORICAL_COLS:
                val = str(row.get(col, ""))
                le = encoders[col]
                enc_row[col] = le.transform([val])[0] if val in le.classes_ else 0
            for col in NUMERIC_COLS:
                enc_row[col] = row.get(col, 0)

            rows.append(enc_row)
            combos.append((action, delay))

    X = pd.DataFrame(rows)[feature_columns]
    probs = model.predict_proba(X)[:, 1]

    ranked = [
        {
            "retry_action": a,
            "delay_before_retry_min": d,
            "predicted_success_prob": round(float(p), 4),
        }
        for (a, d), p in zip(combos, probs)
    ]
    ranked.sort(key=lambda r: r["predicted_success_prob"], reverse=True)

    best = ranked[0]
    summary = (
        f"Best predicted strategy: '{best['retry_action']}' after "
        f"{best['delay_before_retry_min']} min delay, "
        f"{round(best['predicted_success_prob']*100, 1)}% predicted success probability."
    )

    return {
        "ranked_strategies": ranked,
        "best_strategy": best,
        "summary": summary,
    }


if __name__ == "__main__":
   
    example_transaction = {
        "category": "insufficient_funds",
        "auth_method": "3D Secure",
        "channel": "Online",
        "card_type": "Visa",
        "merchant_category": "Retail",
        "amount_usd": 450.0,
        "account_balance_usd": 300.0,
        "cvv_retry_count": 0,
        "velocity_score": 20.0,
        "merchant_risk_score": 10.0,
        "time_of_day_hour": 14,
        "day_of_week": 3,
    }
    result = score_recovery_strategy(example_transaction)
    print(result["summary"])
    print(result["ranked_strategies"][:5])