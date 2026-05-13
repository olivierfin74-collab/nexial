// Render-only card for a single FocusTodayItem (fn_focus_today.priorities
// / sections.*.items). No fetch, no hook, no metier logic, no derivation.
// All FR labels come from the backend payload.

import type { FocusTodayItem } from '@/types/nexial-v3'

interface FocusOpportunityCardProps {
  item: FocusTodayItem
  /** Forwarded to the parent. The card never decides what a CTA means. */
  onCta?: (item: FocusTodayItem) => void
}

function verdictColorCss(color: string | undefined): string {
  switch (color) {
    case 'green':
      return 'var(--forest-green)'
    case 'yellow':
      return '#8B6914'
    case 'red':
      return 'var(--burgundy)'
    case 'blue':
      return '#1F4A6E'
    case 'orange':
      return '#8A4B0B'
    case 'gray':
    case 'neutral':
    default:
      return 'var(--ink-secondary)'
  }
}

export function FocusOpportunityCard({ item, onCta }: FocusOpportunityCardProps) {
  const verdictColor = verdictColorCss(item.verdict?.color)

  return (
    <article
      data-card="FocusOpportunityCard"
      data-redirect-kind={item.cta?.redirect_kind ?? ''}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 13,
              fontWeight: 800,
              color: 'var(--ink-primary)',
            }}
          >
            {item.ticker}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 11,
              color: 'var(--ink-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.asset_name_fr}
          </span>
        </div>
        <span
          aria-label={item.verdict?.label_fr}
          style={{
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 11,
            fontWeight: 700,
            color: verdictColor,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            whiteSpace: 'nowrap',
          }}
        >
          {item.verdict?.emoji ? <span aria-hidden>{item.verdict.emoji}</span> : null}
          <span>{item.verdict?.label_fr ?? '—'}</span>
        </span>
      </header>

      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 13,
          lineHeight: 1.4,
          color: 'var(--ink-primary)',
        }}
      >
        {item.headline_fr}
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          fontFamily: 'var(--font-editorial-mono)',
          fontSize: 11,
          color: 'var(--ink-secondary)',
        }}
      >
        {item.context_compact?.price_display ? (
          <span>{item.context_compact.price_display}</span>
        ) : null}
        {item.context_compact?.delta_display ? (
          <span>{item.context_compact.delta_display}</span>
        ) : null}
        {item.signal_state_label_fr ? (
          <span style={{ color: 'var(--ink-tertiary)' }}>{item.signal_state_label_fr}</span>
        ) : null}
      </div>

      {item.cta ? (
        <button
          type="button"
          onClick={() => onCta?.(item)}
          style={{
            minHeight: 44,
            borderRadius: 8,
            padding: '10px 14px',
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 13,
            fontWeight: 600,
            background: verdictColor,
            color: '#FFFFFF',
            border: `1px solid ${verdictColor}`,
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          {item.cta.label_fr}
        </button>
      ) : null}
    </article>
  )
}
