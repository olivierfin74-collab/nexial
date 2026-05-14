'use client'

// Discreet build version surfaced on /mobile so Olivier can confirm
// at a glance which deploy is running. Pure presentational — no fetch,
// no env-var leak. The string comes from src/lib/version.ts which is
// inlined at build time by next.config.ts.

import { formatMobileVersion } from '@/lib/version'

interface MobileVersionBadgeProps {
  /**
   * - "loud"   → contrasted pill for immediate operator validation
   * - "header" → small mono pill, sits in a top-right header column
   * - "footer" → grey caption, used in AppShell footer slot
   */
  variant?: 'loud' | 'header' | 'footer'
}

export function MobileVersionBadge({ variant = 'header' }: MobileVersionBadgeProps) {
  const text = formatMobileVersion()

  if (variant === 'loud') {
    return (
      <span
        data-version={text}
        aria-label={`Version ${text}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontFamily: 'var(--font-editorial-mono)',
          fontSize: 11,
          fontWeight: 800,
          color: '#FFFFFF',
          background: 'var(--forest-green)',
          border: '1px solid var(--forest-green)',
          letterSpacing: '0.06em',
          padding: '4px 8px',
          borderRadius: 999,
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
        }}
      >
        {text}
      </span>
    )
  }

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
