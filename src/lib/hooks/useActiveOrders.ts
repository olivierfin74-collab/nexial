"use client";

import { useCallback, useEffect, useState } from "react";

export type ActiveOrder = {
  id: string;
  ticker: string;
  asset_name?: string | null;
  asset_name_fr?: string | null;
  name?: string | null;
  account_kind: string;
  account_name: string;
  account_scope?: string | null;
  side: string;
  order_type: string;
  status: string;
  lifecycle_state?: string | null;
  status_bucket?: string | null;
  status_group?: string | null;
  state_group?: string | null;
  price?: number | null;
  limit_price?: number | null;
  quantity?: number | null;
  effective_price: number;
  effective_quantity: number;
  effective_amount: number;
  amount_estimated?: number | null;
  estimated_amount?: number | null;
  currency: string;
  source?: string | null;
  order_source?: string | null;
  origin?: string | null;
  source_recommendation_id?: string | null;
  thesis_id?: string | null;
  signal_at_creation: string;
  source_score: number;
  signal_now: string;
  score_now: number;
  market_price_now: number;
  drawdown_now: number;
  price_change_since_proposal_pct: number;
  distance_to_placed_pct: number | null;
  limit_likely_hit: boolean;
  created_at: string;
  submitted_at?: string | null;
  filled_at?: string | null;
  expires_at: string;
  expires_in_hours: number;
  age_hours: number;
  rationale: string;
  filled_quantity?: number | null;
  filled_qty?: number | null;
  remaining_quantity?: number | null;
  remaining_qty?: number | null;
  avg_fill_price?: number | null;
  total_fees?: number | null;
  broker_order_id?: string | null;
};

export type OrdersSummary = {
  pending: number;
  placed: number;
  filled: number;
  expired: number;
  total: number;
};

export function useActiveOrders(opts?: { statusFilter?: string; pollMs?: number }) {
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusFilter = opts?.statusFilter;
  const pollMs = opts?.pollMs ?? 30000;

  const fetchOnce = useCallback(async (cancelledRef?: { current: boolean }) => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/orders/active?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (cancelledRef?.current) return;
      setOrders(json.orders || []);
      setSummary(json.summary || null);
      setError(null);
    } catch (err: unknown) {
      if (cancelledRef?.current) return;
      setError(err instanceof Error ? err.message : "Fetch error");
    } finally {
      if (!cancelledRef?.current) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const cancelledRef = { current: false };

    queueMicrotask(() => void fetchOnce(cancelledRef));
    const id = setInterval(() => fetchOnce(cancelledRef), pollMs);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [fetchOnce, pollMs]);

  return { orders, summary, loading, error, refetch: () => fetchOnce() };
}
