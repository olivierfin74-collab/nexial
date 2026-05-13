// ═══════════════════════════════════════════════════════════════════
// Nexial — Fixtures pour tests Codex
// Source : production Supabase project kttdmeyrhndufymgoxqk
//
// Usage : __fixtures__/canonical-cases.ts dans le repo Codex
//
// Ces UIDs sont les vrais alert_id en prod. Codex peut :
// 1. Les utiliser directement via supabase.rpc('fn_alert_decision_v2', { p_alert_id: ... })
// 2. Ou mocker les payloads pour Storybook/tests offline
// ═══════════════════════════════════════════════════════════════════

import type { AlertDecisionPayload } from '@/types/decision';

export const CANONICAL_ALERT_IDS = {
  ADYEN_ACHETER: '019e13e5-b2ac-789e-97d6-081a331fa4f3',
  ASML_GARDER: '019e1d77-ecb8-7eb2-b05d-bacc78f6544c',
  CAP_IGNORER: '019e13e5-b2b3-72cd-bc79-8e0a0872213d',
  MC_RENFORCER: '019e13e5-b2a5-7275-afd1-91439f4c3c75',
  MELI_EXAMINER: '019e1b18-6ad9-7fda-818e-6bb8ed1834d1',
  PLTR_ACHETER_PETIT: '019e13e5-b2b2-78d2-9096-4d59e0313016',
  RMS_RENFORCER: '019e13e5-b2aa-7ed4-a478-2867102c2521',
  TTE_DEFINIR: '019e1d78-2a8d-7dbc-a9c2-79815a9c135a',
} as const;

// Expectations pour les tests
export const CANONICAL_EXPECTATIONS = [
  {
    ticker: 'ADYEN',
    alert_id: CANONICAL_ALERT_IDS.ADYEN_ACHETER,
    expected_verdict: { label_fr: 'ACHETER', emoji: '🟢', color: 'green', action_code: 'BUY' },
    expected_tier: 'ACTION',
    expected_priority: 10,
    rationale: 'Non détenue, qualité PREMIUM, drawdown -47%, score 80+',
  },
  {
    ticker: 'ASML',
    alert_id: CANONICAL_ALERT_IDS.ASML_GARDER,
    expected_verdict: { label_fr: 'GARDER', emoji: '🔵', color: 'blue', action_code: 'HOLD' },
    expected_tier: 'SURVEILLANCE',
    rationale: 'Position CORE_HOLD, signal mineur WATCH_PULLBACK',
  },
  {
    ticker: 'CAP',
    alert_id: CANONICAL_ALERT_IDS.CAP_IGNORER,
    expected_verdict: { label_fr: 'IGNORER', emoji: '⚪', color: 'gray', action_code: 'IGNORE_HOLD' },
    expected_tier: 'ACTION',
    rationale: 'Thèse EXIT_ON_RALLY respectée même sur BUY_ZONE',
  },
  {
    ticker: 'MC',
    alert_id: CANONICAL_ALERT_IDS.MC_RENFORCER,
    expected_verdict: { label_fr: 'RENFORCER', emoji: '🟢', color: 'green', action_code: 'BUY_MORE' },
    expected_tier: 'ACTION',
    rationale: 'CORE_HOLD luxe + BUY_ZONE = renforcer à prix réduit',
  },
  {
    ticker: 'MELI',
    alert_id: CANONICAL_ALERT_IDS.MELI_EXAMINER,
    expected_verdict: { label_fr: 'EXAMINER', emoji: '🟡', color: 'yellow', action_code: 'REVIEW_URGENT' },
    expected_tier: 'CRITIQUE',
    rationale: 'DOWNTREND_DANGER détecté, thèse à vérifier',
  },
  {
    ticker: 'PLTR',
    alert_id: CANONICAL_ALERT_IDS.PLTR_ACHETER_PETIT,
    expected_verdict: { label_fr: 'ACHETER PETIT', emoji: '🟢', color: 'lightgreen', action_code: 'BUY_SMALL' },
    expected_tier: 'ACTION',
    rationale: 'Non détenue, STANDARD quality (pas PREMIUM), entrée prudente',
  },
  {
    ticker: 'RMS',
    alert_id: CANONICAL_ALERT_IDS.RMS_RENFORCER,
    expected_verdict: { label_fr: 'RENFORCER', emoji: '🟢', color: 'green', action_code: 'BUY_MORE' },
    expected_tier: 'ACTION',
    rationale: 'STRONG_BUY luxe + BUY_ZONE = renforcer activement',
  },
  {
    ticker: 'TTE',
    alert_id: CANONICAL_ALERT_IDS.TTE_DEFINIR,
    expected_verdict: { label_fr: 'DÉFINIR', emoji: '🟡', color: 'yellow', action_code: 'REVIEW_THESIS' },
    expected_tier: 'INFORMATION',
    rationale: 'OVERBOUGHT sans thèse définie, invite à définir conviction',
  },
] as const;

// ═══════════════════════════════════════════════════════════════════
// Mock payloads pour Storybook (à utiliser SI Codex veut tester offline)
// Note : ces snapshots seront périmés. Préférer appel direct prod si possible.
// ═══════════════════════════════════════════════════════════════════

export const MOCK_ADYEN_ACHETER: AlertDecisionPayload = {
  alert_id: CANONICAL_ALERT_IDS.ADYEN_ACHETER,
  ticker: 'ADYEN',
  asset_name: 'Adyen',
  sector: 'Financial Services',
  asset_class: 'equity',
  is_etf: false,
  created_at: '2026-05-10T21:58:01Z',
  status: 'NEW',

  verdict: {
    action_code: 'BUY',
    label_fr: 'ACHETER',
    emoji: '🟢',
    color: 'green',
    cta_button_fr: "Construire mon plan d'entrée",
    display_priority: 10,
  },
  explanation: {
    text_fr: "Compounder de qualité en faiblesse rare : opportunité d'entrée à long terme.",
  },
  position: {
    context_fr: 'Dans votre watchlist',
    is_held: false,
    quantity: null,
    pnl_pct: null,
    accounts: null,
    in_watchlist: true,
  },
  thesis: {
    context_fr: 'Pas de thèse définie',
    conviction_level: 'NEUTRAL',
    thesis_md: null,
  },
  technical: {
    alert_kind_label_fr: "Zone d'achat atteinte (BUY_ZONE_ENTERED)",
    alert_tier: 'ACTION',
    alert_emoji: '🟢',
    alert_description_fr: "Le prix est descendu dans une zone considérée comme attractive pour acheter.",
    opportunity_score: 84,
    drawdown_pct: -47.9,
    current_price: 908.7,
    z2_price: 921.47,
    z3_price: 881.41,
    high_52w: 1744.8,
    quality_class: 'PREMIUM',
    sector: 'Financial Services',
    asset_class: 'equity',
    currency: 'EUR',
    market_regime: 'BULL',
    spy_rsi_14: 80.52,
  },
  actions: {
    primary_cta_fr: "Construire mon plan d'entrée",
    action_code: 'BUY',
  },
  tier: 'ACTION',
  priority: 10,
  footer: {
    alert_kind_label_fr: "Zone d'achat atteinte (BUY_ZONE_ENTERED)",
    created_at: '2026-05-10T21:58:01Z',
    data_source: 'nx.fn_alert_decision_v2',
  },
};

export const MOCK_CAP_IGNORER: AlertDecisionPayload = {
  alert_id: CANONICAL_ALERT_IDS.CAP_IGNORER,
  ticker: 'CAP',
  asset_name: 'Capgemini',
  sector: 'Technology',
  asset_class: 'equity',
  is_etf: false,
  created_at: '2026-05-10T21:58:01Z',
  status: 'NEW',

  verdict: {
    action_code: 'IGNORE_HOLD',
    label_fr: 'IGNORER',
    emoji: '⚪',
    color: 'gray',
    cta_button_fr: null,
    display_priority: 60,
  },
  explanation: {
    text_fr: "Votre thèse est de sortir sur rebond. Ignorez ce signal d'achat, ne renforcez pas.",
  },
  position: {
    context_fr: 'Détenue · PnL -14.6% · PEA',
    is_held: true,
    quantity: 29,
    pnl_pct: -14.58,
    accounts: 'PEA',
    in_watchlist: false,
  },
  thesis: {
    context_fr: 'Thèse : Sortir sur rebond',
    conviction_level: 'EXIT_ON_RALLY',
    thesis_md: 'Capgemini : performance moyenne sur le long terme. Sortir totalement sur rebond.',
  },
  technical: {
    alert_kind_label_fr: "Zone d'achat atteinte (BUY_ZONE_ENTERED)",
    alert_tier: 'ACTION',
    alert_emoji: '🟢',
    alert_description_fr: "Le prix est descendu dans une zone considérée comme attractive pour acheter.",
    opportunity_score: 80.8,
    drawdown_pct: -35.7,
    current_price: 99.20,
    z2_price: 101.75,
    z3_price: 97.33,
    high_52w: 154.3,
    quality_class: 'STANDARD',
    sector: 'Technology',
    asset_class: 'equity',
    currency: 'EUR',
    market_regime: 'BULL',
    spy_rsi_14: 80.52,
  },
  actions: {
    primary_cta_fr: null,
    action_code: 'IGNORE_HOLD',
  },
  tier: 'ACTION',
  priority: 60,
  footer: {
    alert_kind_label_fr: "Zone d'achat atteinte (BUY_ZONE_ENTERED)",
    created_at: '2026-05-10T21:58:01Z',
    data_source: 'nx.fn_alert_decision_v2',
  },
};

// ═══════════════════════════════════════════════════════════════════
// Helper : appel live à la prod
// ═══════════════════════════════════════════════════════════════════

export async function fetchCanonicalDecision(
  supabase: any,
  ticker: keyof typeof CANONICAL_ALERT_IDS,
): Promise<AlertDecisionPayload | null> {
  const alertId = CANONICAL_ALERT_IDS[ticker];
  const { data, error } = await supabase.rpc('fn_alert_decision_v2', {
    p_alert_id: alertId,
  });
  if (error || !data) return null;
  return data as AlertDecisionPayload;
}
