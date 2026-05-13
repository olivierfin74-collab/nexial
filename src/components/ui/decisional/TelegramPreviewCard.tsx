// TelegramPreviewCard — compact mobile preview of a decisional Telegram
// message. Pure presentational. The backend (`fn_telegram_decisional_message`)
// owns the full message; this card shows the verdict, a short sentence, and
// a discrete CTA — exactly what the user sees in the Telegram notification.
//
// Variants (ACHETER, GARDER, SURVEILLER, VENDRE) are visual hints only.
// The backend action_code drives which variant the frontend renders.

import { getToneStyle, type DecisionTone } from './tones'

export type TelegramVariant = 'ACHETER' | 'GARDER' | 'SURVEILLER' | 'VENDRE'

interface VariantStyle {
  tone: DecisionTone
  emoji: string
  label: string
}

const VARIANT_STYLES: Record<TelegramVariant, VariantStyle> = {
  ACHETER: { tone: 'good', emoji: '🟢', label: 'Acheter' },
  GARDER: { tone: 'info', emoji: '🔵', label: 'Garder' },
  SURVEILLER: { tone: 'warn', emoji: '🟡', label: 'Surveiller' },
  VENDRE: { tone: 'bad', emoji: '🔴', label: 'Vendre' },
}

export interface TelegramPreviewCardProps {
  /** Variant — should mirror the backend action_code. */
  variant: TelegramVariant
  ticker: string
  /** Short, French, no jargon. */
  sentence: string
  /** Optional context line (e.g., "En portefeuille · 12 parts"). */
  context?: string | null
  /** Optional CTA — keep discreet on mobile. */
  cta?: { label: string; href?: string | null } | null
  /** Optional timestamp footer text (free string, formatted upstream). */
  timestamp?: string | null
}

export function TelegramPreviewCard({
  variant,
  ticker,
  sentence,
  context,
  cta,
  timestamp,
}: TelegramPreviewCardProps) {
  const style = VARIANT_STYLES[variant]
  const tone = getToneStyle(style.tone)

  return (
    <article
      data-variant={variant}
      className="mx-auto flex max-w-sm flex-col gap-2"
      style={{
        background: '#FFFFFF',
        border: '1px solid var(--border-subtle)',
        borderRadius: 14,
        padding: 14,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        fontFamily: 'var(--font-editorial-sans)',
      }}
    >
      {/* Telegram-style sender row */}
      <header className="flex items-center gap-2">
        <div
          aria-hidden
          className="flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: 'var(--forest-green)',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          NX
        </div>
        <div className="flex flex-col leading-tight">
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)' }}>Nexial</span>
          <span style={{ fontSize: 10, color: 'var(--ink-muted)' }}>
            {timestamp ?? 'maintenant'}
          </span>
        </div>
      </header>

      {/* Verdict + ticker — dominant */}
      <div className="flex items-baseline justify-between gap-2">
        <span
          style={{
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--ink-primary)',
          }}
        >
          {ticker}
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full"
          style={{
            background: tone.background,
            color: tone.color,
            border: `1px solid ${tone.border}`,
            padding: '3px 10px',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          <span aria-hidden>{style.emoji}</span>
          <span>{style.label}</span>
        </span>
      </div>

      {/* Short sentence */}
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.45,
          color: 'var(--ink-primary)',
          margin: 0,
        }}
      >
        {sentence}
      </p>

      {/* Optional context line */}
      {context ? (
        <p
          style={{
            fontSize: 11,
            color: 'var(--ink-secondary)',
            margin: 0,
          }}
        >
          {context}
        </p>
      ) : null}

      {/* Discreet CTA */}
      {cta ? (
        <a
          href={cta.href ?? '#'}
          className="self-start"
          style={{
            color: 'var(--forest-green)',
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'underline',
            textDecorationColor: 'var(--forest-green-pale)',
            textUnderlineOffset: 3,
            padding: '4px 0',
          }}
        >
          {cta.label}
        </a>
      ) : null}
    </article>
  )
}
