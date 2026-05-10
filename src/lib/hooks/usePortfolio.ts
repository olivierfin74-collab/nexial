"use client";

import { useEffect, useState } from "react";

export type Position = {
  account_id: string;
  account_name: string;
  account_kind: string;
  broker: string | null;
  ticker: string;
  asset_name: string;
  asset_class: string;
  total_quantity: number;
  avg_cost_per_unit: number;
  last_price: number;
  market_value_native: number;
  market_value_eur: number;
  unrealized_pnl_native: number;
  unrealized_pnl_eur: number;
  unrealized_pnl_pct: number;
  asset_currency: string;
};

export type AccountSummary = {
  account_id: string;
  account_name: string;
  broker: string | null;
  positions_count: number;
  value_eur: number;
  pnl_eur: number;
  pnl_pct: number;
};

export type PortfolioSummary = {
  total_value_eur: number;
  total_pnl_eur: number;
  total_positions: number;
  by_account: AccountSummary[];
};

export function usePortfolio(opts?: { accountFilter?: string | null; pollMs?: number }) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollMs = opts?.pollMs ?? 60000;

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const params = new URLSearchParams();
        if (opts?.accountFilter) params.set("account_id", opts.accountFilter);
        const res = await fetch(`/api/portfolio/positions?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setPositions(json.positions || []);
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
  }, [opts?.accountFilter, pollMs]);

  return { positions, summary, loading, error };
}
