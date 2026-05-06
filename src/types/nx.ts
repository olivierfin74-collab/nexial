// ADR-1 (architecture nx.*) — typed bindings for the Next.js client.
// MVP P2.3: only types needed by the page Aujourd'hui vertical slice.
// To be extended in P3.x as more nx.* RPCs/views are wired.

export type SignalClassification =
  | 'BUY_ZONE'
  | 'HOT_PULLBACK'
  | 'WATCH_PULLBACK'
  | 'TOO_EXPENSIVE'
  | 'INSUFFICIENT_DATA'

export type PricingMode = 'auto' | 'manual' | 'unknown'

export type FreshnessStatus = 'green' | 'yellow' | 'red' | 'gray'

// Permissive on MVP: nx.currency enum contains EUR/USD/CHF/DKK/GBP/SEK/NOK + others.
// Tighten in P3.x via explicit union or generated type.
export type Currency = string

export interface SignalDashboardRow {
  asset_id: string
  ticker: string
  currency: Currency
  exchange_region: string | null
  exchange_mic: string | null
  pricing_mode: PricingMode
  current_price: number | null
  high_52w: number | null
  drawdown_from_high_pct: number | null
  z1_price: number | null
  z2_price: number | null
  z3_price: number | null
  distance_to_z1_pct: number | null
  distance_to_z2_pct: number | null
  distance_to_z3_pct: number | null
  signal: SignalClassification
  opportunity_score: number | null
  perf_1d_pct: number | null
  perf_1w_pct: number | null
  perf_1m_pct: number | null
  perf_3m_pct: number | null
  perf_6m_pct: number | null
  days_available: number
  in_portfolio: boolean
  held_quantity: number | null
  total_invested: number | null
  current_market_value: number | null
  pnl_pct: number | null
  brokers: string[] | null
  account_kinds: string[] | null
  freshness_status: FreshnessStatus
  pricing_action_required: string | null
}

export interface SignalDashboardParams {
  p_signal_filter?: SignalClassification | null
  p_in_portfolio_only?: boolean
  p_min_score?: number | null
}
