"use client";

import { useEffect, useState } from "react";

export type WatchlistItem = {
  asset_id: string;
  ticker: string;
  asset_name: string | null;
  exchange_region: string | null;
  currency: string | null;
  priority: number | null;
  watchlist_source: string | null;
  current_price: number | null;
  signal: string | null;
  opportunity_score: number | null;
  drawdown_from_high_pct: number | null;
  z1_price: number | null;
  z2_price: number | null;
  z3_price: number | null;
  distance_to_z3_pct: number | null;
  perf_1d_pct: number | null;
  perf_1w_pct: number | null;
  perf_1m_pct: number | null;
  in_portfolio: boolean | null;
  pnl_pct: number | null;
  freshness_status: string | null;
};

export function useWatchlist(opts?: { pollMs?: number }) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollMs = opts?.pollMs ?? 60000;

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const res = await fetch("/api/watchlist");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setItems(json.items || []);
        setError(null);
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || "Fetch error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOnce();
    const id = setInterval(fetchOnce, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollMs]);

  return { items, loading, error };
}
