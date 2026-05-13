import type { DecisionVerdict } from '@/types/decision'
import { getToneStyle } from './tones'

interface DecisionBadgeProps {
  verdict: DecisionVerdict
  size?: 'sm' | 'md'
}

export function DecisionBadge({ verdict, size = 'md' }: DecisionBadgeProps) {
  const tone = getToneStyle(verdict.tone)
  const isSm = size === 'sm'
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full"
      style={{
        background: tone.background,
        color: tone.color,
        border: `1px solid ${tone.border}`,
        padding: isSm ? '2px 8px' : '4px 12px',
        fontFamily: 'var(--font-editorial-sans)',
        fontSize: isSm ? 11 : 13,
        fontWeight: 600,
        letterSpacing: '0.01em',
      }}
    >
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: tone.color }} />
      <span>{verdict.label}</span>
      {verdict.sublabel ? (
        <span style={{ opacity: 0.75, fontWeight: 500 }}>· {verdict.sublabel}</span>
      ) : null}
    </span>
  )
}
