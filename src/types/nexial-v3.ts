// Nexial v3 backend contracts — render-only types consumed by the
// mobile v3 surface (preview + future production cards).
//
// Source RPCs (PROD project kttdmeyrhndufymgoxqk, schema nx):
//   fn_focus_today           → FocusTodayPayload
//   fn_decisions_to_handle   → DecisionsToHandlePayload
//   fn_sniper_dashboard      → SniperDashboardPayload
//   fn_todo_list             → TodoListPayload
//
// The frontend NEVER recomputes a verdict, ranking, score or CTA. All
// labels are FR-first from the backend (`*_fr` fields). Fields not
// observed in the documented samples are typed as optional and tagged
// `unknown` — never invent a shape.

export type RedirectKind =
  | 'open_ladder_modal'
  | 'open_exit_modal'
  | 'open_thesis_modal'
  | 'open_thesis_modal_urgent'
  | 'refresh_inbox'
  | 'dismiss_confirmed'
  | 'navigate_to_alerts'
  | (string & {}); // backend may add new kinds — render-only fallback

export interface ModalContextProps {
  asset_id?: string | null;
  alert_id?: string | null;
  urgent?: boolean;
  [key: string]: unknown;
}

export interface ModalContext {
  modal_name: string;
  props: ModalContextProps;
}

export interface CtaPayload {
  label_fr: string;
  redirect_kind: RedirectKind;
  modal_context?: ModalContext | null;
  redirect_to?: string | null;
}

export interface VerdictBlock {
  code: string;
  color: string;
  emoji?: string;
  label_fr: string;
}

export interface CompactContext {
  delta_display?: string;
  price_display?: string;
  [key: string]: unknown;
}

// ════════════════════════════════════════════════════════
// fn_focus_today
// ════════════════════════════════════════════════════════
export interface MarketContext {
  state: 'BEFORE_OPEN' | 'EU_OPEN' | 'US_OPEN' | 'CLOSED' | (string & {});
  eu_open: boolean;
  us_open: boolean;
  label_fr: string;
  regime_code: string;
  regime_label_fr: string;
}

export interface FocusTodayItem {
  rank: number;
  ticker: string;
  alert_id: string;
  asset_id: string;
  asset_name_fr: string;
  market_zone: 'EU' | 'US' | 'CRYPTO' | (string & {});
  signal_state: string;
  signal_state_label_fr: string;
  priority_score: number;
  headline_fr: string;
  verdict: VerdictBlock;
  context_compact: CompactContext;
  cta: CtaPayload;
}

export interface FocusTodaySection {
  title_fr: string;
  count: number;
  items: FocusTodayItem[];
}

export interface FocusTodaySections {
  actionable: FocusTodaySection;
  watch_holding: FocusTodaySection;
  watch_opening: FocusTodaySection;
  [key: string]: FocusTodaySection;
}

export interface WatchingDetailsCompact {
  quantity?: number;
  limit_price?: string;
  [key: string]: unknown;
}

export interface WatchingItem {
  ticker: string;
  asset_id: string;
  asset_name_fr: string;
  context_fr: string;
  details_compact?: WatchingDetailsCompact;
}

export interface FocusTodayPayload {
  schema_version: 'v2';
  title_fr: string;
  footer_fr?: string;
  generated_at: string;
  market_context: MarketContext;
  sections: FocusTodaySections;
  priorities: FocusTodayItem[];
  watching: WatchingItem[];
  empty_state?: unknown;
}

// ════════════════════════════════════════════════════════
// fn_decisions_to_handle
// ════════════════════════════════════════════════════════
export interface DecisionToHandleItem {
  rank: number;
  tier: 'CRITIQUE' | 'ACTION' | 'SURVEILLANCE' | 'INFORMATION' | (string & {});
  score: number;
  ticker: string;
  alert_id: string;
  asset_id: string;
  asset_name_fr: string;
  headline_fr: string;
  verdict_code: string;
  verdict_label_fr: string;
  cta: CtaPayload;
}

export interface OverflowLink {
  count: number;
  label_fr: string;
  redirect_kind: RedirectKind;
}

export interface DecisionsToHandlePayload {
  schema_version: 'v2';
  title_fr: string;
  subtitle_fr: string;
  generated_at: string;
  top_decisions: DecisionToHandleItem[];
  total_decisions: number;
  overflow_count: number;
  overflow_link?: OverflowLink | null;
  empty_state?: unknown;
}

// ════════════════════════════════════════════════════════
// fn_sniper_dashboard
// ════════════════════════════════════════════════════════
export interface SniperConviction {
  code: string;
  label_fr: string;
  thesis_md?: string | null;
}

export interface SniperPosition {
  is_held: boolean;
  pnl_pct: number | null;
  avg_cost: number | null;
  quantity: number | null;
  market_value: number | null;
}

export interface SniperSignal {
  z1: number;
  z2: number;
  z3: number;
  zone_mode: 'CLASSIC' | 'ADAPTIVE_DEEP' | (string & {});
  zone_mode_label_fr: string;
  drawdown_pct: number;
  current_price: number;
  distance_color: 'green' | 'yellow' | 'red' | 'neutral' | (string & {});
  distance_z2_pct: number;
}

export interface SniperCardSummary {
  color: string;
  summary_line: string;
  distance_text: string;
  price_display: string;
}

export interface SniperActiveOrder {
  order_id: string;
  side: 'buy' | 'sell' | (string & {});
  broker: string;
  status: string;
  currency: string;
  quantity: number;
  limit_price: number;
  distance_pct: number;
}

export interface SniperPriceAlert {
  alert_id?: string;
  trigger_price?: number;
  [key: string]: unknown;
}

export interface SniperTarget {
  target_id?: string;
  zone?: string;
  weight?: number;
  [key: string]: unknown;
}

export type WatchLevel = 'FOCUS' | 'WATCH' | null;

export interface SniperCard {
  ticker: string;
  asset_id: string;
  asset_name: string;
  currency: string;
  pea_eligible: boolean;
  conviction: SniperConviction;
  position: SniperPosition;
  signal: SniperSignal;
  card_summary: SniperCardSummary;
  alerts_count: number;
  orders_count: number;
  sniper_targets_count: number;
  price_alerts: SniperPriceAlert[];
  active_orders: SniperActiveOrder[];
  sniper_targets: SniperTarget[];
  /** Set by fn_set_watch_level. Absent on legacy payloads — default WATCH. */
  watch_level?: WatchLevel;
}

export interface SniperSummary {
  total_count: number;
  in_zone_count: number;
  approaching_count: number;
  total_active_alerts: number;
  total_active_orders: number;
}

export interface SniperDashboardPayload {
  schema_version: 'v2';
  user_id: string;
  generated_at: string;
  summary: SniperSummary;
  snipers: SniperCard[];
}

// ════════════════════════════════════════════════════════
// fn_todo_list
// ════════════════════════════════════════════════════════
export interface TodoItem {
  code: string;
  count?: number;
  severity: 'info' | 'warning' | 'critical' | (string & {});
  title_fr: string;
  subtitle_fr: string;
}

export interface TodoListPayload {
  schema_version: 'v2';
  user_id: string;
  generated_at: string;
  total_count: number;
  items: TodoItem[];
}

// ════════════════════════════════════════════════════════
// fn_focus_assets_list — authoritative list of FOCUS assets
// ════════════════════════════════════════════════════════
export interface FocusAssetPriceTarget {
  sniper_id: string;
  zone_label: string;
  target_price: number;
  target_quantity?: number | null;
  target_amount_eur?: number | null;
  priority: string;
  distance_pct: number;
  has_engagement: boolean;
}

export interface FocusAssetConviction {
  code: string;
  thesis_md?: string | null;
  target_weight_pct?: number | null;
}

export interface FocusAsset {
  ticker: string;
  asset_id: string;
  asset_name: string;
  currency: string;
  pea_eligible: boolean;
  watch_level: 'FOCUS';
  watch_level_set_at: string;
  has_price_target: boolean;
  price_targets_count: number;
  price_targets: FocusAssetPriceTarget[];
  position: SniperPosition;
  conviction: FocusAssetConviction;
  signal: SniperSignal;
}

export interface FocusAssetsSummary {
  total_count: number;
  in_zone_count: number;
  with_price_target_count: number;
  without_price_target_count: number;
}

export interface FocusAssetsListPayload {
  schema_version: 'v2';
  user_id: string;
  generated_at: string;
  summary: FocusAssetsSummary;
  focus_assets: FocusAsset[];
}

// ════════════════════════════════════════════════════════
// fn_dashboard_header — patrimoine recap header
// ════════════════════════════════════════════════════════
export interface DashboardCash {
  display: string;
  total_eur: number;
}

export interface DashboardMarket {
  eu_open: boolean;
  us_open: boolean;
  context_fr: string;
  regime_code: string;
  regime_label_fr: string;
}

export interface DashboardPatrimoine {
  display: string;
  pnl_eur: number;
  pnl_pct: number;
  pnl_display: string;
  invested_eur: number;
  total_value_eur: number;
}

export interface DashboardDataFreshness {
  status: 'FRESH' | 'STALE' | (string & {});
  label_fr: string;
  oldest_quote_age_hours?: number;
}

export interface DashboardHeaderPayload {
  schema_version: 'v2';
  generated_at: string;
  cash: DashboardCash;
  market: DashboardMarket;
  patrimoine: DashboardPatrimoine;
  data_freshness: DashboardDataFreshness;
}

// ════════════════════════════════════════════════════════
// fn_portfolio_cash_breakdown — cash & invested per account
// ════════════════════════════════════════════════════════
export interface PortfolioCashTotals {
  cash_eur: number;
  cash_display: string;
  invested_eur: number;
  invested_display: string;
  patrimoine_eur: number;
}

export interface PortfolioCashAccount {
  account_id: string;
  name: string;
  kind: 'pea' | 'cto' | 'crypto' | (string & {});
  broker: string | null;
  base_currency: string;
  cash_eur: number;
  cash_native: number;
  cash_display: string;
  invested_eur: number;
  invested_display: string;
  total_eur: number;
}

export interface PortfolioCashBreakdownPayload {
  schema_version: 'v2';
  generated_at: string;
  totals: PortfolioCashTotals;
  accounts: PortfolioCashAccount[];
}

// ════════════════════════════════════════════════════════
// fn_portfolio_enriched — positions enriched view
// ════════════════════════════════════════════════════════
export interface PortfolioPositionAccount {
  id: string;
  kind: string;
  name: string;
  broker: string | null;
}

export interface PortfolioPosition {
  asset_id: string;
  ticker: string;
  asset_name: string;
  region?: string;
  sector?: string;
  currency: string;
  quantity: number;
  pru: number;
  last_price: number;
  cost_basis: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  perf_1d_pct?: number;
  perf_1w_pct?: number;
  perf_1m_pct?: number;
  account: PortfolioPositionAccount;
  market_session?: string;
  price_quote_at?: string | null;
  last_trade_at?: string | null;
  first_buy_at?: string | null;
  active_alerts_count?: number;
  // Engine-only fields kept untyped on purpose — the mobile surface
  // does NOT render them.
  [key: string]: unknown;
}

export interface PortfolioEnrichedSummary {
  pnl_eur: number;
  total_eur: number;
  pnl_usd_in_eur?: number;
  total_usd_in_eur?: number;
  positions_count: number;
}

export interface PortfolioEnrichedPayload {
  as_of: string;
  user_id: string;
  account_filter?: string | null;
  summary: PortfolioEnrichedSummary;
  positions: PortfolioPosition[];
}

// ════════════════════════════════════════════════════════
// fn_dashboard_top_opportunities — 30-second view feed
// ════════════════════════════════════════════════════════
export type OpportunityRedirectKind =
  | 'open_ladder_modal'
  | 'navigate_to_asset'
  | 'navigate_to_opportunities'
  | (string & {});

export interface DashboardOpportunityCta {
  label_fr: string;
  redirect_kind: OpportunityRedirectKind;
  /** Loose shape — backend ships either a flat { ticker, asset_id }
   *  (navigate_to_asset) or a nested { modal_name, props: {...} }
   *  (open_ladder_modal). The frontend does not look inside. */
  modal_context?: Record<string, unknown> | null;
}

export interface DashboardOpportunityItem {
  rank: number;
  region: 'EU' | 'US' | (string & {});
  ticker: string;
  asset_id: string;
  asset_name_fr: string;
  sector_fr?: string | null;
  headline_fr: string;
  broker_target?: string | null;
  price_display: string;
  priority_color: 'green' | 'yellow' | 'red' | 'neutral' | (string & {});
  priority_label_fr: string;
  account_label_fr?: string | null;
  context_tags_fr?: string[] | null;
  cta: DashboardOpportunityCta;
}

export interface DashboardOpportunitiesRegionalBalance {
  eu: number;
  us: number;
}

export interface DashboardOpportunitiesEmptyState {
  title_fr?: string;
  message_fr?: string;
  [key: string]: unknown;
}

export interface DashboardTopOpportunitiesPayload {
  schema_version: 'v2';
  generated_at: string;
  market_state: 'OPEN' | 'CLOSED' | 'BEFORE_OPEN' | (string & {});
  market_label_fr: string;
  title_fr: string;
  subtitle_fr: string;
  shown_count: number;
  total_available: number;
  regional_balance: DashboardOpportunitiesRegionalBalance;
  footer_fr: string;
  footer_redirect: OpportunityRedirectKind;
  empty_state: DashboardOpportunitiesEmptyState | null;
  items: DashboardOpportunityItem[];
}

// ════════════════════════════════════════════════════════
// Mutation results — kept permissive: backend may return more fields
// ════════════════════════════════════════════════════════
export interface SetWatchLevelInput {
  asset_id: string;
  watch_level: WatchLevel;
}

export interface SniperTargetInput {
  asset_id: string;
  target_price: number;
  /** Optional — never forced by the UI. */
  target_quantity?: number;
  target_amount_eur?: number;
  zone_label?: string;
  thesis_md?: string;
}

export interface MutationResult {
  ok?: boolean;
  message_fr?: string;
  [key: string]: unknown;
}

// ════════════════════════════════════════════════════════
// Common envelope returned by the /api/mobile/* pass-through routes
// ════════════════════════════════════════════════════════
export type FetchEnvelope<T> = { data: T | null; error?: { code: string; detail?: string } };
