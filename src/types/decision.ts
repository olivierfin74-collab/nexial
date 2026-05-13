// Decisional UX contract — render-only types for the frontend.
//
// Source of truth: backend RPCs
//   - fn_alert_decision_message
//   - fn_alerts_decisional_feed
//
// The frontend MUST NOT derive verdicts, priorities, tiers or CTAs from raw
// signals/scores. Every field below is expected to be produced by the backend
// and rendered verbatim. Components consuming this contract are pure
// presentational.

/** Visual tone — backend-provided, used to pick semantic colors only. */
export type DecisionTone = 'good' | 'warn' | 'bad' | 'info' | 'neutral'

/** Tier of importance — backend-provided. */
export type DecisionTier = 'critical' | 'high' | 'medium' | 'low' | 'info'

/** Verdict block — short label, tone, optional sublabel. */
export interface DecisionVerdict {
  /** Short human-readable verdict, e.g. "À acheter", "À surveiller". */
  label: string
  tone: DecisionTone
  /** Optional secondary line, e.g. "Plan d'entrée à confirmer". */
  sublabel?: string | null
}

/** Plain-language explanation block. */
export interface DecisionExplanationPayload {
  /** Single short sentence, French, no jargon. */
  summary: string
  /** Optional 2nd line for context. */
  detail?: string | null
}

/** Position context — backend-derived, never recomputed by the frontend. */
export interface DecisionPositionContext {
  in_portfolio: boolean
  /** Free text from backend, e.g. "En portefeuille · 12 parts · +3,2%". */
  message?: string | null
}

/** Technical details — kept folded by default, displayed as-is. */
export interface DecisionTechnicalDetail {
  label: string
  value: string
  /** Optional tone for the value chip. */
  tone?: DecisionTone | null
}

/** Optional CTA, backend-provided (label + intent + href/payload key). */
export interface DecisionAction {
  /** Backend-defined intent key, e.g. "validate_plan", "snooze", "dismiss". */
  intent: string
  label: string
  tone?: DecisionTone | null
  href?: string | null
}

/** Thesis tag — backend-provided strategic tag (e.g. "Qualité durable"). */
export interface DecisionThesis {
  label: string
  tone?: DecisionTone | null
}

/**
 * Decisional payload — the unique shape consumed by decisional UI components.
 *
 * Maps to a row of fn_alerts_decisional_feed / output of fn_alert_decision_message.
 * The frontend renders this verbatim — no derived state.
 */
export interface AlertDecisionPayload {
  id: string
  ticker: string
  tier: DecisionTier
  /** Stable ordering hint from the backend. Smaller = higher priority. */
  priority?: number | null

  verdict: DecisionVerdict
  explanation: DecisionExplanationPayload
  position: DecisionPositionContext
  thesis?: DecisionThesis | null

  /** Technical details — shown only when the user expands the toggle. */
  technical?: DecisionTechnicalDetail[] | null

  /** Optional CTAs — rendered in order; intents handled upstream. */
  actions?: DecisionAction[] | null

  /** Optional footer hint, e.g. "Créée il y a 3h · Expire dans 21h". */
  footer?: string | null
}
