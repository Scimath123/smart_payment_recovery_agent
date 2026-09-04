"""
backend/db.py
SQLAlchemy models for the transaction state machine, with optimistic
locking (version column) so concurrent workers can't double-process
the same transaction.
"""

import enum
import json
from datetime import datetime

from sqlalchemy import (
    create_engine, Column, String, Float, Integer, DateTime, Enum, JSON, text
)
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./recovery_agent.db"  # swap for Postgres URL in prod

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class TxnStatus(str, enum.Enum):
    FAILED = "FAILED"
    AGENT_EVALUATING = "AGENT_EVALUATING"
    RETRY_SCHEDULED = "RETRY_SCHEDULED"
    RECOVERED = "RECOVERED"
    FAILED_AGAIN = "FAILED_AGAIN"
    ESCALATED = "ESCALATED"


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(String, primary_key=True)
    idempotency_key = Column(String, unique=True, index=True)
    error_text = Column(String)
    transaction_data = Column(JSON)          # raw features passed to the agent
    status = Column(Enum(TxnStatus), default=TxnStatus.FAILED)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    agent_decision = Column(JSON, nullable=True)
    version = Column(Integer, default=0)      # optimistic lock
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CategoryStats(Base):
    """Rolling stats per failure category, used by the circuit breaker."""
    __tablename__ = "category_stats"

    category = Column(String, primary_key=True)
    attempts_last_hour = Column(Integer, default=0)
    recoveries_last_hour = Column(Integer, default=0)
    circuit_open = Column(Integer, default=0)  # 0/1 as bool


def init_db():
    Base.metadata.create_all(bind=engine)


def get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def update_with_lock(db, transaction_id: str, expected_version: int, **fields) -> bool:
    """
    Optimistic-lock update: only succeeds if version still matches.
    Returns True if the update applied, False if another worker
    already modified this row (caller should skip/retry).
    """
    status = fields.get("status")
    status_value = status.value if isinstance(status, TxnStatus) else status
    agent_decision = fields.get("agent_decision")
    agent_decision_json = json.dumps(agent_decision) if agent_decision is not None else None

    result = db.execute(
        text(
            """
            UPDATE transactions
            SET status = :status, retry_count = :retry_count,
                agent_decision = :agent_decision, version = :version,
                updated_at = :updated_at
            WHERE transaction_id = :transaction_id AND version = :expected_version
            """
        ),
        {
            "status": status_value,
            "retry_count": fields.get("retry_count"),
            "agent_decision": agent_decision_json,
            "version": expected_version + 1,
            "updated_at": datetime.utcnow(),
            "transaction_id": transaction_id,
            "expected_version": expected_version,
        },
    )
    db.commit()
    return result.rowcount == 1