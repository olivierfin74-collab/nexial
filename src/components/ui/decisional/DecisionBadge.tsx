import type { Verdict } from '@/types/decision'
import { getColorStyle } from './tones'

interface DecisionBadgeProps {
  verdict: Verdict
  size?: 'sm' | 'md'
}

export function DecisionBadge({ verdict, size = 'md' }: DecisionBadgeProps) {
  const tone = getColorStyle(verdict.color)
  const isSm = size === 'sm'
  return (
    <span
      data-action-code={verdict.action_code}
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
      {verdict.emoji ? <span aria-hidden>{verdict.emoji}</span> : null}
      <span>{verdict.label_fr}</span>
    </span>
  )
}
