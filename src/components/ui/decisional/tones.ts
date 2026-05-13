import type { VerdictColor } from '@/types/decision'

export interface ToneStyle {
  background: string
  color: string
  border: string
}

/**
 * UI-only tone (not backend). Used by system-state primitives (Empty/Wait/
 * NoAction) and the Telegram preview, which don't consume a backend payload.
 *
 * Backend decisions use `VerdictColor` — see `getColorStyle` below.
 */
export type DecisionTone = 'good' | 'warn' | 'bad' | 'info' | 'neutral'

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

/**
 * Map a backend `Verdict.color` value to design-system colors. Display-only.
 * The frontend NEVER chooses the color — the backend ships it.
 */
export function getColorStyle(color: VerdictColor | null | undefined): ToneStyle {
  switch (color) {
    case 'green':
      return {
        background: 'var(--pour-bg)',
        color: 'var(--forest-green)',
        border: 'var(--forest-green-pale)',
      }
    case 'lightgreen':
      return {
        background: '#F1F7EE',
        color: 'var(--forest-green-light)',
        border: '#CFE3C3',
      }
    case 'red':
      return {
        background: 'var(--contre-bg)',
        color: 'var(--burgundy)',
        border: 'var(--burgundy-light)',
      }
    case 'yellow':
      return {
        background: 'var(--alert-amber)',
        color: '#8B6914',
        border: '#E8D9B5',
      }
    case 'blue':
      return {
        background: '#EFF4FA',
        color: '#1F4A6E',
        border: '#CDDCEC',
      }
    case 'gray':
    default:
      return {
        background: 'rgba(0,0,0,0.04)',
        color: 'var(--ink-secondary)',
        border: 'var(--border-subtle)',
      }
  }
}
