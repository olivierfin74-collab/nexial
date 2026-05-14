// Render-only card for fn_decisions_to_handle.
// Pure presentational. No metier mapping, no fetch, no derivation.
//
// Visual contract (NEXIAL MOBILE v3.0.4):
//   - Max 3 decisions visible
//   - No tier enum, no score, no alert_kind, no raw payload surfaced
//   - Tier drives a soft left-border accent only
//   - Verdict label + ticker dominant, single backend-provided CTA
//   - Empty state is calm: "Aucune décision prioritaire pour le moment."
//   - Overflow shown as a discrete link only (Voir … autres alertes).

import type {
  DecisionsToHandlePayload,
  DecisionToHandleItem,
} from '@/types/nexial-v3'

interface DecisionsToHandleCardProps {
  payload: DecisionsToHandlePayload | null
  loading?: boolean
  error?: string | null
  /** Max number of decisions to render in the preview (default 3). */
  maxVisible?: number
  onItemCta?: (item: DecisionToHandleItem) => void
  onOverflow?: (payload: DecisionsToHandlePayload) => void
}

interface TierAccent {
  border: string
  soft: string
}

function tierAccent(tier: string | undefined): TierAccent {
  switch (tier) {
    case 'CRITIQUE':
      return { border: 'var(--burgundy)', soft: 'rgba(95,34,34,0.06)' }
    case 'ACTION':
      return { border: 'var(--forest-green)', soft: 'rgba(31,74,46,0.05)' }
    case 'SURVEILLANCE':
      return { border: '#8B6914', soft: 'rgba(139,105,20,0.05)' }
    case 'INFORMATION':
    default:
      return { border: 'var(--border-subtle)', soft: 'transparent' }
  }
}

export function DecisionsToHandleCard({
  payload,
  loading = false,
  error = null,
  maxVisible = 3,
  onItemCta,
  onOverflow,
}: DecisionsToHandleCardProps) {
  const ceiling = Math.max(0, maxVisible)
  const visible = (payload?.top_decisions ?? []).slice(0, ceiling)
  const isReady = !error && !loading && !!payload
  const isEmpty =
    isReady && (visible.length === 0 || payload!.empty_state != null)

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
              lineHeight: 1.4,
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
      ) : !isReady ? (
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
      ) : isEmpty ? (
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            color: 'var(--ink-tertiary)',
            lineHeight: 1.4,
          }}
        >
          Aucune décision prioritaire pour le moment.
        </p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {visible.map((item) => {
            const accent = tierAccent(item.tier)
            return (
              <li
                key={item.alert_id || `${item.ticker}-${item.rank}`}
                data-tier={item.tier}
                style={{
                  background: accent.soft,
                  border: '1px solid var(--border-subtle)',
                  borderLeft: `3px solid ${accent.border}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
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
                      fontSize: 12,
                      fontWeight: 700,
                      color: accent.border,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.verdict_label_fr}
                  </span>
                </div>

                <p
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-editorial-sans)',
                    fontSize: 13,
                    color: 'var(--ink-primary)',
                    lineHeight: 1.4,
                  }}
                >
                  {item.headline_fr}
                </p>

                {item.cta ? (
                  <button
                    type="button"
                    onClick={() => onItemCta?.(item)}
                    style={{
                      alignSelf: 'flex-start',
                      minHeight: 36,
                      borderRadius: 8,
                      padding: '8px 12px',
                      marginTop: 2,
                      fontFamily: 'var(--font-editorial-sans)',
                      fontSize: 12,
                      fontWeight: 600,
                      background: 'transparent',
                      color: accent.border,
                      border: `1px solid ${accent.border}`,
                      cursor: 'pointer',
                    }}
                  >
                    {item.cta.label_fr}
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {isReady &&
      !isEmpty &&
      payload?.overflow_link &&
      payload.overflow_link.count > 0 ? (
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
          {payload.overflow_link.count > 1
            ? `Voir les ${payload.overflow_link.count} autres alertes`
            : 'Voir 1 autre alerte'}
        </button>
      ) : null}
    </section>
  )
}
