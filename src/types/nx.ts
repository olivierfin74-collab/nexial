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

// ============================================================================
// Alerts (RPC fn_get_my_active_alerts)
// ============================================================================

export type AlertKind =
  | 'BUY_ZONE_ENTERED'
  | 'HOT_PULLBACK_ENTERED'
  | 'WATCH_PULLBACK_ENTERED'

export type AlertStatus =
  | 'NEW'
  | 'SEEN'
  | 'DISMISSED'
  | 'DONE'
  | 'EXPIRED'

/** Expected DB values: 'still_relevant' | 'fading' | 'expired_window' (kept permissive for forward compat). */
export type RelevanceStatus = string

// ============================================================================
// User profile (RPC public.fn_get_my_profile, table public.profiles)
// ============================================================================

export type UserRole = 'admin' | 'beta' | 'paid' | 'free'

export interface UserProfile {
  id: string
  email: string
  username: string | null
  display_name: string | null
  role: UserRole
  created_at: string
}

export interface AlertRow {
  id: string
  ticker: string
  alert_kind: AlertKind
  status: AlertStatus

  // Snapshot AT creation (figé)
  signal_when_created: SignalClassification | null
  score_when_created: number | null
  price_at_creation: number | null
  drawdown_at_creation: number | null
  z1_at_creation: number | null
  z2_at_creation: number | null
  z3_at_creation: number | null

  // Snapshot NOW (live)
  signal_now: SignalClassification | null
  score_now: number | null
  price_now: number | null
  drawdown_now_pct: number | null

  // Évolution depuis l'alerte
  price_change_since_alert_pct: number | null
  score_change_since_alert: number | null
  relevance_status: RelevanceStatus | null

  // Métadonnées temporelles
  age_hours: number | null
  expires_in_hours: number | null

  // Position utilisateur
  in_portfolio: boolean
  held_quantity: number | null

  // Timestamps
  created_at: string
  seen_at: string | null
}
