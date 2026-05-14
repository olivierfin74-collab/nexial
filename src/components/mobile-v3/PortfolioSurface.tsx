'use client'

// Portfolio mobile surface — enriched positions list with totals from
// the dashboard header. Mounts AppShell + MobileTopHeader. Pure render-
// only: no metier, no ranking, no recompute. Engine fields (score,
// suggested_action, top_alert_kind) are intentionally NOT surfaced —
// they belong to the decisional pages, not the patrimoine view.

import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { MarketStatusBadge } from '@/components/shell/MarketStatusBadge'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
import type {
  DashboardHeaderPayload,
  FetchEnvelope,
  PortfolioEnrichedPayload,
  PortfolioPosition,
} from '@/types/nexial-v3'

interface SurfaceState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

const initial = <T,>(): SurfaceState<T> => ({ data: null, loading: true, error: null })

async function fetchEnvelope<T>(
  path: string,
  signal?: AbortSignal,
): Promise<SurfaceState<T>> {
  try {
    const res = await fetch(path, { cache: 'no-store', signal })
    const json = (await res.json()) as FetchEnvelope<T>
    if (!res.ok || json.error) {
      return { data: null, loading: false, error: json.error?.code ?? 'fetch_failed' }
    }
    return { data: json.data, loading: false, error: null }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { data: null, loading: true, error: null }
    }
    return {
      data: null,
      loading: false,
      error: err instanceof Error ? err.message : 'fetch_failed',
    }
  }
}

function formatPrice(value: number, currency: string): string {
  if (!Number.isFinite(value)) return '—'
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency
  return `${value.toFixed(2)} ${symbol}`
}

function formatPnlPct(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)} %`
}

interface AccountGroup {
  account: PortfolioPosition['account']
  positions: PortfolioPosition[]
}

function groupByAccount(positions: PortfolioPosition[]): AccountGroup[] {
  const map = new Map<string, AccountGroup>()
  for (const p of positions) {
    const id = p.account?.id ?? 'unknown'
    if (!map.has(id)) {
      map.set(id, { account: p.account, positions: [] })
    }
    map.get(id)!.positions.push(p)
  }
  for (const group of map.values()) {
    group.positions.sort(
      (a, b) => (b.market_value ?? 0) - (a.market_value ?? 0),
    )
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      b.positions.reduce((acc, p) => acc + (p.market_value ?? 0), 0) -
      a.positions.reduce((acc, p) => acc + (p.market_value ?? 0), 0),
  )
}

export function PortfolioSurface() {
  const [header, setHeader] = useState<SurfaceState<DashboardHeaderPayload>>(initial)
  const [portfolio, setPortfolio] = useState<SurfaceState<PortfolioEnrichedPayload>>(initial)

  useEffect(() => {
    const ctrl = new AbortController()
    let cancelled = false

    Promise.all([
      fetchEnvelope<DashboardHeaderPayload>('/api/mobile/dashboard-header', ctrl.signal),
      fetchEnvelope<PortfolioEnrichedPayload>(
        '/api/mobile/portfolio-enriched',
        ctrl.signal,
      ),
    ]).then(([h, p]) => {
      if (cancelled) return
      setHeader(h)
      setPortfolio(p)
    })

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [])

  const positions = portfolio.data?.positions ?? []
  const groups = useMemo(() => groupByAccount(positions), [positions])
  const patrimoine = header.data?.patrimoine
  const market = header.data?.market
  const pnlColor = (patrimoine?.pnl_eur ?? 0) >= 0 ? 'var(--forest-green)' : 'var(--burgundy)'

  const marketExtras = market ? (
    <MarketStatusBadge
      euOpen={market.eu_open}
      usOpen={market.us_open}
      regimeLabelFr={market.regime_label_fr}
    />
  ) : null

  return (
    <AppShell>
      <MobileTopHeader
        eyebrow="Patrimoine"
        title="Portefeuille"
        contextLine={
          portfolio.data
            ? `${portfolio.data.summary.positions_count} position${portfolio.data.summary.positions_count > 1 ? 's' : ''}`
            : undefined
        }
        extras={marketExtras}
        compact
      />

      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <section
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {header.loading ? (
            <span
              style={{
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 12,
                color: 'var(--ink-tertiary)',
              }}
            >
              Chargement…
            </span>
          ) : header.error || !patrimoine ? (
            <span
              style={{
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 13,
                color: 'var(--ink-secondary)',
              }}
            >
              Certaines données n’ont pas pu être mises à jour.
            </span>
          ) : (
            <>
              <span
                style={{
                  fontFamily: 'var(--font-editorial-mono)',
                  fontSize: 10,
                  color: 'var(--ink-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Total portefeuille
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-editorial-serif)',
                  fontSize: 26,
                  fontWeight: 500,
                  color: 'var(--ink-primary)',
                  letterSpacing: 'var(--tracking-display)',
                }}
              >
                {patrimoine.display}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-editorial-mono)',
                  fontSize: 13,
                  fontWeight: 700,
                  color: pnlColor,
                }}
              >
                {patrimoine.pnl_display}
              </span>
            </>
          )}
        </section>

        {portfolio.loading ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                aria-busy="true"
                style={{
                  height: 96,
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid var(--border-subtle)',
                }}
              />
            ))}
          </section>
        ) : portfolio.error ? (
          <section
            role="status"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: 14,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 13,
                color: 'var(--ink-primary)',
              }}
            >
              Impossible de charger le portefeuille.
            </p>
          </section>
        ) : positions.length === 0 ? (
          <section
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: 14,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 13,
                color: 'var(--ink-tertiary)',
              }}
            >
              Aucune position détenue actuellement.
            </p>
          </section>
        ) : (
          groups.map((group) => (
            <section
              key={group.account?.id ?? group.account?.name}
              data-account={group.account?.kind}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-editorial-serif)',
                    fontSize: 17,
                    fontWeight: 500,
                    color: 'var(--ink-primary)',
                    letterSpacing: 'var(--tracking-display)',
                  }}
                >
                  {group.account?.name ?? 'Compte'}
                </h2>
                <span
                  style={{
                    fontFamily: 'var(--font-editorial-mono)',
                    fontSize: 11,
                    color: 'var(--ink-tertiary)',
                  }}
                >
                  {group.positions.length}
                </span>
              </header>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
                {group.positions.map((p, idx) => {
                  const pnlPctColor =
                    (p.unrealized_pnl_pct ?? 0) >= 0 ? 'var(--forest-green)' : 'var(--burgundy)'
                  return (
                    <li
                      key={p.asset_id}
                      style={{
                        padding: '10px 0',
                        borderTop: idx === 0 ? 'none' : '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-editorial-sans)',
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'var(--ink-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 220,
                          }}
                        >
                          {p.asset_name}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-editorial-mono)',
                            fontSize: 11,
                            color: 'var(--ink-secondary)',
                            letterSpacing: '0.03em',
                          }}
                        >
                          {p.ticker} · {p.quantity} × {formatPrice(p.pru, p.currency)}
                        </span>
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-editorial-mono)',
                            fontSize: 13,
                            color: 'var(--ink-primary)',
                          }}
                        >
                          {formatPrice(p.market_value, p.currency)}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-editorial-mono)',
                            fontSize: 11,
                            fontWeight: 700,
                            color: pnlPctColor,
                          }}
                        >
                          {formatPnlPct(p.unrealized_pnl_pct)}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </AppShell>
  )
}
