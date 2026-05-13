import type { DecisionTone } from '@/types/decision'

export interface ToneStyle {
  background: string
  color: string
  border: string
}

/** Map a backend-provided tone to design-system colors. Display-only. */
export function getToneStyle(tone: DecisionTone | null | undefined): ToneStyle {
  switch (tone) {
    case 'good':
      return {
        background: 'var(--pour-bg)',
        color: 'var(--forest-green)',
        border: 'var(--forest-green-pale)',
      }
    case 'bad':
      return {
        background: 'var(--contre-bg)',
        color: 'var(--burgundy)',
        border: 'var(--burgundy-light)',
      }
    case 'warn':
      return {
        background: 'var(--alert-amber)',
        color: '#8B6914',
        border: '#E8D9B5',
      }
    case 'info':
      return {
        background: '#EFF4FA',
        color: '#1F4A6E',
        border: '#CDDCEC',
      }
    case 'neutral':
    default:
      return {
        background: 'rgba(0,0,0,0.04)',
        color: 'var(--ink-secondary)',
        border: 'var(--border-subtle)',
      }
  }
}
