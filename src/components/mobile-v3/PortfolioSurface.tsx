'use client'

// Portfolio mobile surface — patrimoine total, cash/investi, comptes
// dépliables, positions à la demande. Mounts AppShell + MobileTopHeader
// (with MarketStatusBadge + DataFreshnessBadge in extras, identical to
// /dashboard). Pure render: no metier, no ranking, no recompute. Engine
// fields (score, suggested_action, top_alert_kind) are NOT surfaced.

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { DataFreshnessBadge } from '@/components/shell/DataFreshnessBadge'
import { MarketStatusBadge } from '@/components/shell/MarketStatusBadge'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
import type {
  DashboardHeaderPayload,
  FetchEnvelope,
  PortfolioCashAccount,
  PortfolioCashBreakdownPayload,
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

// ─────────────────────────────────────────────────────────
// Local AccountCard — collapsible per account, collapsed by
// default. Inline because CollapsibleSection's header only
// exposes title + count, and we need 4 fields visible while
// collapsed (name, total, cash, positions count).
// ─────────────────────────────────────────────────────────
interface AccountCardProps {
  account: PortfolioCashAccount
  positions: PortfolioPosition[]
}

function AccountCard({ account, positions }: AccountCardProps) {
  const [open, setOpen] = useState(false)
  const Chevron = open ? ChevronDown : ChevronRight

  return (
    <section
      data-account-card={account.account_id}
      data-account-kind={account.kind}
      data-open={open ? 'true' : 'false'}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: open ? 10 : 0,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          margin: 0,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
          <Chevron
            size={16}
            aria-hidden
            style={{ color: 'var(--ink-tertiary)', flexShrink: 0, marginTop: 2 }}
          />
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span
              style={{
                fontFamily: 'var(--font-editorial-serif)',
                fontSize: 16,
                fontWeight: 500,
                color: 'var(--ink-primary)',
                letterSpacing: 'var(--tracking-display)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {account.name}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 11,
                color: 'var(--ink-tertiary)',
                letterSpacing: '0.04em',
              }}
            >
              Cash {account.cash_display} · {positions.length} position
              {positions.length > 1 ? 's' : ''}
            </span>
          </span>
        </span>
        <span
          style={{
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ink-primary)',
            whiteSpace: 'nowrap',
            marginLeft: 8,
          }}
        >
          {account.invested_display}
        </span>
      </button>

      {open ? (
        positions.length === 0 ? (
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
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {positions.map((p, idx) => {
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
        )
      ) : null}
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Surface
// ─────────────────────────────────────────────────────────
export function PortfolioSurface() {
  const [header, setHeader] = useState<SurfaceState<DashboardHeaderPayload>>(initial)
  const [cashBreakdown, setCashBreakdown] =
    useState<SurfaceState<PortfolioCashBreakdownPayload>>(initial)
  const [portfolio, setPortfolio] = useState<SurfaceState<PortfolioEnrichedPayload>>(initial)

  useEffect(() => {
    const ctrl = new AbortController()
    let cancelled = false

    Promise.all([
      fetchEnvelope<DashboardHeaderPayload>('/api/mobile/dashboard-header', ctrl.signal),
      fetchEnvelope<PortfolioCashBreakdownPayload>(
        '/api/mobile/portfolio-cash-breakdown',
        ctrl.signal,
      ),
      fetchEnvelope<PortfolioEnrichedPayload>(
        '/api/mobile/portfolio-enriched',
        ctrl.signal,
      ),
    ]).then(([h, c, p]) => {
      if (cancelled) return
      setHeader(h)
      setCashBreakdown(c)
      setPortfolio(p)
    })

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [])

  const patrimoine = header.data?.patrimoine
  const market = header.data?.market
  const freshness = header.data?.data_freshness
  const totals = cashBreakdown.data?.totals
  const accounts = useMemo(() => {
    const list = cashBreakdown.data?.accounts ?? []
    return [...list].sort((a, b) => (b.total_eur ?? 0) - (a.total_eur ?? 0))
  }, [cashBreakdown.data?.accounts])

  const positionsByAccount = useMemo(() => {
    const map = new Map<string, PortfolioPosition[]>()
    for (const p of portfolio.data?.positions ?? []) {
      const id = p.account?.id
      if (!id) continue
      if (!map.has(id)) map.set(id, [])
      map.get(id)!.push(p)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (b.market_value ?? 0) - (a.market_value ?? 0))
    }
    return map
  }, [portfolio.data?.positions])

  const pnlColor =
    (patrimoine?.pnl_eur ?? 0) >= 0 ? 'var(--forest-green)' : 'var(--burgundy)'
  const pnlPale =
    (patrimoine?.pnl_eur ?? 0) >= 0 ? 'rgba(216,240,224,0.95)' : 'rgba(255,210,210,0.95)'

  const marketExtras =
    market || freshness ? (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 6,
        }}
      >
        {market ? (
          <MarketStatusBadge
            euOpen={market.eu_open}
            usOpen={market.us_open}
            regimeLabelFr={market.regime_label_fr}
          />
        ) : null}
        {freshness && freshness.label_fr ? (
          <DataFreshnessBadge status={freshness.status} labelFr={freshness.label_fr} />
        ) : null}
      </div>
    ) : null

  const metaPale: React.CSSProperties = {
    fontFamily: 'var(--font-editorial-mono)',
    fontSize: 10,
    color: 'rgba(216,240,224,0.85)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  }

  const isLoading = header.loading || cashBreakdown.loading || portfolio.loading
  const hasError = header.error && cashBreakdown.error && portfolio.error

  return (
    <AppShell>
      <MobileTopHeader
        eyebrow="Patrimoine"
        title="Portefeuille"
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
          data-card="patrimoine-master"
          data-variant="dark"
          style={{
            background:
              'linear-gradient(135deg, #2A5A40 0%, var(--forest-deep) 60%, #15321F 100%)',
            border: '1px solid #15321F',
            borderRadius: 12,
            overflow: 'hidden',
            color: '#FFFFFF',
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.04) inset, 0 6px 18px rgba(15,42,28,0.18)',
          }}
        >
          <header style={{ padding: '16px 18px 4px' }}>
            <span style={metaPale}>Patrimoine total</span>
          </header>

          {header.loading && !patrimoine ? (
            <div style={{ padding: '6px 18px 18px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-editorial-mono)',
                  fontSize: 12,
                  color: 'rgba(216,240,224,0.75)',
                }}
              >
                Chargement…
              </span>
            </div>
          ) : !patrimoine ? (
            <div style={{ padding: '6px 18px 18px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-editorial-sans)',
                  fontSize: 13,
                  color: 'rgba(216,240,224,0.85)',
                }}
              >
                Certaines données n’ont pas pu être mises à jour.
              </span>
            </div>
          ) : (
            <div
              style={{
                padding: '0 18px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-editorial-serif)',
                  fontSize: 30,
                  fontWeight: 500,
                  color: '#FFFFFF',
                  letterSpacing: 'var(--tracking-display)',
                  lineHeight: 1.05,
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
              {totals ? (
                <span
                  style={{
                    fontFamily: 'var(--font-editorial-mono)',
                    fontSize: 12,
                    color: pnlPale,
                    marginTop: 6,
                    letterSpacing: '0.02em',
                  }}
                >
                  Cash {totals.cash_display} · Investi {totals.invested_display}
                </span>
              ) : null}
            </div>
          )}
        </section>

        {isLoading && accounts.length === 0 ? (
          <section
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            aria-busy="true"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: 64,
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid var(--border-subtle)',
                }}
              />
            ))}
          </section>
        ) : hasError ? (
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
        ) : accounts.length === 0 ? (
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
              Aucun compte n’est rattaché pour le moment.
            </p>
          </section>
        ) : (
          accounts.map((acc) => (
            <AccountCard
              key={acc.account_id}
              account={acc}
              positions={positionsByAccount.get(acc.account_id) ?? []}
            />
          ))
        )}
      </div>
    </AppShell>
  )
}
