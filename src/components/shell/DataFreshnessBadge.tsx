'use client'

// Discreet data-freshness pill sourced from fn_dashboard_header.data_freshness.
// Pure presentational. The wording is rendered verbatim — the frontend
// never invents a label. Three observed backend statuses (FRESH /
// DELAYED / STALE) drive only the dot color; everything else stays
// neutral so the badge never reads as an alert when the market is
// merely closed.

interface DataFreshnessBadgeProps {
  status: string
  labelFr: string
}

function dotColor(status: string): string {
  switch (status) {
    case 'FRESH':
      return 'var(--forest-green)'
    case 'DELAYED':
      return 'var(--ink-tertiary)'
    case 'STALE':
      return '#B8860B' // amber doux — signal sans alerte
    default:
      return 'var(--ink-tertiary)'
  }
}

function textColor(status: string): string {
  switch (status) {
    case 'FRESH':
      return 'var(--forest-green)'
    case 'STALE':
      return '#8B6914'
    case 'DELAYED':
    default:
      return 'var(--ink-secondary)'
  }
}

export function DataFreshnessBadge({ status, labelFr }: DataFreshnessBadgeProps) {
  return (
    <span
      data-shell="DataFreshnessBadge"
      data-status={status}
      aria-label={labelFr}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 8px',
        borderRadius: 999,
        background: 'rgba(0,0,0,0.03)',
        border: '1px solid var(--border-subtle)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: dotColor(status),
          display: 'inline-block',
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 11,
          fontWeight: 500,
          color: textColor(status),
        }}
      >
        {labelFr}
      </span>
    </span>
  )
}
