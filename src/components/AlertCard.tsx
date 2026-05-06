'use client'

import { useMemo } from 'react'
import type { AlertKind, AlertRow } from '@/types/nx'
import { Sparkline } from './Sparkline'
import { ScoreGauge } from './ScoreGauge'

interface AlertCardProps {
  alert: AlertRow
}

const ALERT_KIND_BADGE_STYLES: Record<
  AlertKind,
  { background: string; color: string; label: string }
> = {
  BUY_ZONE_ENTERED: {
    background: 'var(--pour-bg)',
    color: 'var(--forest-green)',
    label: 'BUY ZONE',
  },
  HOT_PULLBACK_ENTERED: {
    background: 'var(--contre-bg)',
    color: 'var(--burgundy)',
    label: 'HOT PULLBACK',
  },
  WATCH_PULLBACK_ENTERED: {
    background: 'var(--alert-amber)',
    color: '#8B6914',
    label: 'WATCH PULLBACK',
  },
}

const RELEVANCE_LABELS: Record<string, { color: string; label: string }> = {
  still_relevant: { color: 'var(--forest-green)', label: 'Toujours pertinent' },
  fading: { color: 'var(--ink-muted)', label: 'Pertinence en baisse' },
  expired_window: { color: 'var(--burgundy)', label: 'Fenêtre expirée' },
}

// Mulberry32 PRNG — same as SignalCard for visual consistency.
function generateSparklineData(basePrice: number, ticker: string): number[] {
  let seed = 0
  for (const ch of ticker) seed = (seed * 31 + ch.charCodeAt(0)) | 0
  const rand = (): number => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const upper = basePrice * 1.05
  const lower = basePrice * 0.95
  const points: number[] = []
  let v = basePrice * (1 + (rand() - 0.5) * 0.05)
  for (let i = 0; i < 19; i++) {
    points.push(v)
    v += (rand() - 0.5) * basePrice * 0.02
    if (v > upper) v = upper
    if (v < lower) v = lower
  }
  points.push(basePrice)
  return points
}

function formatPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

function formatPrice(value: number | null): string {
  if (value == null) return '—'
  return `${value.toFixed(2)}€`
}

function formatHoursDuration(hours: number | null): string {
  if (hours == null) return '—'
  if (hours < 24) return `${Math.round(hours)}h`
  return `${(hours / 24).toFixed(1)}j`
}

export function AlertCard({ alert }: AlertCardProps) {
  const sparklineData = useMemo(() => {
    const base = alert.price_now ?? alert.price_at_creation
    if (base == null) return []
    return generateSparklineData(base, alert.ticker)
  }, [alert.price_now, alert.price_at_creation, alert.ticker])

  const sparklineTrend: 'up' | 'down' | 'flat' =
    alert.price_change_since_alert_pct == null
      ? 'flat'
      : alert.price_change_since_alert_pct > 0
        ? 'up'
        : alert.price_change_since_alert_pct < 0
          ? 'down'
          : 'flat'

  const kindStyle = ALERT_KIND_BADGE_STYLES[alert.alert_kind]
  const relevanceStyle = alert.relevance_status
    ? RELEVANCE_LABELS[alert.relevance_status]
    : null

  function handleValidate() {
    console.log('[AlertCard] validate:', alert.id, alert.ticker)
    // TODO Phase C: open order modal + supabase.rpc('fn_nx_create_order_from_alert', ...)
  }
  function handleSnooze() {
    console.log('[AlertCard] snooze (mark_seen):', alert.id, alert.ticker)
    // TODO Phase C: supabase.rpc('fn_nx_mark_alert_seen', { p_alert_id: alert.id })
  }
  function handleDismiss() {
    console.log('[AlertCard] dismiss:', alert.id, alert.ticker)
    // TODO Phase C: supabase.rpc('fn_nx_mark_alert_dismiss', { p_alert_id: alert.id })
  }

  return (
    <article
      className="flex flex-col gap-3 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-[var(--forest-green-light)]"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: 20,
      }}
    >
      {/* Header: ticker + portfolio indicator + score gauge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 18,
              fontWeight: 500,
              color: 'var(--ink-primary)',
            }}
          >
            {alert.ticker}
          </span>
          {alert.in_portfolio && (
            <span
              style={{
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 10,
                color: 'var(--forest-green)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              ✓ En portefeuille
              {alert.held_quantity != null ? ` (${alert.held_quantity})` : ''}
            </span>
          )}
        </div>
        <ScoreGauge score={alert.score_when_created} size={64} />
      </div>

      {/* Alert kind badge + optional relevance label */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 10,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: 4,
            background: kindStyle.background,
            color: kindStyle.color,
          }}
        >
          {kindStyle.label}
        </span>
        {relevanceStyle && (
          <span
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 11,
              color: relevanceStyle.color,
            }}
          >
            · {relevanceStyle.label}
          </span>
        )}
      </div>

      {/* Price block: alert vs current + delta */}
      <div
        className="flex items-center justify-between gap-2 flex-wrap"
        style={{
          background: 'var(--canvas)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          padding: '10px 12px',
        }}
      >
        <div className="flex flex-col">
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 9,
              color: 'var(--ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Prix alerte
          </span>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 13,
              color: 'var(--ink-secondary)',
            }}
          >
            {formatPrice(alert.price_at_creation)}
          </span>
        </div>
        <div className="flex flex-col">
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 9,
              color: 'var(--ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Prix actuel
          </span>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--ink-primary)',
            }}
          >
            {formatPrice(alert.price_now)}
          </span>
        </div>
        {alert.price_change_since_alert_pct != null && (
          <div
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 13,
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: 4,
              background:
                alert.price_change_since_alert_pct >= 0
                  ? 'var(--pour-bg)'
                  : 'var(--contre-bg)',
              color:
                alert.price_change_since_alert_pct >= 0
                  ? 'var(--forest-green)'
                  : 'var(--burgundy)',
            }}
          >
            {formatPct(alert.price_change_since_alert_pct)}
          </div>
        )}
      </div>

      {/* Drawdown at creation (prominent if severe) */}
      {alert.drawdown_at_creation != null && (
        <div className="flex items-baseline justify-between">
          <span
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 11,
              color: 'var(--ink-secondary)',
            }}
          >
            Drawdown à l&apos;alerte
          </span>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 14,
              fontWeight: 500,
              color:
                alert.drawdown_at_creation <= -10
                  ? 'var(--burgundy)'
                  : 'var(--ink-secondary)',
            }}
          >
            {`${alert.drawdown_at_creation.toFixed(1)}%`}
          </span>
        </div>
      )}

      {/* Sparkline */}
      <Sparkline
        data={sparklineData}
        trend={sparklineTrend}
        width={300}
        height={40}
        className="w-full h-auto"
      />

      {/* Actions row (3 buttons, Phase C wires real RPC) */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={handleValidate}
          className="transition-colors duration-150"
          style={{
            background: 'var(--forest-green)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 12px',
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            flex: '1 1 auto',
          }}
        >
          ✓ Valider l&apos;ordre
        </button>
        <button
          type="button"
          onClick={handleSnooze}
          className="transition-colors duration-150"
          style={{
            background: 'transparent',
            color: 'var(--ink-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            padding: '8px 12px',
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          ⏰ Reporter
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="transition-colors duration-150"
          style={{
            background: 'transparent',
            color: 'var(--ink-muted)',
            border: 'none',
            borderRadius: 6,
            padding: '8px 12px',
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          ✗ Ignorer
        </button>
      </div>

      {/* Footer: age + expires */}
      <div
        style={{
          fontFamily: 'var(--font-editorial-mono)',
          fontSize: 10,
          color: 'var(--ink-muted)',
          letterSpacing: '0.03em',
          paddingTop: 4,
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        Créée il y a {formatHoursDuration(alert.age_hours)} · Expire dans{' '}
        {formatHoursDuration(alert.expires_in_hours)}
      </div>
    </article>
  )
}
