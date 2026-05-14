'use client'

// Compact EU / US market status used in the mobile top header.
// Pure presentational. The two boolean flags + the FR regime label
// come directly from fn_dashboard_header.market or
// fn_focus_today.market_context — no derivation.

interface MarketStatusBadgeProps {
  euOpen: boolean
  usOpen: boolean
  regimeLabelFr?: string | null
}

function Dot({ open, label }: { open: boolean; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'var(--font-editorial-mono)',
        fontSize: 10,
        fontWeight: 700,
        color: open ? 'var(--forest-green)' : 'var(--ink-tertiary)',
        letterSpacing: '0.04em',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: open ? 'var(--forest-green)' : 'var(--ink-muted)',
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  )
}

export function MarketStatusBadge({ euOpen, usOpen, regimeLabelFr }: MarketStatusBadgeProps) {
  return (
    <div
      data-shell="MarketStatusBadge"
      aria-label={`Marchés EU ${euOpen ? 'ouvert' : 'fermé'}, US ${usOpen ? 'ouvert' : 'fermé'}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '4px 8px',
        borderRadius: 999,
        background: 'rgba(0,0,0,0.03)',
        border: '1px solid var(--border-subtle)',
        whiteSpace: 'nowrap',
        flexWrap: 'wrap',
      }}
    >
      <Dot open={euOpen} label="EU" />
      <Dot open={usOpen} label="US" />
      {regimeLabelFr ? (
        <span
          style={{
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 11,
            color: 'var(--ink-secondary)',
            fontWeight: 500,
          }}
        >
          · {regimeLabelFr}
        </span>
      ) : null}
    </div>
  )
}
