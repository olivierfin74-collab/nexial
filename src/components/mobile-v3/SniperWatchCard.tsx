'use client'

// Render-only sniper card (collapsed + expandable).
// Pure presentational. No metier mapping, no fetch. All FR labels come
// from the backend payload. The frontend never invents a verdict, a
// score, a conviction or a "STRONG_BUY" label.

import { useState } from 'react'
import type { SniperCard, WatchLevel } from '@/types/nexial-v3'

interface SniperWatchCardProps {
  sniper: SniperCard
  /** Visually muted variant for the "Suivi normal" section. */
  muted?: boolean
  onSetWatchLevel?: (assetId: string, level: WatchLevel) => void
  onDefineTarget?: (sniper: SniperCard) => void
  onEditTarget?: (sniper: SniperCard) => void
  onViewEntryPlan?: (sniper: SniperCard) => void
}

function distanceTone(color: string | undefined): string {
  switch (color) {
    case 'green':
      return 'rgba(31,74,46,0.85)'
    case 'yellow':
      return 'rgba(139,105,20,0.9)'
    case 'red':
      return 'rgba(95,34,34,0.9)'
    case 'neutral':
    default:
      return 'var(--ink-tertiary)'
  }
}

function firstTarget(sniper: SniperCard) {
  if (!Array.isArray(sniper.sniper_targets) || sniper.sniper_targets.length === 0) {
    return null
  }
  return sniper.sniper_targets[0]
}

export function SniperWatchCard({
  sniper,
  muted = false,
  onSetWatchLevel,
  onDefineTarget,
  onEditTarget,
  onViewEntryPlan,
}: SniperWatchCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isFocus = sniper.watch_level === 'FOCUS'
  const hasTarget = sniper.sniper_targets_count > 0
  const target = firstTarget(sniper)
  const priceDisplay = sniper.card_summary?.price_display ?? ''
  const distanceText = sniper.card_summary?.distance_text ?? ''
  const distanceColor = sniper.card_summary?.color

  const statusLabel = isFocus
    ? hasTarget
      ? 'Surveillance rapprochée active'
      : 'Surveillance sans prix défini'
    : hasTarget
      ? 'Prix cible défini'
      : 'Suivi simple'

  const expandedLine = isFocus
    ? hasTarget
      ? 'Cet actif est surveillé de près avec un prix cible défini.'
      : "Cet actif est surveillé de près, mais aucun prix cible n'est encore défini."
    : hasTarget
      ? 'Un prix intéressant a été défini pour cet actif.'
      : 'Actif suivi sans prix cible défini.'

  const accentColor = isFocus ? 'var(--forest-green)' : 'var(--ink-tertiary)'
  const borderColor = muted ? 'var(--border-subtle)' : 'var(--border-subtle)'

  // Surfaced target price for the price-target modal seed
  const targetPriceFromTarget =
    target && typeof (target as Record<string, unknown>).target_price === 'number'
      ? ((target as Record<string, unknown>).target_price as number)
      : null

  return (
    <article
      data-card="SniperWatchCard"
      data-watch-level={sniper.watch_level ?? 'WATCH'}
      style={{
        background: muted ? 'var(--canvas)' : 'var(--surface)',
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 12,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        opacity: muted ? 0.92 : 1,
        transition: 'background-color 150ms',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          margin: 0,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--font-editorial-mono)', fontSize: 13, fontWeight: 800, color: 'var(--ink-primary)' }}>
              {sniper.ticker}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 11,
                color: 'var(--ink-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 220,
              }}
            >
              {sniper.asset_name}
            </span>
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontFamily: 'var(--font-editorial-mono)', fontSize: 12, color: 'var(--ink-primary)' }}>
              {priceDisplay}
            </span>
            {distanceText ? (
              <span
                style={{
                  fontFamily: 'var(--font-editorial-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: distanceTone(distanceColor),
                }}
              >
                {distanceText}
              </span>
            ) : null}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-editorial-sans)', fontSize: 11, color: accentColor, fontWeight: 600 }}>
          {statusLabel}
        </span>
      </button>

      {expanded ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border-subtle)' }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 12.5,
              color: 'var(--ink-primary)',
              lineHeight: 1.45,
            }}
          >
            {expandedLine}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flexDirection: 'row' }}>
            {isFocus ? (
              hasTarget ? (
                <>
                  <button
                    type="button"
                    onClick={() => onViewEntryPlan?.(sniper)}
                    style={ctaPrimary(accentColor)}
                  >
                    Voir le plan d’entrée
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetWatchLevel?.(sniper.asset_id, 'WATCH')}
                    style={ctaSecondary()}
                  >
                    Réduire la surveillance
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onDefineTarget?.(sniper)}
                    style={ctaPrimary(accentColor)}
                  >
                    Définir un prix cible
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetWatchLevel?.(sniper.asset_id, 'WATCH')}
                    style={ctaSecondary()}
                  >
                    Réduire la surveillance
                  </button>
                </>
              )
            ) : hasTarget ? (
              <>
                <button
                  type="button"
                  onClick={() => onSetWatchLevel?.(sniper.asset_id, 'FOCUS')}
                  style={ctaPrimary('var(--forest-green)')}
                >
                  Passer en Focus
                </button>
                <button
                  type="button"
                  onClick={() => onEditTarget?.(sniper)}
                  style={ctaSecondary()}
                >
                  Modifier le prix
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onSetWatchLevel?.(sniper.asset_id, 'FOCUS')}
                  style={ctaPrimary('var(--forest-green)')}
                >
                  Passer en Focus
                </button>
                <button
                  type="button"
                  onClick={() => onDefineTarget?.(sniper)}
                  style={ctaSecondary()}
                >
                  Définir un prix cible
                </button>
              </>
            )}
          </div>

          {targetPriceFromTarget ? (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 11,
                color: 'var(--ink-tertiary)',
              }}
            >
              Prix cible enregistré : {targetPriceFromTarget}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function ctaPrimary(color: string): React.CSSProperties {
  return {
    minHeight: 36,
    borderRadius: 8,
    padding: '8px 12px',
    fontFamily: 'var(--font-editorial-sans)',
    fontSize: 12,
    fontWeight: 600,
    background: 'transparent',
    color,
    border: `1px solid ${color}`,
    cursor: 'pointer',
  }
}

function ctaSecondary(): React.CSSProperties {
  return {
    minHeight: 36,
    borderRadius: 8,
    padding: '8px 12px',
    fontFamily: 'var(--font-editorial-sans)',
    fontSize: 12,
    fontWeight: 600,
    background: 'transparent',
    color: 'var(--ink-secondary)',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
  }
}
