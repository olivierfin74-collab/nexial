'use client'

// Unified mobile top header used across every v3 surface
// (Aujourd'hui, Sniper, etc.). Pure presentational. Mounts the
// notification bell and the build-version badge so every screen ships
// the same diagnostic context for Olivier.

import NotificationBellPanel from '@/components/NotificationBellPanel'
import { MobileVersionBadge } from './MobileVersionBadge'

interface MobileTopHeaderProps {
  /** Eyebrow above the title (e.g. "Tableau de bord"). */
  eyebrow?: string
  /** Main title, serif typo. */
  title: string
  /** Optional subtitle line under the title. */
  subtitle?: string
  /** Optional secondary line (e.g. market label, deploy date). */
  contextLine?: string
  /** Show the loud version badge for operator validation. */
  loudVersion?: boolean
  /** Show the bell. Defaults true. */
  showBell?: boolean
}

export function MobileTopHeader({
  eyebrow,
  title,
  subtitle,
  contextLine,
  loudVersion = true,
  showBell = true,
}: MobileTopHeaderProps) {
  return (
    <header
      data-shell="MobileTopHeader"
      style={{
        padding: '20px 16px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {eyebrow ? (
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
        ) : null}
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-serif)',
            fontSize: 28,
            fontWeight: 500,
            color: 'var(--forest-deep)',
            letterSpacing: 'var(--tracking-display)',
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              color: 'var(--ink-secondary)',
              lineHeight: 1.35,
            }}
          >
            {subtitle}
          </p>
        ) : null}
        {contextLine ? (
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 12,
              color: 'var(--ink-tertiary)',
            }}
          >
            {contextLine}
          </p>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <MobileVersionBadge variant={loudVersion ? 'loud' : 'header'} />
        {showBell ? <NotificationBellPanel compact /> : null}
      </div>
    </header>
  )
}
