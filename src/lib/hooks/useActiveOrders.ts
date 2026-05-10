"use client";

import { useEffect, useState } from "react";

export type ActiveOrder = {
  id: string;
  ticker: string;
  account_kind: string;
  account_name: string;
  side: string;
  order_type: string;
  status: string;
  effective_price: number;
  effective_quantity: number;
  effective_amount: number;
  currency: string;
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
  expires_at: string;
  expires_in_hours: number;
  age_hours: number;
  rationale: string;
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

  const pollMs = opts?.pollMs ?? 30000;

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const params = new URLSearchParams();
        if (opts?.statusFilter) params.set("status", opts.statusFilter);
        const res = await fetch(`/api/orders/active?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setOrders(json.orders || []);
        setSummary(json.summary || null);
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
  }, [opts?.statusFilter, pollMs]);

  return { orders, summary, loading, error };
}
