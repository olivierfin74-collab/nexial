// TEMP_UI_ONLY — static mock matching the V2 decisional contract.
//
// The production /aujourdhui flow now fetches:
//   - fn_inbox_decisional       → summary + thesis_gap
//   - fn_alerts_decisional_feed_v2 → sections (full V2 items)
//
// This mock is kept only for storybook / dev-tooling and is intentionally
// minimal. Do not import in production paths. The annotation TEMP_UI_ONLY
// is searchable so the file can be removed once stories are wired to the
// canonical fixtures.

import type {
  AlertDecisionPayload,
  DecisionalSections,
  InboxSummary,
  ThesisGap,
} from '@/types/decision'

const MOCK_ITEM: AlertDecisionPayload = {
  alert_id: 'mock-meli-001',
  ticker: 'MELI',
  asset_name: 'MercadoLibre',
  sector: 'Consumer Cyclical',
  asset_class: 'equity',
  is_etf: false,
  created_at: '2026-05-12T07:30:45.157697+00:00',
  status: 'NEW',
  verdict: {
    action_code: 'REVIEW_URGENT',
    label_fr: 'EXAMINER',
    emoji: '🟡',
    color: 'yellow',
    cta_button_fr: 'Revoir ma thèse',
    display_priority: 85,
  },
  explanation: {
    text_fr:
      'Position en chute persistante : vérifiez si votre thèse tient toujours, sinon coupez.',
  },
  position: {
    context_fr: 'Détenue · PnL -4.8% · CTO IBKR',
    is_held: true,
    quantity: 2,
    pnl_pct: -4.83,
    accounts: 'CTO IBKR',
    in_watchlist: true,
  },
  thesis: {
    context_fr: 'Pas de thèse définie',
    conviction_level: 'NEUTRAL',
    thesis_md: null,
  },
  technical: {
    alert_kind_label_fr: 'Tendance baissière dangereuse (DOWNTREND_DANGER)',
    alert_tier: 'CRITIQUE',
    alert_emoji: '⚠️',
    alert_description_fr: 'Chute persistante : revoir la thèse, couper si elle est cassée.',
    opportunity_score: 45.15,
    drawdown_pct: -39.6,
    current_price: 1579.13,
    z2_price: 1848.33,
    z3_price: 1767.96,
    high_52w: 2613.63,
    quality_class: 'PREMIUM',
    sector: 'Consumer Cyclical',
    asset_class: 'equity',
    currency: 'USD',
    market_regime: 'BULL',
    spy_rsi_14: 80.52,
  },
  actions: {
    primary_cta_fr: 'Revoir ma thèse',
    action_code: 'REVIEW_URGENT',
  },
  tier: 'CRITIQUE',
  priority: 85,
  footer: {
    alert_kind_label_fr: 'Tendance baissière dangereuse (DOWNTREND_DANGER)',
    created_at: '2026-05-12T07:30:45.157697+00:00',
    data_source: 'nx.fn_alert_decision_v2',
  },
}

const EMPTY_SECTION = (label_fr: string, description_fr: string, emoji: string) => ({
  label_fr,
  description_fr,
  emoji,
  count: 0,
  items: [] as AlertDecisionPayload[],
})

export const TEMP_UI_ONLY_INBOX_SUMMARY: InboxSummary = {
  as_of: '2026-05-13T11:52:46.039214+00:00',
  mode: 'STANDARD',
  sections_counts: {
    critique_count: 1,
    decisions_count: 0,
    surveillance_count: 0,
    information_count: 0,
  },
  thesis_coverage_pct: '19.2',
  positions_without_thesis_count: '21',
  total_actions_attendues: 1,
}

export const TEMP_UI_ONLY_THESIS_GAP: ThesisGap = {
  label_fr: 'Thèses à définir',
  description_fr: 'Vos positions sans conviction définie',
  emoji: '🎯',
  count: 21,
  coverage_pct: 19.2,
  top_5_missing: [],
}

export const TEMP_UI_ONLY_SECTIONS: DecisionalSections = {
  critique: {
    label_fr: 'Critique',
    description_fr: 'Décisions urgentes',
    emoji: '🚨',
    count: 1,
    items: [MOCK_ITEM],
  },
  decisions_to_handle: EMPTY_SECTION(
    'Décisions à traiter',
    'Actions claires attendues',
    '🎯',
  ),
  surveillance: EMPTY_SECTION('Surveillance', 'Action potentielle plus tard', '👁️'),
  information: EMPTY_SECTION('Pour information', 'Contexte passif, aucune action attendue', 'ℹ️'),
}
