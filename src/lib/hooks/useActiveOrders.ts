"use client";

import { useCallback, useEffect, useState } from "react";

export type ActiveOrder = {
  id: string;
  user_id: string;
  ticker: string;
  asset_name: string;
  side: string;
  status: string;
  status_fr: string;
  quantity: number;
  filled_quantity: number;
  remaining_quantity: number;
  limit_price: number;
  avg_fill_price: number | null;
  currency: string;
  total_fees: number | null;
  estimated_value_native: number;
  estimated_value_eur: number;
  source: string;
  account_type: "PEA" | "CTO" | string;
  thesis_id: string | null;
  source_recommendation_id: string | null;
  submitted_at: string | null;
  filled_at: string | null;
  created_at: string;
  origin: string;
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
