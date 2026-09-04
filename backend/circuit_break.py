"""
backend/circuit_breaker.py
If a failure category's recovery rate drops too low (e.g. bank outage),
stop attempting retries for that category temporarily.
"""

from db import CategoryStats

MIN_ATTEMPTS_TO_EVALUATE = 20
RECOVERY_RATE_THRESHOLD = 0.05


def record_attempt(db, category: str, recovered: bool):
    stats = db.get(CategoryStats, category)
    if stats is None:
        stats = CategoryStats(category=category, attempts_last_hour=0, recoveries_last_hour=0)
        db.add(stats)

    stats.attempts_last_hour += 1
    if recovered:
        stats.recoveries_last_hour += 1

    if stats.attempts_last_hour >= MIN_ATTEMPTS_TO_EVALUATE:
        rate = stats.recoveries_last_hour / stats.attempts_last_hour
        stats.circuit_open = 1 if rate < RECOVERY_RATE_THRESHOLD else 0

    db.commit()


def is_circuit_open(db, category: str) -> bool:
    stats = db.get(CategoryStats, category)
    return bool(stats.circuit_open) if stats else False