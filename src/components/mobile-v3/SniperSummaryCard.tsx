// Render-only summary card for fn_sniper_dashboard.
// Shows the small recap + first N sniper rows. No fetch, no hook.

import type { SniperDashboardPayload } from '@/types/nexial-v3'

interface SniperSummaryCardProps {
  payload: SniperDashboardPayload | null
  loading?: boolean
  error?: string | null
  /** How many snipers to render (default: 4). The full list lives on a
   *  dedicated sniper surface. */
  maxRows?: number
}

function distanceTone(color: string | undefined): string {
  switch (color) {
    case 'green':
      return 'var(--forest-green)'
    case 'yellow':
      return '#8B6914'
    case 'red':
      return 'var(--burgundy)'
    case 'neutral':
    default:
      return 'var(--ink-secondary)'
  }
}

export function SniperSummaryCard({
  payload,
  loading = false,
  error = null,
  maxRows = 4,
}: SniperSummaryCardProps) {
  const rows = payload?.snipers?.slice(0, maxRows) ?? []
  const summary = payload?.summary

  return (
    <section
      data-card="SniperSummaryCard"
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
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
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
          Snipers
        </h2>
        {summary ? (
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 11,
              color: 'var(--ink-tertiary)',
              letterSpacing: '0.03em',
            }}
          >
            {summary.total_count} · {summary.in_zone_count} en zone · {summary.approaching_count} approchent
          </span>
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
      ) : rows.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            color: 'var(--ink-tertiary)',
          }}
        >
          Aucun sniper configuré.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((s) => (
            <li
              key={s.asset_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '6px 0',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-editorial-mono)', fontSize: 12, fontWeight: 800, color: 'var(--ink-primary)' }}>
                  {s.ticker}
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
                  {s.card_summary?.summary_line ?? s.asset_name}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontFamily: 'var(--font-editorial-mono)', fontSize: 12, color: 'var(--ink-primary)' }}>
                  {s.card_summary?.price_display ?? ''}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-editorial-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: distanceTone(s.card_summary?.color),
                  }}
                >
                  {s.card_summary?.distance_text ?? ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
