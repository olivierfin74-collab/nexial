'use client'

import type { AlertDecisionPayload } from '@/types/decision'
import { DecisionBadge } from './DecisionBadge'
import { DecisionExplanation } from './DecisionExplanation'
import { PositionContextLine } from './PositionContextLine'
import { TechnicalDetailsToggle } from './TechnicalDetailsToggle'
import { ThesisBadge } from './ThesisBadge'
import { getColorStyle } from './tones'

interface DecisionalAlertCardProps {
  decision: AlertDecisionPayload
  /**
   * Called when the user triggers the backend-provided CTA. The raw
   * `action_code` is forwarded so the upstream handler can dispatch the
   * right RPC. The card itself NEVER decides what an action_code means.
   */
  onAction?: (actionCode: string, decision: AlertDecisionPayload) => void
}

export function DecisionalAlertCard({ decision, onAction }: DecisionalAlertCardProps) {
  const { verdict, explanation, position, thesis, technical, actions, footer, tier } = decision
  const tone = getColorStyle(verdict.color)
  const ctaLabel = actions?.primary_cta_fr ?? verdict.cta_button_fr

  return (
    <article
      data-tier={tier}
      data-action-code={verdict.action_code}
      className="flex flex-col gap-3 p-4 sm:p-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
      }}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--ink-primary)',
            }}
          >
            {decision.ticker}
          </span>
          <ThesisBadge thesis={thesis} />
        </div>
        <DecisionBadge verdict={verdict} />
      </header>

      <DecisionExplanation explanation={explanation} />

      <PositionContextLine position={position} />

      <TechnicalDetailsToggle technical={technical} />

      {ctaLabel ? (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => onAction?.(actions.action_code, decision)}
            className="transition-colors duration-150 w-full sm:w-auto"
            style={{
              minHeight: 44,
              borderRadius: 8,
              padding: '10px 14px',
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: tone.color,
              color: '#FFFFFF',
              border: `1px solid ${tone.color}`,
            }}
          >
            {ctaLabel}
          </button>
        </div>
      ) : null}

      {footer ? (
        <div
          style={{
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 10,
            color: 'var(--ink-muted)',
            letterSpacing: '0.03em',
            paddingTop: 4,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {footer.alert_kind_label_fr}
        </div>
      ) : null}
    </article>
  )
}
