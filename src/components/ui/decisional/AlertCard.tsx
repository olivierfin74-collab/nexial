'use client'

import type { AlertDecisionPayload, DecisionAction } from '@/types/decision'
import { DecisionBadge } from './DecisionBadge'
import { DecisionExplanation } from './DecisionExplanation'
import { PositionContextLine } from './PositionContextLine'
import { TechnicalDetailsToggle } from './TechnicalDetailsToggle'
import { ThesisBadge } from './ThesisBadge'
import { getToneStyle } from './tones'

interface DecisionalAlertCardProps {
  decision: AlertDecisionPayload
  /**
   * Called when the user triggers a backend-provided action. Receives the
   * raw intent key so the upstream handler can dispatch the right RPC.
   * The card itself never decides what an intent means.
   */
  onAction?: (intent: string, decision: AlertDecisionPayload) => void
}

function actionButtonStyle(action: DecisionAction, primary: boolean): React.CSSProperties {
  const tone = getToneStyle(action.tone)
  if (primary) {
    return {
      background: tone.color,
      color: '#FFFFFF',
      border: `1px solid ${tone.color}`,
      borderRadius: 6,
      padding: '8px 12px',
      fontFamily: 'var(--font-editorial-sans)',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
      flex: '1 1 auto',
    }
  }
  return {
    background: 'transparent',
    color: 'var(--ink-secondary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: '8px 12px',
    fontFamily: 'var(--font-editorial-sans)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  }
}

export function DecisionalAlertCard({ decision, onAction }: DecisionalAlertCardProps) {
  const actions = decision.actions ?? []

  return (
    <article
      className="flex flex-col gap-3 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: 16,
      }}
    >
      {/* 1. Ticker + Verdict (dominant) */}
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
          {decision.thesis ? <ThesisBadge thesis={decision.thesis} /> : null}
        </div>
        <DecisionBadge verdict={decision.verdict} />
      </header>

      {/* 2. Explanation (plain French) */}
      <DecisionExplanation explanation={decision.explanation} />

      {/* 3. Position context */}
      <PositionContextLine position={decision.position} />

      {/* 4. Technical details — collapsed by default */}
      {decision.technical && decision.technical.length > 0 ? (
        <TechnicalDetailsToggle details={decision.technical} />
      ) : null}

      {/* CTAs — backend-defined, no client-side intent logic */}
      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {actions.map((action, idx) => {
            const primary = idx === 0
            return (
              <button
                key={`${action.intent}-${idx}`}
                type="button"
                onClick={() => onAction?.(action.intent, decision)}
                className="transition-colors duration-150"
                style={actionButtonStyle(action, primary)}
              >
                {action.label}
              </button>
            )
          })}
        </div>
      ) : null}

      {/* Footer (free text from backend) */}
      {decision.footer ? (
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
          {decision.footer}
        </div>
      ) : null}
    </article>
  )
}
