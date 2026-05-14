'use client'

// Discreet build version surfaced on /mobile so Olivier can confirm
// at a glance which deploy is running. Pure presentational — no fetch,
// no env-var leak. The string comes from src/lib/version.ts which is
// inlined at build time by next.config.ts.

import { formatMobileVersion } from '@/lib/version'

interface MobileVersionBadgeProps {
  /** "header" → small text floated top-right; "footer" → grey caption. */
  variant?: 'header' | 'footer'
}

export function MobileVersionBadge({ variant = 'header' }: MobileVersionBadgeProps) {
  const text = formatMobileVersion()
  const isHeader = variant === 'header'
  return (
    <span
      data-version={text}
      aria-label={`Version ${text}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--font-editorial-mono)',
        fontSize: isHeader ? 10 : 11,
        color: 'var(--ink-muted)',
        letterSpacing: '0.04em',
        padding: isHeader ? '2px 6px' : 0,
        borderRadius: isHeader ? 4 : 0,
        background: isHeader ? 'rgba(0,0,0,0.04)' : 'transparent',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  )
}
