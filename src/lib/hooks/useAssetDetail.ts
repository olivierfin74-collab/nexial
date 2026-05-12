"use client";

import { useEffect, useState } from "react";

export type AssetActiveProposal = {
  proposal_id: string;
  status: string;
  side: string;
  proposed_price: number;
  proposed_quantity: number;
  proposed_currency: string;
  expires_at: string;
  rationale: string | null;
  account_name: string;
};

export type AssetDetail = {
  asset_id: string | null;
  ticker: string;
  asset_name: string | null;
  currency: string;
  exchange_region: string | null;
  sector: string | null;
  current_price: number | null;
  high_52w: number | null;
  drawdown_from_high_pct: number | null;
  signal: string | null;
  opportunity_score: number | null;
  z1_price: number | null;
  z2_price: number | null;
  z3_price: number | null;
  distance_to_z1_pct: number | null;
  distance_to_z2_pct: number | null;
  distance_to_z3_pct: number | null;
  perf_1d_pct: number | null;
  perf_1w_pct: number | null;
  perf_1m_pct: number | null;
  perf_3m_pct: number | null;
  perf_6m_pct: number | null;
  in_portfolio: boolean | null;
  held_quantity: number | null;
  total_invested: number | null;
  current_market_value: number | null;
  pnl_pct: number | null;
  brokers: string[] | null;
  account_kinds: string[] | null;
  freshness_status: string | null;
  pricing_action_required: string | null;
  active_proposals: AssetActiveProposal[] | null;
};

export function useAssetDetail(ticker: string | null, opts?: { pollMs?: number }) {
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollMs = opts?.pollMs ?? 60000;

  useEffect(() => {
    if (!ticker) {
      setAsset(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/asset/${encodeURIComponent(ticker)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setAsset(json.asset || null);
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
  }, [ticker, pollMs]);

  return { asset, loading, error };
}
