// Premium-minimal placeholder used by the mobile shell tabs that don't
// have a V2.2 implementation yet (Alertes, Portefeuille, Watchlist).
//
// No data fetching, no RPC call, no metier logic. The shell only confirms
// the section exists and that the work is on the way.

import type { ReactNode } from 'react'
import { AppShell } from './AppShell'

interface PlaceholderPageProps {
  eyebrow: string
  title: string
  message?: string
  children?: ReactNode
}

export function PlaceholderPage({
  eyebrow,
  title,
  message = 'Cette section arrive bientôt.',
  children,
}: PlaceholderPageProps) {
  return (
    <AppShell>
      <div
        className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 md:px-6 md:py-10"
      >
        <span
          style={{
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 10,
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-eyebrow)',
          }}
        >
          {eyebrow}
        </span>
        <h1
          style={{
            fontFamily: 'var(--font-editorial-serif)',
            fontSize: 32,
            fontWeight: 500,
            color: 'var(--forest-deep)',
            margin: 0,
            letterSpacing: 'var(--tracking-display)',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 14,
            color: 'var(--ink-secondary)',
            margin: 0,
            lineHeight: 1.5,
            maxWidth: 480,
          }}
        >
          {message}
        </p>
        {children}
      </div>
    </AppShell>
  )
}
