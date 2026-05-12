"use client";

import { useCallback, useEffect, useState } from "react";

export type TodayOpportunity = {
  asset_id: string;
  ticker: string;
  asset_name: string;
  sector: string;
  exchange_region: string;
  pea_eligible: boolean;
  cto_eligible: boolean;
  combined_score: number;
  technical_score: number;
  overall_fundamental_score: number;
  market_regime: string;
  final_action: string;
  suggested_sizing_multiplier: number;
  dist_52w_high_pct: number | null;
  earnings_imminent: boolean;
  target_weight_pct: number | null;
  tier: string | null;
  thesis: string;
  current_value_eur: number | null;
  current_pnl_pct: number | null;
  current_account: string | null;
  event_kind: string | null;
  event_severity: string | null;
  rank_score: number;
};

export type CashBalance = {
  currency: string;
  balance: number;
  balance_eur: number;
  is_primary: boolean;
};

export type TopPosition = {
  ticker: string;
  asset_name: string;
  market_value_eur: number;
  unrealized_pnl_pct: number;
  rank_in_account: number;
};

export type PatrimoineAccount = {
  account_id: string;
  account_name: string;
  account_kind: string;
  broker: string | null;
  base_currency: string;
  is_active: boolean;
  display_order: number;
  universe: string;
  universe_short_name: string;
  universe_display_name: string;
  universe_description: string;
  universe_allowed_currencies: string[];
  universe_has_tax_wrapper: boolean;
  universe_tax_wrapper_name: string | null;
  automation_mode: string;
  is_lab: boolean;
  lab_max_capital_eur: number | null;
  parent_account_id: string | null;
  is_sub_account: boolean;
  cash_total_eur: number;
  cash_balances: CashBalance[];
  invested_total_eur: number;
  positions_count: number;
  top_positions: TopPosition[];
  total_account_value_eur: number;
  notes: string | null;
};

export type Patrimoine = {
  total_eur: number;
  positions_eur: number;
  cash_eur: number;
  accounts: PatrimoineAccount[];
};

export function useTodayDashboard(opts?: { pollMs?: number; limit?: number }) {
  const [opportunities, setOpportunities] = useState<TodayOpportunity[]>([]);
  const [patrimoine, setPatrimoine] = useState<Patrimoine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollMs = opts?.pollMs ?? 60000;
  const limit = opts?.limit ?? 10;

  const fetchOnce = useCallback(async (cancelled?: () => boolean) => {
    try {
      const res = await fetch(`/api/today/dashboard?limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (cancelled?.()) return;
      setOpportunities(json.opportunities || []);
      setPatrimoine(json.patrimoine || null);
      setError(null);
    } catch (err: any) {
      if (cancelled?.()) return;
      setError(err.message || "Fetch error");
    } finally {
      if (!cancelled?.()) setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    let cancelled = false;

    fetchOnce(() => cancelled);
    const id = setInterval(() => fetchOnce(() => cancelled), pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fetchOnce, pollMs]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchOnce();
  }, [fetchOnce]);

  return { opportunities, patrimoine, loading, error, refetch };
}
