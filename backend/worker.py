"""
backend/worker.py
Async worker pool: pulls failed-transaction jobs off an in-memory queue
and runs each through the LangGraph agent, respecting max retries and
the circuit breaker. Broadcasts granular stage events to connected
WebSocket clients (QUEUED, WORKER_ASSIGNED, RAG_STARTED, RAG_COMPLETED,
ML_SCORING, ML_SCORED, RETRY_SCHEDULED, RECOVERED/FAILED_AGAIN/ESCALATED).
"""

import asyncio
import sys
import os
import random

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))  # so agent.py / retriever.py / retriever_score.py resolve

from agent import build_agent_graph
from db import SessionLocal, Transaction, TxnStatus, update_with_lock
from circuit_break import record_attempt, is_circuit_open
from retriever import retrieve_similar_failures
from retriever_score import score_recovery_strategy

NUM_WORKERS = 5
job_queue: asyncio.Queue = asyncio.Queue()
_agent = build_agent_graph()

# Set by main.py at startup so workers can push live updates to the dashboard
broadcast_callback = None


async def enqueue_transaction(transaction_id: str):
    await job_queue.put(transaction_id)
    if broadcast_callback:
        await broadcast_callback({"event": "QUEUED", "transaction_id": transaction_id})


async def _process_one(transaction_id: str):
    db = SessionLocal()
    try:
        txn = db.get(Transaction, transaction_id)
        if txn is None:
            return

        category = txn.transaction_data.get("category", "unknown")

        if is_circuit_open(db, category):
            update_with_lock(
                db, transaction_id, txn.version,
                status=TxnStatus.ESCALATED, retry_count=txn.retry_count,
                agent_decision={"reasoning": f"Circuit open for category '{category}' — systemic outage suspected."},
            )
            if broadcast_callback:
                await broadcast_callback({
                    "event": "CIRCUIT_OPEN", "transaction_id": transaction_id,
                    "status": "ESCALATED", "category": category,
                })
            return

        # --- WORKER_ASSIGNED ---
        if broadcast_callback:
            await broadcast_callback({"event": "WORKER_ASSIGNED", "transaction_id": transaction_id})

        update_with_lock(db, transaction_id, txn.version, status=TxnStatus.AGENT_EVALUATING,
                          retry_count=txn.retry_count, agent_decision=None)
        txn = db.get(Transaction, transaction_id)  # refresh version

        # --- RAG_STARTED / RAG_COMPLETED ---
        if broadcast_callback:
            await broadcast_callback({"event": "RAG_STARTED", "transaction_id": transaction_id})

        rag_result = retrieve_similar_failures(txn.error_text, k=5)

        if broadcast_callback:
            await broadcast_callback({
                "event": "RAG_COMPLETED", "transaction_id": transaction_id,
                "top_similarity": rag_result.get("top_similarity"),
                "cases_found": len(rag_result.get("cases", [])),
            })

        # --- ML_SCORING / ML_SCORED ---
        if broadcast_callback:
            await broadcast_callback({"event": "ML_SCORING", "transaction_id": transaction_id})

        ml_result = score_recovery_strategy(txn.transaction_data)

        if broadcast_callback:
            await broadcast_callback({
                "event": "ML_SCORED", "transaction_id": transaction_id,
                "top_strategy": ml_result["best_strategy"],
            })

        # --- run the full agent graph (tiering decides fast_path vs llm_reasoning) ---
        result = _agent.invoke({
            "transaction": txn.transaction_data,
            "error_text": txn.error_text,
        })
        decision = result["final_decision"]

        if broadcast_callback:
            await broadcast_callback({
                "event": "RETRY_SCHEDULED", "transaction_id": transaction_id,
                "decision": decision, "tier_used": result.get("tier"),
            })

        # Simulated execution outcome for the demo — in production this
        # would actually trigger the retry and wait for the real result.
        recovered = random.random() < decision.get("confidence", 0.5)

        new_retry_count = txn.retry_count + 1
        if recovered:
            new_status = TxnStatus.RECOVERED
        elif new_retry_count >= txn.max_retries:
            new_status = TxnStatus.ESCALATED
        else:
            new_status = TxnStatus.FAILED_AGAIN

        update_with_lock(
            db, transaction_id, txn.version,
            status=new_status, retry_count=new_retry_count, agent_decision=decision,
        )
        record_attempt(db, category, recovered)

        if broadcast_callback:
            await broadcast_callback({
                "event": new_status.value,
                "transaction_id": transaction_id,
                "status": new_status.value,
                "decision": decision,
                "amount_usd": txn.transaction_data.get("amount_usd"),
            })

        # requeue for another attempt if allowed
        if new_status == TxnStatus.FAILED_AGAIN:
            await asyncio.sleep(1)  # backoff (shortened for demo; use decision's delay in prod)
            await job_queue.put(transaction_id)

    finally:
        db.close()


async def worker_loop(worker_id: int):
    while True:
        transaction_id = await job_queue.get()
        try:
            await _process_one(transaction_id)
        except Exception as e:
            print(f"[worker {worker_id}] error processing {transaction_id}: {e}")
        finally:
            job_queue.task_done()


def start_workers():
    return [asyncio.create_task(worker_loop(i)) for i in range(NUM_WORKERS)]