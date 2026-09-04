import { useEffect } from "react";
import { getDashboardFeed, getDashboardMetrics, getCircuitBreakerStatus } from "@/lib/api";
import { useRecoveryStore } from "@/lib/store";

const METRICS_POLL_MS = 7000;
const FEED_POLL_MS = 10000; // backfills category/amount_usd for transactions
// that arrived purely via WS before this client had a chance to hydrate them

export function useDashboardData() {
  const setMetrics = useRecoveryStore((s) => s.setMetrics);
  const setCircuitBreaker = useRecoveryStore((s) => s.setCircuitBreaker);
  const hydrateFeed = useRecoveryStore((s) => s.hydrateFeed);

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      try {
        const m = await getDashboardMetrics();
        if (!cancelled) setMetrics(m);
      } catch {
        // backend unreachable — leave last-known metrics in place rather than
        // wiping the UI; ConnectionBadge already communicates offline state
      }
    }

    async function loadCircuitBreaker() {
      try {
        const c = await getCircuitBreakerStatus();
        if (!cancelled) setCircuitBreaker(c);
      } catch {
        /* same as above */
      }
    }

    async function loadFeed() {
      try {
        const feed = await getDashboardFeed(50);
        if (!cancelled) hydrateFeed(feed);
      } catch {
        /* same as above */
      }
    }

    loadMetrics();
    loadCircuitBreaker();
    loadFeed();

    const metricsInterval = setInterval(() => {
      loadMetrics();
      loadCircuitBreaker();
    }, METRICS_POLL_MS);
    const feedInterval = setInterval(loadFeed, FEED_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(metricsInterval);
      clearInterval(feedInterval);
    };
  }, [setMetrics, setCircuitBreaker, hydrateFeed]);
}