"""
backend/main.py
FastAPI entrypoint:
  POST /transaction/fail    -> webhook, ingests a failed transaction (fast, queues it)
  GET  /dashboard/metrics   -> KPI numbers for the Overview screen
  GET  /dashboard/feed      -> recent transactions with agent reasoning
  GET  /dashboard/circuit-breaker -> per-category circuit breaker status
  WS   /ws/feed             -> live agent decisions for the dashboard

Run: uvicorn main:app --reload
"""

import json
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy import func, text

from db import init_db, SessionLocal, Transaction, TxnStatus
from worker import enqueue_transaction, start_workers, job_queue
import worker as worker_module

app = FastAPI(title="Smart Retry & Recovery Agent")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
connected_clients: list[WebSocket] = []


class FailedTransactionPayload(BaseModel):
    transaction_id: str
    idempotency_key: str
    error_text: str
    transaction_data: dict  # category, amount_usd, account_balance_usd, etc.


@app.on_event("startup")
async def startup():
    init_db()
    worker_module.broadcast_callback = broadcast_to_clients
    start_workers()


async def broadcast_to_clients(message: dict):
    dead = []
    for ws in connected_clients:
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        connected_clients.remove(ws)


@app.post("/transaction/fail", status_code=202)
async def transaction_failed(payload: FailedTransactionPayload):
    """Webhook: validates, dedupes via idempotency key, queues, returns fast."""
    db = SessionLocal()
    try:
        existing = (
            db.query(Transaction)
            .filter(Transaction.idempotency_key == payload.idempotency_key)
            .first()
        )
        if existing:
            return {"status": "duplicate_ignored", "transaction_id": existing.transaction_id}

        txn = Transaction(
            transaction_id=payload.transaction_id,
            idempotency_key=payload.idempotency_key,
            error_text=payload.error_text,
            transaction_data=payload.transaction_data,
            status=TxnStatus.FAILED,
            retry_count=0,
            version=0,
        )
        db.add(txn)
        db.commit()
    finally:
        db.close()

    await enqueue_transaction(payload.transaction_id)
    return {"status": "queued", "transaction_id": payload.transaction_id}


@app.get("/dashboard/metrics")
async def dashboard_metrics():
    db = SessionLocal()
    try:
        total = db.query(func.count(Transaction.transaction_id)).scalar() or 0
        recovered = db.query(func.count(Transaction.transaction_id)).filter(
            Transaction.status == TxnStatus.RECOVERED
        ).scalar() or 0
        escalated = db.query(func.count(Transaction.transaction_id)).filter(
            Transaction.status == TxnStatus.ESCALATED
        ).scalar() or 0
        pending = total - recovered - escalated

        revenue_recovered = db.query(func.sum(Transaction.transaction_data["amount_usd"].as_float())).filter(
            Transaction.status == TxnStatus.RECOVERED
        ).scalar() or 0

        return {
            "total_failed": total,
            "recovered": recovered,
            "escalated": escalated,
            "pending": pending,
            "recovery_rate": round(recovered / total, 3) if total else 0,
            "revenue_recovered_usd": round(revenue_recovered, 2),
            "queue_depth": job_queue.qsize(),
        }
    finally:
        db.close()


@app.get("/dashboard/feed")
async def dashboard_feed(limit: int = 50):
    db = SessionLocal()
    try:
        rows = (
            db.query(Transaction)
            .order_by(Transaction.updated_at.desc())
            .limit(limit)
            .all()
        )

        def parse_decision(d):
            if isinstance(d, str):
                try:
                    return json.loads(d)
                except (TypeError, ValueError):
                    return None
            return d

        return [
            {
                "transaction_id": r.transaction_id,
                "status": r.status,
                "error_text": r.error_text,
                "retry_count": r.retry_count,
                "category": (r.transaction_data or {}).get("category"),
                "amount_usd": (r.transaction_data or {}).get("amount_usd"),
                "agent_decision": parse_decision(r.agent_decision),
                "updated_at": r.updated_at.isoformat(),
            }
            for r in rows
        ]
    finally:
        db.close()


@app.get("/dashboard/circuit-breaker")
async def circuit_breaker_status():
    db = SessionLocal()
    try:
        rows = db.execute(text(
            "SELECT category, attempts_last_hour, recoveries_last_hour, circuit_open FROM category_stats"
        )).fetchall()
        return [
            {
                "category": r.category,
                "attempts_last_hour": r.attempts_last_hour,
                "recoveries_last_hour": r.recoveries_last_hour,
                "success_rate": round(r.recoveries_last_hour / r.attempts_last_hour, 3) if r.attempts_last_hour else None,
                "circuit_open": bool(r.circuit_open),
            }
            for r in rows
        ]
    finally:
        db.close()


@app.websocket("/ws/feed")
async def websocket_feed(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            await websocket.receive_text()  # keep-alive; client doesn't need to send real data
    except WebSocketDisconnect:
        connected_clients.remove(websocket)