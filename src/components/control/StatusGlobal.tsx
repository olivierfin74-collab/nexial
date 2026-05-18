import type { CSSProperties } from 'react'
import type { ControlCenterSummary } from '@/lib/control/types'
import { humanizeReason, normalizeStatus, statusLabels } from '@/lib/control/wording'
import { relativeTime } from '@/lib/control/relativeTime'

interface StatusGlobalProps {
  summary: ControlCenterSummary | null
  now: Date
}

const ICON: Record<ReturnType<typeof normalizeStatus>, string> = {
  HEALTHY: '🟢',
  DEGRADED: '🟠',
  CRITICAL: '🔴',
  BOOTSTRAPPING: '⚪',
  NEUTRAL: '⚪',
}

const BG: Record<ReturnType<typeof normalizeStatus>, string> = {
  HEALTHY: 'rgba(45, 95, 63, 0.06)',
  DEGRADED: 'rgba(184, 134, 11, 0.07)',
  CRITICAL: 'rgba(122, 56, 56, 0.07)',
  BOOTSTRAPPING: 'rgba(0, 0, 0, 0.03)',
  NEUTRAL: 'rgba(0, 0, 0, 0.03)',
}

const BORDER: Record<ReturnType<typeof normalizeStatus>, string> = {
  HEALTHY: 'rgba(45, 95, 63, 0.18)',
  DEGRADED: 'rgba(184, 134, 11, 0.22)',
  CRITICAL: 'rgba(122, 56, 56, 0.22)',
  BOOTSTRAPPING: 'var(--border-subtle)',
  NEUTRAL: 'var(--border-subtle)',
}

const ACCENT: Record<ReturnType<typeof normalizeStatus>, string> = {
  HEALTHY: 'var(--forest-green)',
  DEGRADED: 'var(--amber)',
  CRITICAL: 'var(--burgundy)',
  BOOTSTRAPPING: 'var(--ink-tertiary)',
  NEUTRAL: 'var(--ink-tertiary)',
}

export function StatusGlobal({ summary, now }: StatusGlobalProps) {
  const status = normalizeStatus(summary?.global_status)
  const reason = humanizeReason(summary?.global_reason)

  return (
    <section
      aria-label="Statut global"
      style={{
        background: BG[status],
        border: `1px solid ${BORDER[status]}`,
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>{ICON[status]}</span>
        <span style={{ ...title, color: ACCENT[status] }}>
          {statusLabels[status].toUpperCase()}
        </span>
      </div>
      {reason ? <p style={reasonStyle}>{reason}</p> : null}
      <p style={timestampStyle}>
        Dernière mesure {relativeTime(summary?.computed_at, now)}
      </p>
    </section>
  )
}

const title: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.10em',
}

const reasonStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-serif)',
  fontSize: 16,
  lineHeight: 1.35,
  color: 'var(--ink-primary)',
}

const timestampStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10.5,
  color: 'var(--ink-tertiary)',
  letterSpacing: '0.04em',
}
