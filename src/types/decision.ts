// Backend contract for decisional RPCs.
// Source of truth: Supabase project kttdmeyrhndufymgoxqk (PROD).
//
// Two payload shapes ship from the backend:
//
//   FULL (AlertDecisionPayload) — produced by:
//     - fn_alert_decision_v2     (single alert detail)
//     - fn_alerts_decisional_feed_v2 (feed, items have the full V2 shape)
//
//   LITE (InboxAlertItem) — produced by:
//     - fn_inbox_decisional       (sections.<key>.items are denormalized
//                                   for the inbox view; thesis/position are
//                                   embedded as text inside level_2_explanation)
//
// The frontend NEVER derives verdicts, priorities, tiers or CTAs from raw
// signals/scores. Components are rendering-only and consume the payload
// produced by the backend verbatim.

export type ActionCode =
  | 'BUY' | 'BUY_MORE' | 'BUY_SMALL'
  | 'HOLD' | 'TRIM' | 'SELL'
  | 'IGNORE_HOLD' | 'WATCH' | 'REVIEW_THESIS' | 'REVIEW_URGENT' | 'MONITOR';

export type AlertTier = 'CRITIQUE' | 'ACTION' | 'SURVEILLANCE' | 'INFORMATION';

export type ConvictionLevel =
  | 'CORE_HOLD' | 'STRONG_BUY' | 'BUY_DIPS' | 'NEUTRAL'
  | 'TRIM_ON_RALLY' | 'EXIT_ON_RALLY' | 'EXIT_NOW';

export type AssetClass = 'equity' | 'etf' | 'macro_index';

export type ExperienceMode = 'BEGINNER' | 'STANDARD' | 'PRO';

export type AlertStatus = 'NEW' | 'SEEN' | 'DISMISSED' | 'EXPIRED' | 'EXECUTED';

export type MarketRegime = 'BULL' | 'BEAR' | 'NEUTRAL' | 'VOLATILE';

// Backend may ship 'neutral' (lowercase) in addition to the named palette.
export type VerdictColor =
  | 'green' | 'blue' | 'gray' | 'yellow' | 'red' | 'lightgreen' | 'neutral';

// ════════════════════════════════════════════════════════
// VERDICT (level 1)
// ════════════════════════════════════════════════════════
export interface Verdict {
  action_code: ActionCode;
  label_fr: string;
  emoji: string;
  color: VerdictColor;
  cta_button_fr: string | null;
  display_priority: number;
}

// ════════════════════════════════════════════════════════
// EXPLANATION (level 2) — FULL shape (feed_v2 / detail)
// ════════════════════════════════════════════════════════
export interface Explanation {
  text_fr: string;
}

// LITE shape: the inbox RPC embeds thesis/position context as free text
// inside the explanation instead of shipping separate objects.
export interface InboxLevel2Explanation {
  text_fr: string;
  thesis_context_fr: string;
  position_context_fr: string;
}

// ════════════════════════════════════════════════════════
// POSITION (context utilisateur)
// ════════════════════════════════════════════════════════
export interface Position {
  context_fr: string;
  is_held: boolean;
  quantity: number | null;
  pnl_pct: number | null;
  accounts: string | null;
  in_watchlist: boolean;
}

// ════════════════════════════════════════════════════════
// THESIS (conviction utilisateur)
// ════════════════════════════════════════════════════════
export interface Thesis {
  context_fr: string;
  conviction_level: ConvictionLevel;
  thesis_md: string | null;
}

// ════════════════════════════════════════════════════════
// TECHNICAL (level 3)
// ════════════════════════════════════════════════════════
export interface Technical {
  alert_kind_label_fr: string;
  alert_tier: AlertTier;
  alert_emoji: string;
  alert_description_fr: string;
  opportunity_score: number;
  drawdown_pct: number | null;
  current_price: number | null;
  z2_price: number | null;
  z3_price: number | null;
  high_52w: number | null;
  quality_class: string;
  sector: string | null;
  asset_class: AssetClass;
  currency: string;
  market_regime: MarketRegime;
  spy_rsi_14: number | null;
}

// ════════════════════════════════════════════════════════
// ACTIONS (CTAs)
// ════════════════════════════════════════════════════════
export interface Actions {
  primary_cta_fr: string | null;
  action_code: ActionCode;
}

// ════════════════════════════════════════════════════════
// FOOTER (meta)
// ════════════════════════════════════════════════════════
export interface Footer {
  alert_kind_label_fr: string;
  created_at: string;
  data_source: 'nx.fn_alert_decision_v2';
}

// ════════════════════════════════════════════════════════
// MAIN PAYLOAD (fn_alert_decision_v2, fn_alerts_decisional_feed_v2.items)
// ════════════════════════════════════════════════════════
export interface AlertDecisionPayload {
  alert_id: string;
  ticker: string;
  asset_name: string;
  sector: string | null;
  asset_class: AssetClass;
  is_etf: boolean;
  created_at: string;
  status: AlertStatus;

  verdict: Verdict;
  explanation: Explanation;
  position: Position;
  thesis: Thesis;
  technical: Technical;
  actions: Actions;

  tier: AlertTier;
  priority: number;
  footer: Footer;
}

// ════════════════════════════════════════════════════════
// FEED PAYLOAD (fn_alerts_decisional_feed_v2)
// ════════════════════════════════════════════════════════
export interface DecisionalSection {
  label_fr: string;
  description_fr: string;
  emoji: string;
  count: number;
  items: AlertDecisionPayload[];
}

export interface DecisionalSections {
  critique: DecisionalSection;
  decisions_to_handle: DecisionalSection;
  surveillance: DecisionalSection;
  information: DecisionalSection;
}

export type DecisionalSectionKey = keyof DecisionalSections;

export const DECISIONAL_SECTION_KEYS: DecisionalSectionKey[] = [
  'critique',
  'decisions_to_handle',
  'surveillance',
  'information',
];

export interface DecisionalFeedSummary {
  critique_count: number;
  decisions_count: number;
  surveillance_count: number;
  information_count: number;
}

export interface DecisionalFeedPayload {
  as_of: string;
  user_id: string;
  experience_mode: ExperienceMode;
  total_alerts: number;
  max_per_section_applied: number;
  dedup_by_ticker: boolean;
  sections: DecisionalSections;
  summary: DecisionalFeedSummary;
}

// ════════════════════════════════════════════════════════
// INBOX PAYLOAD (fn_inbox_decisional)
// LITE items shape — thesis/position embedded as text in level_2_explanation.
// ════════════════════════════════════════════════════════
export interface InboxAlertItem {
  alert_id: string;
  ticker: string;
  asset_name: string;
  sector: string | null;
  asset_class: AssetClass;
  is_etf: boolean;
  created_at: string;
  status: AlertStatus;

  level_1_verdict: Verdict;
  level_2_explanation: InboxLevel2Explanation;
  level_3_technical: Technical;
}

export interface InboxDecisionalSection {
  label_fr: string;
  description_fr: string;
  emoji: string;
  count: number;
  items: InboxAlertItem[];
}

export interface InboxDecisionalSections {
  critique: InboxDecisionalSection;
  decisions_to_handle: InboxDecisionalSection;
  surveillance: InboxDecisionalSection;
  information: InboxDecisionalSection;
}

export interface ThesisGapTopMissing {
  asset_id: string;
  ticker: string;
  asset_name: string;
  sector: string | null;
  quality_class: string;
  value_eur: number;
  weight_pct: number;
  pnl_pct: number | null;
  suggested_conviction: ConvictionLevel;
  suggestion_rationale_fr: string;
}

export interface ThesisGap {
  label_fr: string;
  description_fr: string;
  emoji: string;
  count: number;
  coverage_pct: number;
  top_5_missing: ThesisGapTopMissing[];
}

// Backend serializes Postgres NUMERIC as JSON string for some fields.
export interface InboxSummary {
  as_of: string;
  mode: ExperienceMode;
  sections_counts: DecisionalFeedSummary;
  thesis_coverage_pct: number | string;
  positions_without_thesis_count: number | string;
  total_actions_attendues: number;
}

export interface InboxPayload {
  as_of: string;
  user_id: string;
  experience_mode: ExperienceMode;
  summary: InboxSummary;
  sections: InboxDecisionalSections;
  thesis_gap: ThesisGap;
}

// ════════════════════════════════════════════════════════
// POSITIONS WITHOUT THESIS (fn_positions_without_thesis)
// ════════════════════════════════════════════════════════
export interface PositionsWithoutThesisPayload {
  as_of: string;
  user_id: string;
  missing_thesis: ThesisGapTopMissing[];
  total_positions: number;
  thesis_coverage_pct: number;
  positions_with_thesis: number;
  positions_without_thesis: number;
}

// ════════════════════════════════════════════════════════
// THESIS REVIEW (fn_review_thesis_for_position)
// ════════════════════════════════════════════════════════
export interface ThesisReviewAsset {
  id: string;
  name: string;
  sector: string | null;
  ticker: string;
  currency: string;
  pea_eligible: boolean;
}

export interface ThesisReviewPosition {
  is_held: boolean;
  pnl_pct: number | null;
  accounts: string | null;
  avg_cost: number | null;
  quantity: number | null;
  value_eur: number | null;
}

export interface ThesisReviewQuality {
  class: string;
  rationale: string;
  multiplier: number;
}

export interface ThesisReviewSignal {
  signal: string;
  z2_price: number | null;
  z3_price: number | null;
  drawdown_pct: number | null;
  current_price: number | null;
}

export interface ThesisReviewHistoryEntry {
  conviction_level: ConvictionLevel;
  effective_from: string;
  effective_to: string | null;
}

export interface ThesisReviewRecentAlert {
  kind: string;
  score: number | null;
  created_at: string;
}

export interface AvailableConviction {
  code: ConvictionLevel;
  label_fr: string;
  description_fr: string;
}

export interface ThesisReviewPayload {
  asset: ThesisReviewAsset;
  history: ThesisReviewHistoryEntry[];
  quality: ThesisReviewQuality;
  position: ThesisReviewPosition;
  recent_alerts: ThesisReviewRecentAlert[];
  current_signal: ThesisReviewSignal;
  current_thesis: { conviction_level: ConvictionLevel; thesis_md: string | null } | null;
  suggested_conviction: ConvictionLevel;
  available_convictions: AvailableConviction[];
}

// ════════════════════════════════════════════════════════
// WORDING DICTIONARY (fn_get_wording_dictionary)
// ════════════════════════════════════════════════════════
export interface WordingMapping {
  context: string;
  new_term: string;
  old_term: string;
  rationale: string;
  applies_to: string[];
}

export interface WordingDictionaryPayload {
  as_of: string;
  mappings: WordingMapping[];
  total_terms: number;
}

// ════════════════════════════════════════════════════════
// UI CAPABILITIES (fn_user_ui_capabilities)
// ════════════════════════════════════════════════════════
export interface UiCapabilities {
  show_level_3_technical: boolean;
  expand_level_3_by_default: boolean;
  show_z2_z3_zones: boolean;
  show_thesis_editor: boolean;
  telegram_decisional_format: boolean;
  [key: string]: boolean;
}

export interface UiWordingRules {
  use_french_first: boolean;
  always_bilingual_technical_terms: boolean;
  [key: string]: boolean;
}

export interface UserUiCapabilitiesPayload {
  experience_mode: ExperienceMode;
  capabilities: UiCapabilities;
  wording_rules: UiWordingRules;
  features_disabled?: string[];
}

export const DEFAULT_UI_CAPABILITIES: UserUiCapabilitiesPayload = {
  experience_mode: 'STANDARD',
  capabilities: {
    show_level_3_technical: true,
    expand_level_3_by_default: false,
    show_z2_z3_zones: false,
    show_thesis_editor: true,
    telegram_decisional_format: true,
  },
  wording_rules: {
    use_french_first: true,
    always_bilingual_technical_terms: true,
  },
  features_disabled: [],
};

// ════════════════════════════════════════════════════════
// TELEGRAM DECISIONAL MESSAGE (fn_telegram_decisional_message)
// ════════════════════════════════════════════════════════
export interface TelegramDecisionalMessagePayload {
  ok: boolean;
  alert_id: string;
  ticker: string;
  action_code: ActionCode;
  verdict_label_fr: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
  message_text: string;
  deeplink_url: string;
  deeplink_label_fr: string;
  parse_mode: 'Markdown';
}

// ════════════════════════════════════════════════════════
// SUPABASE RPC SIGNATURES
// ════════════════════════════════════════════════════════
export type SupabaseRpcSignatures = {
  fn_alert_decision_v2: {
    Args: { p_alert_id: string };
    Returns: AlertDecisionPayload;
  };
  fn_alerts_decisional_feed_v2: {
    Args: {
      p_user_id?: string;
      p_limit?: number;
      p_experience_mode?: ExperienceMode;
      p_only_active?: boolean;
      p_dedup_by_ticker?: boolean;
    };
    Returns: DecisionalFeedPayload;
  };
  fn_inbox_decisional: {
    Args: {
      p_user_id?: string;
      p_experience_mode?: ExperienceMode;
      p_limit?: number;
    };
    Returns: InboxPayload;
  };
  fn_review_thesis_for_position: {
    Args: { p_asset_id: string; p_user_id?: string };
    Returns: ThesisReviewPayload;
  };
  fn_positions_without_thesis: {
    Args: { p_user_id?: string };
    Returns: PositionsWithoutThesisPayload;
  };
  fn_set_position_thesis: {
    Args: {
      p_user_id: string;
      p_asset_id: string;
      p_conviction_level: ConvictionLevel;
      p_thesis_md?: string;
      p_exit_target_price?: number;
      p_exit_target_pnl_pct?: number;
    };
    Returns: unknown;
  };
  fn_user_ui_capabilities: {
    Args: { p_user_id?: string };
    Returns: UserUiCapabilitiesPayload;
  };
  fn_get_wording_dictionary: {
    Args: { p_context?: string };
    Returns: WordingDictionaryPayload;
  };
  fn_telegram_decisional_message: {
    Args: { p_alert_id: string; p_base_url?: string };
    Returns: TelegramDecisionalMessagePayload;
  };
};
