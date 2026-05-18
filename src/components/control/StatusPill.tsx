import type { CSSProperties } from 'react'
import type { ControlStatus } from '@/lib/control/types'
import { statusLabels } from '@/lib/control/wording'

interface StatusPillProps {
  status: ControlStatus
  label?: string
  size?: 'sm' | 'md'
}

const DOT: Record<ControlStatus, string> = {
  HEALTHY: '🟢',
  DEGRADED: '🟠',
  CRITICAL: '🔴',
  BOOTSTRAPPING: '⚪',
  NEUTRAL: '⚪',
}

const PILL_STYLE: Record<ControlStatus, CSSProperties> = {
  HEALTHY: {
    background: 'rgba(45, 95, 63, 0.10)',
    color: 'var(--forest-green)',
    borderColor: 'rgba(45, 95, 63, 0.18)',
  },
  DEGRADED: {
    background: 'rgba(184, 134, 11, 0.10)',
    color: 'var(--amber)',
    borderColor: 'rgba(184, 134, 11, 0.20)',
  },
  CRITICAL: {
    background: 'rgba(122, 56, 56, 0.12)',
    color: 'var(--burgundy)',
    borderColor: 'rgba(122, 56, 56, 0.22)',
    animation: 'nx-control-pulse 2s ease-in-out infinite',
  },
  BOOTSTRAPPING: {
    background: 'rgba(0, 0, 0, 0.04)',
    color: 'var(--ink-tertiary)',
    borderColor: 'var(--border-subtle)',
  },
  NEUTRAL: {
    background: 'rgba(0, 0, 0, 0.04)',
    color: 'var(--ink-tertiary)',
    borderColor: 'var(--border-subtle)',
  },
}

export function StatusPill({ status, label, size = 'md' }: StatusPillProps) {
  const tone = PILL_STYLE[status]
  const text = label ?? statusLabels[status]
  return (
    <>
      <span
        role="status"
        aria-live="polite"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          minHeight: size === 'sm' ? 22 : 26,
          padding: size === 'sm' ? '0 8px' : '0 10px',
          borderRadius: 999,
          border: `1px solid ${tone.borderColor as string}`,
          background: tone.background,
          color: tone.color,
          fontFamily: 'var(--font-editorial-mono)',
          fontSize: size === 'sm' ? 10 : 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          animation: tone.animation,
        }}
      >
        <span aria-hidden style={{ fontSize: size === 'sm' ? 9 : 10, lineHeight: 1 }}>{DOT[status]}</span>
        <span>{text}</span>
      </span>
      <style>{`@keyframes nx-control-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.7 } }`}</style>
    </>
  )
}
