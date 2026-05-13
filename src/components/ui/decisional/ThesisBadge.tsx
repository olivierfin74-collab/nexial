import type { ConvictionLevel, Thesis } from '@/types/decision'
import { getToneStyle, type DecisionTone } from './tones'

interface ThesisBadgeProps {
  thesis: Thesis
}

/**
 * Backend-defined `conviction_level` → visual tone. Strictly a presentation
 * mapping (no derived decision, no metier logic).
 */
function convictionToTone(level: ConvictionLevel): DecisionTone {
  switch (level) {
    case 'STRONG_BUY':
    case 'BUY_DIPS':
      return 'good'
    case 'CORE_HOLD':
      return 'info'
    case 'NEUTRAL':
      return 'neutral'
    case 'TRIM_ON_RALLY':
    case 'EXIT_ON_RALLY':
      return 'warn'
    case 'EXIT_NOW':
      return 'bad'
    default:
      return 'neutral'
  }
}

export function ThesisBadge({ thesis }: ThesisBadgeProps) {
  if (!thesis?.context_fr) return null
  const tone = getToneStyle(convictionToTone(thesis.conviction_level))
  return (
    <span
      data-conviction={thesis.conviction_level}
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
      {thesis.context_fr}
    </span>
  )
}
