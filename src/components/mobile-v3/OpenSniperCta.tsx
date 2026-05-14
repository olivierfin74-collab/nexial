'use client'

// Secondary CTA used on Dashboard and Aujourd'hui to keep /sniper one
// tap away now that it's no longer in the bottom nav. Pure rendering,
// no fetch, no metier logic.

import Link from 'next/link'
import { Target } from 'lucide-react'

interface OpenSniperCtaProps {
  /** Optional override of the default copy. */
  label?: string
  /** Optional helper line under the CTA. */
  helper?: string
}

export function OpenSniperCta({
  label = 'Ouvrir Sniper',
  helper,
}: OpenSniperCtaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Link
        href="/sniper"
        data-cta="open-sniper"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          alignSelf: 'flex-start',
          minHeight: 36,
          borderRadius: 8,
          padding: '8px 12px',
          background: 'transparent',
          color: 'var(--forest-green)',
          border: '1px solid var(--forest-green)',
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 12,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        <Target size={14} aria-hidden />
        <span>{label} →</span>
      </Link>
      {helper ? (
        <span
          style={{
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 11,
            color: 'var(--ink-tertiary)',
            lineHeight: 1.4,
          }}
        >
          {helper}
        </span>
      ) : null}
    </div>
  )
}
