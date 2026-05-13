import type { DecisionThesis } from '@/types/decision'
import { getToneStyle } from './tones'

interface ThesisBadgeProps {
  thesis: DecisionThesis
}

export function ThesisBadge({ thesis }: ThesisBadgeProps) {
  const tone = getToneStyle(thesis.tone)
  return (
    <span
      className="inline-flex items-center"
      style={{
        background: 'transparent',
        color: tone.color,
        border: `1px dashed ${tone.border}`,
        borderRadius: 4,
        padding: '1px 6px',
        fontFamily: 'var(--font-editorial-mono)',
        fontSize: 10,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      {thesis.label}
    </span>
  )
}
