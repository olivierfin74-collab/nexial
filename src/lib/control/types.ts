// Types miroir des vues nx.* exposées via PostgREST.
// Source d'autorité : information_schema.columns au 2026-05-18.

export type ControlStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'BOOTSTRAPPING' | 'NEUTRAL'

export type OfficialControlState =
  | 'HEALTHY'
  | 'ACTION'
  | 'NEEDS_OLIVIER'
  | 'WATCH'
  | 'IN_PROGRESS'
  | 'INFO'
  | 'AUTO_HANDLED'
  | (string & {})

export interface ControlVerdictRow {
  all_clear: boolean | null
  control_state: OfficialControlState | null
  headline: string | null
  headline_fr?: string | null
  detail: string | null
  detail_fr?: string | null
  generated_at: string | null
  computed_at?: string | null
  [key: string]: unknown
}

export interface ControlFeedRow {
  id?: string | number | null
  control_state: OfficialControlState | null
  sort_priority: number | null
  title: string | null
  title_fr?: string | null
  headline?: string | null
  headline_fr?: string | null
  detail: string | null
  detail_fr?: string | null
  source?: string | null
  generated_at?: string | null
  computed_at?: string | null
  [key: string]: unknown
}

export type DataFreshnessFeu = 'GREEN' | 'ORANGE' | 'RED' | (string & {})

export interface ControlDataFreshnessRow {
  categorie: string | null
  cron_name: string | null
  schedule: string | null
  last_data_at: string | null
  next_run_at: string | null
  hours_since: string | number | null
  feu: DataFreshnessFeu | null
}

export interface RecentAdr {
  number: number
  title: string
  status: string
  decided_at: string
}

export interface ControlCenterSummary {
  computed_at: string
  engine_status: string | null
  engine_reason: string | null
  win_rate_d7_pct: string | number | null
  eu_market_status: string | null
  eu_label: string | null
  us_market_status: string | null
  us_label: string | null
  critical_stale_assets: number | null
  warn_stale_assets: number | null
  last_eod_success: string | null
  crons_total_active: number | null
  intraday_active: number | null
  eod_active: number | null
  decisions_total: number | null
  divergence_rate_pct: string | number | null
  divergence_status: string | null
  alerts_generated_7d: number | null
  alert_quality_status: string | null
  recent_adrs: RecentAdr[] | null
  global_status: string | null
  global_reason: string | null
}

export interface EngineHealthCalibrated {
  computed_at: string
  currently_broken: number
  had_hiccups_but_ok: number
  stale_critical: number
  total_crons_active: number
  criticals_open: number
  criticals_7d: number
  warnings_7d: number
  critical_open_kinds: unknown
  win_rate_d7_pct: string | number | null
  total_outcomes: number
  wins_d7: number
  losses_d7: number
  scoring_versions_active: number
  scoring_versions_total: number
  agents_active_7d: number
  agents_active_24h: number
  calibrated_status: string | null
  status_reason: string | null
  legacy_status: string | null
}

export interface DivergenceTrackingKpis {
  computed_at: string
  total_decisions_alltime: number
  total_decisions_30d: number
  total_decisions_7d: number
  agreed_executed: number
  agreed_not_executed: number
  disagreed_ignored: number
  disagreed_contrary: number
  no_nexial_signal: number
  resolved_d5: number
  pending_outcome: number
  nexial_right_loss_avoided: number
  nexial_wrong_gain_missed: number
  nexial_right_gain_missed: number
  nexial_wrong_loss_avoided: number
  neutral: number
  pending_d5: number
  distinct_sessions_alltime: number
  distinct_sessions_7d: number
  last_session_tag: string | null
  last_session_at: string | null
  divergence_rate_pct: string | number | null
  resolution_rate_pct: string | number | null
  tracking_status: string | null
}

export interface AlertQualityKpis {
  computed_at: string
  generated_7d: number
  generated_24h: number
  generated_30d: number
  distinct_tickers_7d: number
  distinct_kinds_7d: number
  done_30d: number
  dismissed_30d: number
  expired_30d: number
  obsolete_30d: number
  open_30d: number
  stale_open_14d: number
  total_30d: number
  actionable_rate_pct: string | number | null
  noise_rate_pct: string | number | null
  total_outcomes: number
  wins_d7: number
  losses_d7: number
  neutral_d7: number
  resolved_d7: number
  resolved_d30: number
  avg_d7_pct: string | number | null
  win_rate_d7_pct: string | number | null
  top_noisy_tickers: unknown
  quality_status: string | null
}

export interface DataFreshnessAlert {
  ticker: string
  exchange_region: string | null
  pricing_mode: string | null
  last_daily_date: string | null
  daily_lag_days: number | null
  live_lag_hours: string | number | null
  freshness_status: string | null
  recommendation: string | null
}

export interface MarketFreshness {
  region: string
  market_status: string | null
  last_update_started_at: string | null
  last_update_completed_at: string | null
  minutes_since_last_update: number | null
  scope_target_assets: number | null
  active_crons: number | null
  ui_freshness_label: string | null
}

export interface CronRunLogRow {
  id: string
  job_name: string
  trigger_source: string | null
  started_at: string
  finished_at: string | null
  duration_ms: number | null
  status: string | null
  http_status: number | null
  rows_affected: number | null
  payload: unknown
  error_message: string | null
  metadata: unknown
}

export interface ArchitectureDecisionRow {
  decision_number: number
  title: string
  status: string
  decided_at: string
  metadata: unknown
}
