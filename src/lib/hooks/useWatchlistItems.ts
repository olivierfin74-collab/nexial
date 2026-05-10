"use client";

import { useCallback, useEffect, useState } from "react";

export type WatchlistItem = {
  item_id: string | null;          // null for OPPORTUNITY (dynamic)
  watchlist_id: string;
  priority: number | null;
  notes: string | null;
  added_at: string;
  asset_id: string;
  ticker: string;
  exchange_mic: string | null;
  currency: string | null;
  asset_name: string | null;
  coverage_level?: string | null;  // present in OPPORTUNITY payload
  current_price: number | null;
  signal: string | null;
  z1: number | null;
  z2: number | null;
  z3: number | null;
  distance_to_z1_pct: number | null;
  distance_to_z2_pct: number | null;
  distance_to_z3_pct: number | null;
  drawdown_from_high_pct: number | null;
  opportunity_score: number | null;
  perf_1d_pct: number | null;
  perf_1w_pct: number | null;
  perf_1m_pct: number | null;
  perf_3m_pct: number | null;
  perf_6m_pct: number | null;
  in_portfolio: boolean | null;
  pnl_pct: number | null;
  freshness_status: string | null;
};

export function useWatchlistItems(
  watchlistId: string | null,
  opts?: { pollMs?: number }
) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollMs = opts?.pollMs ?? 60000;

  const fetchOnce = useCallback(async () => {
    if (!watchlistId) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/watchlists/${watchlistId}/items`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setItems(json.items || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Fetch error");
    } finally {
      setLoading(false);
    }
  }, [watchlistId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const tick = async () => {
      if (cancelled) return;
      await fetchOnce();
    };
    tick();
    const id = setInterval(tick, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fetchOnce, pollMs]);

  const addItem = useCallback(
    async (assetId: string, priority = 10, notes: string | null = null) => {
      if (!watchlistId) throw new Error("no watchlist selected");
      const res = await fetch(`/api/watchlists/${watchlistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_id: assetId,
          priority,
          notes,
          move_if_exists: true,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      await fetchOnce();
    },
    [watchlistId, fetchOnce]
  );

  const removeItem = useCallback(
    async (assetId: string) => {
      if (!watchlistId) throw new Error("no watchlist selected");
      const res = await fetch(
        `/api/watchlists/${watchlistId}/items?asset_id=${encodeURIComponent(assetId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      await fetchOnce();
    },
    [watchlistId, fetchOnce]
  );

  return { items, loading, error, refetch: fetchOnce, addItem, removeItem };
}
