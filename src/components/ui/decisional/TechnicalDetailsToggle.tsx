'use client'

import { useId, useState } from 'react'
import type { Technical } from '@/types/decision'

interface TechnicalDetailsToggleProps {
  technical: Technical
  /** Defaults to false (folded by design — `expand_level_3_by_default` decides). */
  defaultOpen?: boolean
  label?: string
}

function formatPercent(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(1)} %`
}

function formatPrice(v: number | null | undefined, currency: string): string {
  if (v === null || v === undefined) return '—'
  return `${v.toFixed(2)} ${currency}`
}

function formatNumber(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return v.toFixed(1)
}

export function TechnicalDetailsToggle({
  technical,
  defaultOpen = false,
  label = 'Détails techniques',
}: TechnicalDetailsToggleProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  if (!technical) return null

  const currency = technical.currency ?? ''
  const rows: Array<{ label: string; value: string }> = [
    {
      label: 'Score d’opportunité',
      value: technical.opportunity_score != null ? technical.opportunity_score.toFixed(1) : '—',
    },
    { label: 'Baisse depuis plus-haut (drawdown)', value: formatPercent(technical.drawdown_pct) },
    { label: 'Prix actuel', value: formatPrice(technical.current_price, currency) },
    { label: 'Zone Z2', value: formatPrice(technical.z2_price, currency) },
    { label: 'Zone Z3', value: formatPrice(technical.z3_price, currency) },
    { label: 'Plus-haut 52 sem.', value: formatPrice(technical.high_52w, currency) },
    { label: 'Qualité', value: technical.quality_class ?? '—' },
    { label: 'Régime de marché', value: technical.market_regime ?? '—' },
    { label: 'RSI 14 (S&P 500)', value: formatNumber(technical.spy_rsi_14) },
  ]

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="self-start transition-colors duration-150"
        style={{
          background: 'transparent',
          color: 'var(--ink-secondary)',
          border: 'none',
          padding: 0,
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.02em',
          textDecoration: 'underline',
          textDecorationColor: 'var(--border-subtle)',
          textUnderlineOffset: 3,
          cursor: 'pointer',
        }}
      >
        {open ? `Masquer ${label.toLowerCase()}` : `Voir ${label.toLowerCase()}`}
        <span aria-hidden style={{ marginLeft: 6 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open ? (
        <div
          id={panelId}
          style={{
            background: 'var(--canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: '10px 12px',
          }}
        >
          {technical.alert_description_fr ? (
            <p
              style={{
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                color: 'var(--ink-secondary)',
                margin: '0 0 8px',
                lineHeight: 1.4,
              }}
            >
              {technical.alert_description_fr}
            </p>
          ) : null}
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-3 py-1">
                <dt
                  style={{
                    fontFamily: 'var(--font-editorial-mono)',
                    fontSize: 10,
                    color: 'var(--ink-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {r.label}
                </dt>
                <dd
                  style={{
                    fontFamily: 'var(--font-editorial-mono)',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--ink-primary)',
                    margin: 0,
                  }}
                >
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
          {technical.alert_kind_label_fr ? (
            <p
              style={{
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 10,
                color: 'var(--ink-muted)',
                margin: '8px 0 0',
                letterSpacing: '0.03em',
              }}
            >
              {technical.alert_kind_label_fr}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
