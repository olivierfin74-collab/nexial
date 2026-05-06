'use client'

import { useMemo } from 'react'
import type { SignalClassification, SignalDashboardRow } from '@/types/nx'
import { Sparkline } from './Sparkline'
import { ScoreGauge } from './ScoreGauge'

interface SignalCardProps {
  signal: SignalDashboardRow
}

const SIGNAL_BADGE_STYLES: Record<
  SignalClassification,
  { background: string; color: string; border?: string }
> = {
  BUY_ZONE: { background: 'var(--pour-bg)', color: 'var(--forest-green)' },
  HOT_PULLBACK: { background: 'var(--contre-bg)', color: 'var(--burgundy)' },
  WATCH_PULLBACK: { background: 'var(--alert-amber)', color: '#8B6914' },
  TOO_EXPENSIVE: { background: 'var(--border-subtle)', color: 'var(--ink-muted)' },
  INSUFFICIENT_DATA: {
    background: 'transparent',
    color: 'var(--ink-muted)',
    border: '1px dashed var(--border-subtle)',
  },
}

// Mulberry32 PRNG seeded by ticker — stable per ticker, no flicker on re-render.
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

  const upperBound = basePrice * 1.05
  const lowerBound = basePrice * 0.95
  const points: number[] = []
  let value = basePrice * (1 + (rand() - 0.5) * 0.05)

  for (let i = 0; i < 19; i++) {
    points.push(value)
    value += (rand() - 0.5) * basePrice * 0.02
    if (value > upperBound) value = upperBound
    if (value < lowerBound) value = lowerBound
  }
  // Force last point to actual current_price so sparkline endpoint matches displayed price.
  points.push(basePrice)
  return points
}

function formatPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

export function SignalCard({ signal }: SignalCardProps) {
  const sparklineData = useMemo(() => {
    if (signal.current_price == null) return []
    return generateSparklineData(signal.current_price, signal.ticker)
  }, [signal.current_price, signal.ticker])

  const sparklineTrend: 'up' | 'down' | 'flat' =
    signal.perf_1m_pct == null
      ? 'flat'
      : signal.perf_1m_pct > 0
        ? 'up'
        : signal.perf_1m_pct < 0
          ? 'down'
          : 'flat'

  const badgeStyle = SIGNAL_BADGE_STYLES[signal.signal]

  const perfBadges = (
    [
      { label: '1J', value: signal.perf_1d_pct },
      { label: '1S', value: signal.perf_1w_pct },
      { label: '1M', value: signal.perf_1m_pct },
    ] as Array<{ label: string; value: number | null }>
  ).filter(
    (b): b is { label: string; value: number } => b.value !== null,
  )

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
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--ink-primary)',
            }}
          >
            {signal.ticker}
          </span>
          {signal.exchange_region && (
            <span
              style={{
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 11,
                color: 'var(--ink-muted)',
              }}
            >
              {signal.exchange_region}
            </span>
          )}
        </div>
        <ScoreGauge score={signal.opportunity_score} size={56} />
      </div>

      {/* Signal classification badge */}
      <div>
        <span
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 10,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: 4,
            ...badgeStyle,
          }}
        >
          {signal.signal.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Drawdown row (conditional) */}
      {signal.drawdown_from_high_pct != null && (
        <div className="flex items-center justify-between">
          <span
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 11,
              color: 'var(--ink-secondary)',
            }}
          >
            Drawdown
          </span>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 13,
              fontWeight: 500,
              color:
                signal.drawdown_from_high_pct <= -10
                  ? 'var(--burgundy)'
                  : 'var(--ink-secondary)',
            }}
          >
            {`${signal.drawdown_from_high_pct.toFixed(1)}%`}
          </span>
        </div>
      )}

      {/* Sparkline (responsive width via CSS, viewBox preserves aspect) */}
      <Sparkline
        data={sparklineData}
        trend={sparklineTrend}
        width={300}
        height={40}
        className="w-full h-auto"
      />

      {/* Perf badges row (conditional, skip nulls) */}
      {perfBadges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {perfBadges.map(({ label, value }) => {
            const isPositive = value >= 0
            return (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: isPositive ? 'var(--pour-bg)' : 'var(--contre-bg)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-editorial-mono)',
                    fontSize: 9,
                    textTransform: 'uppercase',
                    color: 'var(--ink-muted)',
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-editorial-mono)',
                    fontSize: 11,
                    fontWeight: 500,
                    color: isPositive ? 'var(--forest-green)' : 'var(--burgundy)',
                  }}
                >
                  {formatPct(value)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* In Portfolio pill (conditional) */}
      {signal.in_portfolio && (
        <div>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: 6,
              background: 'var(--pour-bg)',
              color: 'var(--forest-green)',
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            ✓ En portefeuille
          </span>
        </div>
      )}
    </article>
  )
}
