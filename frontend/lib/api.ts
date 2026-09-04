import type {
  DashboardMetrics,
  Transaction,
  CircuitBreakerStatus,
  FailedTransactionPayload,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(`${path} -> ${res.status}: ${body}`, res.status);
  }
  return res.json() as Promise<T>;
}

/** GET /dashboard/metrics — revenue_recovered_usd is sanitized to 0 if the
 *  backend's JSON-sum query returns null/NaN (known SQLite gap, see notes). */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const raw = await request<DashboardMetrics>("/dashboard/metrics");
  const revenue = Number(raw.revenue_recovered_usd);
  return {
    ...raw,
    revenue_recovered_usd: Number.isFinite(revenue) ? revenue : 0,
  };
}

/** GET /dashboard/feed — recent transactions, newest first. */
export async function getDashboardFeed(limit = 50): Promise<Transaction[]> {
  return request<Transaction[]>(`/dashboard/feed?limit=${limit}`);
}

/** GET /dashboard/circuit-breaker — per-category breaker state. */
export async function getCircuitBreakerStatus(): Promise<CircuitBreakerStatus[]> {
  return request<CircuitBreakerStatus[]>("/dashboard/circuit-breaker");
}

/** POST /transaction/fail — real ingestion webhook. Used both for genuine
 *  demo traffic and to drive "Simulate Failure Burst" (fire this in a loop
 *  with unique idempotency_keys — there is no separate burst endpoint). */
export async function reportFailedTransaction(
  payload: FailedTransactionPayload
): Promise<{ status: string; transaction_id: string }> {
  return request("/transaction/fail", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export { ApiError };