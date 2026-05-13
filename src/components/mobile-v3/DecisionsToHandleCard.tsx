// Render-only card for fn_decisions_to_handle.
// Pure presentational. No metier mapping, no fetch.

import type {
  DecisionsToHandlePayload,
  DecisionToHandleItem,
} from '@/types/nexial-v3'

interface DecisionsToHandleCardProps {
  payload: DecisionsToHandlePayload | null
  loading?: boolean
  error?: string | null
  onItemCta?: (item: DecisionToHandleItem) => void
  onOverflow?: (payload: DecisionsToHandlePayload) => void
}

function tierColor(tier: string | undefined): string {
  switch (tier) {
    case 'CRITIQUE':
      return 'var(--burgundy)'
    case 'ACTION':
      return 'var(--forest-green)'
    case 'SURVEILLANCE':
      return '#8B6914'
    case 'INFORMATION':
    default:
      return 'var(--ink-secondary)'
  }
}

export function DecisionsToHandleCard({
  payload,
  loading = false,
  error = null,
  onItemCta,
  onOverflow,
}: DecisionsToHandleCardProps) {
  return (
    <section
      data-card="DecisionsToHandleCard"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-serif)',
            fontSize: 18,
            fontWeight: 500,
            color: 'var(--ink-primary)',
            letterSpacing: 'var(--tracking-display)',
          }}
        >
          {payload?.title_fr ?? 'Décisions à traiter'}
        </h2>
        {payload?.subtitle_fr ? (
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 12,
              color: 'var(--ink-secondary)',
            }}
          >
            {payload.subtitle_fr}
          </p>
        ) : null}
      </header>

      {error ? (
        <p
          role="status"
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            color: 'var(--ink-secondary)',
            lineHeight: 1.4,
          }}
        >
          Certaines données n’ont pas pu être mises à jour.
        </p>
      ) : loading || !payload ? (
        <p
          aria-busy="true"
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            color: 'var(--ink-tertiary)',
          }}
        >
          Chargement…
        </p>
      ) : payload.top_decisions.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            color: 'var(--ink-tertiary)',
          }}
        >
          Aucune décision à traiter pour le moment.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {payload.top_decisions.map((item) => (
            <li
              key={item.alert_id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: '8px 0',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-editorial-mono)', fontSize: 13, fontWeight: 800, color: 'var(--ink-primary)' }}>
                  {item.ticker}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-editorial-sans)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: tierColor(item.tier),
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {item.tier}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-editorial-sans)', fontSize: 13, color: 'var(--ink-primary)', lineHeight: 1.4 }}>
                {item.headline_fr}
              </span>
              <span style={{ fontFamily: 'var(--font-editorial-sans)', fontSize: 11, color: 'var(--ink-secondary)' }}>
                {item.verdict_label_fr}
              </span>
              {item.cta ? (
                <button
                  type="button"
                  onClick={() => onItemCta?.(item)}
                  style={{
                    minHeight: 40,
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginTop: 4,
                    fontFamily: 'var(--font-editorial-sans)',
                    fontSize: 12,
                    fontWeight: 600,
                    background: tierColor(item.tier),
                    color: '#FFFFFF',
                    border: `1px solid ${tierColor(item.tier)}`,
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  {item.cta.label_fr}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {payload?.overflow_link && payload.overflow_link.count > 0 ? (
        <button
          type="button"
          onClick={() => onOverflow?.(payload)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            color: 'var(--ink-secondary)',
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          {payload.overflow_link.label_fr}
        </button>
      ) : null}
    </section>
  )
}
