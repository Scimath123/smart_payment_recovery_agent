# Smart Retry & Recovery Agent

An AI-powered payment failure recovery system that combines RAG, machine learning, and LLM reasoning to automatically recover failed payments with a real-time observability dashboard to watch it work.

Built for the Razorpay Hackathon 2026.


Live demo: [smart-payment-recovery-agent.vercel.app](https://smart-payment-recovery-agent.vercel.app) · **Backend API:** [smart-payment-recovery-agent.onrender.com](https://smart-payment-recovery-agent.onrender.com)

> About the live demo: the backend is deployed on Render's free tier, which gives only 512MB of RAM and spins the service down after inactivity. This project's backend loads several memory-heavy libraries at once (`torch`, `sentence-transformers`, `chromadb`, `lightgbm`), which can exceed that limit under real load — so the live deployment can be slow to wake up, or a live pipeline run may stall or restart mid-way. This is a hosting-tier resource constraint, not a bug in the system itself.
>
> For the most reliable, complete experience — including a full live burst of 20+ concurrent transactions processing end-to-end — run it locally. Full setup instructions below take about 10 minutes. The live dashboard also has a built-in Demo Mode button that animates the entire pipeline with realistic simulated data and needs no backend at all, useful for a quick look without any setup.

---

## Table of Contents

- [The Problem](#the-problem)
- [The Approach](#the-approach)
- [How It Works](#how-it-works)
- [Live Dashboard](#live-dashboard)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Running Locally](#running-locally)
  - [Prerequisites](#prerequisites)
  - [1. Clone the repository](#1-clone-the-repository)
  - [2. Backend setup](#2-backend-setup)
  - [3. Environment variables](#3-environment-variables)
  - [4. Regenerate data files (only if missing)](#4-regenerate-data-files-only-if-missing)
  - [5. Start the backend](#5-start-the-backend)
  - [6. Frontend setup](#6-frontend-setup)
  - [7. Start the frontend](#7-start-the-frontend)
  - [8. Try it end-to-end](#8-try-it-end-to-end)
  - [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Known Limitations](#known-limitations)
- [What I'd Build Next](#what-id-build-next)

---

## The Problem

Payment failures are common — bank timeouts, insufficient funds, expired OTPs, network errors — and a meaningful share of them are actually recoverable with the right retry, at the right time, through the right channel. Most systems handle this with blind, fixed-schedule retries: no memory of what worked before, no sense of *which* action is likely to succeed for *this specific* failure.

This project treats payment recovery as a genuine decision problem, not a retry loop.

## The Approach

For every failed payment, the system runs a tiered decision pipeline:

1. **Retrieve** — find similar past failures using semantic search (RAG) and see what actually worked for them.
2. **Score** — run every candidate retry strategy through a machine learning model trained on historical recovery outcomes, producing a probability of success for each.
3. **Decide** — if the retrieved cases are highly similar and in strong agreement, trust the ML model's top suggestion directly (**fast path**, near-instant). Otherwise, hand the RAG results and ML scores to an LLM (Gemini) to reason through the decision and explain it in plain language (**agent path**).
4. **Act & Learn** — execute the retry, record the outcome, and feed it back into the historical record for future lookups. A circuit breaker watches each failure category and pauses retries automatically if recovery rates collapse — protecting against wasting attempts during a systemic outage (e.g. a real bank-side incident).

The result: most failures are resolved cheaply and instantly, and only genuinely ambiguous cases consume the more expensive LLM reasoning step — a deliberate cost/latency optimization, not an afterthought.

## How It Works

```
Payment fails
      ↓
  Webhook ingest → Queue → Worker pool (5 concurrent workers)
      ↓
  RAG retrieval (ChromaDB + sentence-transformers)
  → finds top-5 similar historical failures, their outcomes, and success rates by action
      ↓
  ML scoring (LightGBM)
  → predicts P(success) for every (retry action × delay) combination
      ↓
  Tiering decision
      ↓
  ┌─────────────────┐         ┌──────────────────────┐
  │    FAST PATH     │         │      AGENT PATH       │
  │ trust ML model's │         │ Gemini reasons over   │
  │ top strategy     │         │ RAG + ML results,      │
  │ directly         │         │ explains its decision │
  └─────────────────┘         └──────────────────────┘
      ↓
  Retry executed → outcome recorded → circuit breaker updated
      ↓
  Every step broadcast live over WebSocket to the dashboard
```

## Live Dashboard

The frontend is a real-time observability control center, not a static report — every panel is driven by live WebSocket events from the backend, not polling or mock data.

 

Overview KPIs (failed, recovered, recovery rate), live payment activity feed, the full agent pipeline visualization, queue/worker pool, live system event log, money flow, and circuit breaker status — all updating in real time 
Transactions- Full searchable/filterable transaction explorer with a detail drawer showing each transaction's complete timeline, retrieved cases, ML scores, and agent reasoning 
Agent Activity- What the AI is currently analyzing, plus a running log of recent decisions with full explanations 
System Health- Queue depth, WebSocket connection status, circuit breaker state per failure category 
|Analytics- Outcome breakdown and fast-path vs. agent-path distribution 

Two additional features built specifically for demoing reliably:
Simulate Failure Burst — fires 20 real transactions at the live backend in quick succession, so you can see concurrent processing, queue growth, and worker utilization under load.
  Demo Mode — runs the entire visual pipeline with realistic simulated data, no backend required. Automatically yields to the real backend the instant a live connection succeeds.

## Tech Stack

Backend
- FastAPI + Uvicorn — async web server and webhook ingestion
- LangGraph — orchestrates the agent's tiered decision flow as an explicit state graph
- ChromaDB + sentence-transformers (`all-MiniLM-L6-v2`) — RAG vector store for historical failure retrieval
- LightGBM — trained classifier scoring retry-strategy success probability
- Google Gemini (`gemini-2.0-flash`) — LLM reasoning for ambiguous cases
- SQLAlchemy + SQLite — transaction state machine with optimistic locking (version-based concurrency control)
- Python `asyncio` — 5-worker concurrent processing pool with a circuit breaker per failure category

Frontend
- Next.js 15 (App Router) + TypeScript
- Zustand — centralized real-time state store fed by WebSocket events
- Tailwind CSS — design system with a custom dark theme
- Framer Motion — animated pipeline visualizations, floating card interactions, mouse-tracked 3D tilt
- Recharts — analytics charts
- Native WebSocket client with automatic reconnect and exponential backoff

Infrastructure
- Backend deployed on Render (free tier)
- Frontend deployed on Vercel
- Live WebSocket connection between them (`wss://`)

## Architecture

```
Payment gateway / merchant system
            ↓
    POST /transaction/fail  (FastAPI webhook)
            ↓
      asyncio.Queue  →  5 concurrent workers
            ↓                    ↓                ↓
         retriever.py      retriever_score.py   agent.py (LangGraph)
         (RAG lookup)      (ML scoring)          (tiered decision)
            ↓                    ↓                ↓
                      SQLite (transaction state)
                      + per-category circuit breaker stats
            ↓
      Every step broadcast over WebSocket (/ws/feed)
            ↓
    Next.js dashboard — Zustand store — live UI
```

## Project Structure

```
ai_revenue_recovery/
├── backend/
│   ├── main.py              # FastAPI app — REST endpoints + WebSocket
│   ├── worker.py            # Async worker pool, job queue, event broadcasting
│   ├── db.py                # SQLAlchemy models, optimistic locking
│   └── circuit_break.py     # Per-category circuit breaker logic
├── agent.py                 # LangGraph agent — RAG → ML → tiering → decision
├── retriever.py             # RAG tool — semantic search over past failures
├── retriever_score.py       # ML tool — scores every retry strategy
├── embed.py                 # One-time: embeds failure corpus into ChromaDB
├── generate.py               # One-time: synthesizes the labeled failure corpus
├── mltool.ipynb              # ML model training notebook (LightGBM)
├── requirements.txt
├── data/                     # Vector store + training corpus
├── models/                   # Trained model artifacts (.pkl)
└── frontend/
    ├── app/                  # Next.js pages (Overview, Transactions, Agent Activity, System Health, Analytics)
    ├── components/           # Dashboard, pipeline, agent, transaction, layout components
    ├── lib/                  # store.ts (Zustand), websocket.ts, api.ts, utils
    ├── hooks/                # useWebSocketConnection, useDashboardData
    └── types/                # Shared TypeScript types
```

---

## Running Locally

Running locally is the recommended way to see this project working fully and reliably — the hosted backend runs on a free tier that isn't resourced for continuous live demos (see the note at the top of this README).

### Prerequisites

Install these before you start:



Python- 3.11.x (3.11.9 recommended — some dependencies have build issues on 3.12+)  `python --version` 
Node.js- 18.x or newer  `node --version` 
npm- comes with Node.js  `npm --version` 
Git-any recent version `git --version` 
Google Gemini API key- free tier is fine 

You do **not** need Docker, a database server, or any paid service — SQLite and ChromaDB are both file-based and need no separate installation.

### 1. Clone the repository

```bash
git clone https://github.com/Scimath123/smart_payment_recovery_agent.git
cd smart_payment_recovery_agent
```

### 2. Backend setup

Create and activate a virtual environment, then install all Python dependencies (this installs everything listed in `requirements.txt`, including FastAPI, LangGraph, ChromaDB, sentence-transformers, LightGBM, torch, and google-generativeai):

```bash
python -m venv venv
```

**Windows (PowerShell):**
```powershell
venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
source venv/bin/activate
```

Then install dependencies (same command on every OS, once the venv is active):
```bash
pip install -r requirements.txt
```

This step downloads several large ML libraries (`torch` in particular) and can take a few minutes on first run.

### 3. Environment variables

Create a file named `.env` in the **project root** (same folder as `requirements.txt`, not inside `backend/`):

```
GEMINI_KEY=your_gemini_api_key_here
```

Replace `your_gemini_api_key_here` with your real key from Google AI Studio. Do not commit this file — it's already excluded via `.gitignore`.

### 4. Regenerate data files (only if missing)

This repository already includes a working `data/chroma_db/` (the RAG vector store) and `models/` (the trained ML model) so you can skip this step entirely and go straight to step 5.

Only run this if those folders are missing or empty on your machine:

```bash
python generate.py    # builds the labeled failure corpus from sample transaction data
python embed.py       # embeds the corpus into a ChromaDB vector store
```

Then open `mltool.ipynb` in Jupyter (`pip install jupyter` if you don't have it, then `jupyter notebook`) and run all cells — this trains the LightGBM model and saves it into `models/`.

### 5. Start the backend

From the **project root**, with your virtual environment still active:

```bash
cd backend
uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

Leave this terminal running. The backend is now live at `http://localhost:8000`.

### 6. Frontend setup

Open a new terminal (keep the backend running in the first one), navigate to the project, and install Node dependencies:

```bash
cd frontend
npm install
```

This installs Next.js, React, Zustand, Tailwind CSS, Framer Motion, Recharts, lucide-react, and everything else in `frontend/package.json`.

No `.env.local` file is needed for local development — the frontend defaults to `http://localhost:8000` and `ws://localhost:8000` for the backend automatically.

### 7. Start the frontend

```bash
npm run dev
```

You should see:
```
▲ Next.js
- Local: http://localhost:3000
✓ Ready
```

Open **http://localhost:3000** in your browser. You should see the dashboard, with the connection badge in the header showing **● LIVE** once it connects to your local backend.

### 8. Try it end-to-end

With both servers running, fire a test failed transaction at your local backend:

Windows (PowerShell):
```powershell
$body = @{
  transaction_id   = "test_001"
  idempotency_key  = "idem_test_001"
  error_text       = "Do Not Honour - Bank declined due to risk parameters"
  transaction_data = @{
    category = "risk_block"
    amount_usd = 4850
    account_balance_usd = 6700
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://localhost:8000/transaction/fail" -Method Post -ContentType "application/json" -Body $body
```

macOS / Linux (curl):
```bash
curl -X POST http://localhost:8000/transaction/fail \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "test_001",
    "idempotency_key": "idem_test_001",
    "error_text": "Do Not Honour - Bank declined due to risk parameters",
    "transaction_data": {
      "category": "risk_block",
      "amount_usd": 4850,
      "account_balance_usd": 6700
    }
  }'
```

Watch the dashboard — a transaction card should appear immediately in **Live Payment Activity** and progress through Queue → Worker → RAG → ML Score → Decision → Recovered/Escalated in real time, with matching entries streaming into **Live System Events**.

Or, for a fuller demonstration of concurrency, click the Simulate Failure Burst button on the dashboard itself — it fires 20 real transactions at your local backend and lets you watch all 5 workers process them in parallel.

### Troubleshooting



 `pip install` fails on `torch` Confirm you're on Python 3.11.x, not 3.12+ — some ML library wheels aren't published for newer Python versions yet 
 Backend won't start, `ModuleNotFoundError`  Make sure your virtual environment is activated (`(venv)` should show in your terminal prompt) before running `pip install -r requirements.txt` 
 Dashboard shows `○ OFFLINE`  `◌ RECONNECTING`  Confirm the backend terminal shows "Application startup complete" and is still running; the frontend auto-reconnects once it's up 
 `agent.py` errors mentioning Gemini/API key Double-check `.env` is in the project root (not `backend/`) and contains a valid `GEMINI_KEY` 
 Frontend shows blank/errors on `npm run dev` Confirm Node.js is 18+ (`node --version`) and you ran `npm install` inside `frontend/`, not the project root 
 Want to reset the demo data Delete `backend/recovery_agent.db` and restart the backend — it recreates a fresh empty database automatically 

---

## API Reference

 Endpoint Method  Description 

`/transaction/fail`  `POST`  Webhook — ingest a failed transaction, dedupes via `idempotency_key`, queues it 
 `/dashboard/metrics`  `GET`  Aggregate KPIs — total failed, recovered, recovery rate, revenue recovered 
 `/dashboard/feed`  `GET`  Recent transactions with agent decisions 
 `/dashboard/circuit-breaker`  `GET` Per-category circuit breaker status 
 `/ws/feed` `WebSocket`  Live event stream — every pipeline stage broadcast as it happens 

## WebSocket Events


 `QUEUED`  Transaction entered the processing queue 
 `WORKER_ASSIGNED`  A worker picked it up 
 `RAG_STARTED`  `RAG_COMPLETED` Historical similarity lookup in progress  finished  `ML_SCORING`  `ML_SCORED`  Strategy scoring in progress  finished 
 `RETRY_SCHEDULED`  Final decision made, includes full reasoning and confidence 
 `RECOVERED`  `FAILED_AGAIN`  `ESCALATED`  Terminal or retry-loop outcome 
 `CIRCUIT_OPEN`  A failure category has been paused due to sustained low recovery rate 

## Known Limitations


- The hosted backend runs on Render's free tier (512MB RAM), which is genuinely tight for the combined footprint of `torch`, `sentence-transformers`, `chromadb`, and `lightgbm` loaded together. Under real request load, the free-tier instance can be slow to respond or restart mid-pipeline. This is a hosting-resource constraint, not a defect in the application logic — it runs reliably locally, or on any tier with more available memory (e.g. Render's Starter plan). **Demo Mode** in the dashboard exists as a no-backend-required fallback for this exact reason.
- Revenue at Risk on the dashboard is a client-side session estimate (sums transactions this browser has observed), not a full database aggregate — no backend endpoint currently computes that total.
- Worker identity isn't tracked — the dashboard shows how many of the 5 workers are busy, but not which specific worker handled which transaction, since the backend doesn't broadcast that detail.
- RAG/ML panels show a single top-result summary, not the full ranked list  the live broadcast currently sends only the top similarity/strategy, though the full data exists server-side and could be exposed with a small backend change.
- System Health metrics like LLM calls/min or cache hit rate aren't tracked yet — shown as explicitly empty rather than fabricated.
- The retry-success outcome is simulated (weighted random based on the model's confidence score) rather than executing a real retry against a payment gateway, since this is a demo/hackathon build without a live gateway integration.

## Future Steps:

- Move the hosted backend to a properly resourced tier (or a lighter embedding model) to make the live deployment as reliable as the local setup
- Expose the full RAG case list and complete ML strategy ranking over the WebSocket, not just the top result
- Add per-worker identity tracking for true worker-level observability
- Replace the simulated retry outcome with a real gateway integration
- Add authentication and multi-tenant support for real merchant onboarding
- Add proper monitoring (LLM cost tracking, cache hit rates, latency percentiles)

---

 Kausthuv Narayan Medhi — [LinkedIn](https://www.linkedin.com/in/kausthuv-narayan-medhi-720a54323) .
