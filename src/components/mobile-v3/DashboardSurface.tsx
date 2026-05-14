'use client'

// Dashboard mobile surface (P6 RESTORE FUNCTIONAL MASTER) — unified
// cash window restored from the legacy YourMoney pattern
// (nexial-app-complete.jsx:1049) into the AppShell V3.
//
// One single card holds:
//   - Total patrimoine + PnL (display, mono small)
//   - Two big numbers in columns: Investi | Cash dispo
//   - Footer click area (positions count + chevron Détail/Masquer)
//   - Inline accounts list (only accounts with total_eur > 0)
//
// No separate cards, no metier recompute. All amounts come verbatim
// from fn_dashboard_header and fn_portfolio_cash_breakdown.

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { MarketStatusBadge } from '@/components/shell/MarketStatusBadge'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
import { OpenSniperCta } from '@/components/mobile-v3/OpenSniperCta'
import type {
  DashboardHeaderPayload,
  FetchEnvelope,
  PortfolioCashAccount,
  PortfolioCashBreakdownPayload,
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

const meta: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  color: 'var(--ink-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: 0,
}

const metaPale: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  color: 'var(--forest-green-pale)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
  margin: 0,
}

const bigValue: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-serif)',
  fontSize: 22,
  fontWeight: 500,
  color: 'var(--ink-primary)',
  letterSpacing: '-0.01em',
  margin: 0,
}

const bigOnDark: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-serif)',
  fontSize: 22,
  fontWeight: 500,
  color: '#FFFFFF',
  letterSpacing: '-0.01em',
  margin: 0,
}

function hasMoney(a: PortfolioCashAccount): boolean {
  // Hide accounts with no money at all (e.g. Lab FULL_AUTO at 0, empty
  // Crypto). A cash-only account stays visible (Paper Trading).
  const total = Number(a.total_eur ?? 0)
  const cash = Number(a.cash_eur ?? 0)
  const invested = Number(a.invested_eur ?? 0)
  return total > 0 || cash > 0 || invested > 0
}

export function DashboardSurface() {
  const [header, setHeader] = useState<SurfaceState<DashboardHeaderPayload>>(initial)
  const [cash, setCash] = useState<SurfaceState<PortfolioCashBreakdownPayload>>(initial)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    let cancelled = false

    Promise.all([
      fetchEnvelope<DashboardHeaderPayload>('/api/mobile/dashboard-header', ctrl.signal),
      fetchEnvelope<PortfolioCashBreakdownPayload>(
        '/api/mobile/portfolio-cash-breakdown',
        ctrl.signal,
      ),
    ]).then(([h, c]) => {
      if (cancelled) return
      setHeader(h)
      setCash(c)
    })

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [])

  const patrimoine = header.data?.patrimoine
  const market = header.data?.market
  const freshness = header.data?.data_freshness
  const totals = cash.data?.totals
  const accountsAll = cash.data?.accounts ?? []
  const visibleAccounts = useMemo(
    () => accountsAll.filter(hasMoney),
    [accountsAll],
  )

  const pnlColor = (patrimoine?.pnl_eur ?? 0) >= 0 ? 'var(--forest-green)' : 'var(--burgundy)'
  const isLoading = header.loading || cash.loading
  const hasData = !!patrimoine && !!totals

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
        title="Dashboard"
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
        {freshness && freshness.status !== 'FRESH' && freshness.label_fr ? (
          <div
            style={{
              borderRadius: 8,
              background: '#FFF8E6',
              border: '1px solid #E5C878',
              color: '#7A5A00',
              padding: '8px 10px',
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {freshness.label_fr}
          </div>
        ) : null}

        <section
          data-card="cash-master"
          data-variant="dark"
          style={{
            background: 'var(--forest-deep)',
            border: '1px solid var(--forest-deep)',
            borderRadius: 12,
            overflow: 'hidden',
            color: '#FFFFFF',
          }}
        >
          <header style={{ padding: '16px 18px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={metaPale}>Ton argent</span>
            {isLoading && !hasData ? (
              <span
                style={{
                  fontFamily: 'var(--font-editorial-mono)',
                  fontSize: 14,
                  color: 'var(--forest-green-pale)',
                }}
              >
                Chargement…
              </span>
            ) : header.error || !patrimoine ? (
              <span
                style={{
                  fontFamily: 'var(--font-editorial-sans)',
                  fontSize: 13,
                  color: 'var(--forest-green-pale)',
                }}
              >
                Certaines données n’ont pas pu être mises à jour.
              </span>
            ) : null}
          </header>

          {totals && patrimoine ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1px 1fr',
                gap: 0,
                padding: '6px 18px 16px',
                alignItems: 'stretch',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={metaPale}>Patrimoine</span>
                <span style={bigOnDark}>{patrimoine.display}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-editorial-mono)',
                    fontSize: 12,
                    fontWeight: 700,
                    color: (patrimoine.pnl_eur ?? 0) >= 0 ? 'var(--forest-green-pale)' : '#F1A39B',
                  }}
                >
                  {patrimoine.pnl_display}
                </span>
              </div>
              <div
                aria-hidden
                style={{
                  background: 'rgba(168, 196, 176, 0.25)',
                  margin: '4px 14px',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={metaPale}>Cash dispo</span>
                <span
                  style={{
                    ...bigOnDark,
                    color:
                      Number(totals.cash_eur ?? 0) > 0
                        ? 'var(--forest-green-pale)'
                        : '#FFFFFF',
                  }}
                >
                  {totals.cash_display}
                </span>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            disabled={!hasData || visibleAccounts.length === 0}
            style={{
              width: '100%',
              padding: '12px 18px',
              borderTop: '1px solid rgba(168, 196, 176, 0.18)',
              background: 'transparent',
              cursor: hasData && visibleAccounts.length > 0 ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              textAlign: 'left',
              color: 'var(--forest-green-pale)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                color: 'var(--forest-green-pale)',
                fontWeight: 500,
              }}
            >
              {hasData
                ? `${visibleAccounts.length} compte${visibleAccounts.length > 1 ? 's' : ''}`
                : '—'}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                fontWeight: 600,
                color: '#FFFFFF',
              }}
            >
              {expanded ? 'Masquer' : 'Détail'}
              <ChevronDown
                size={14}
                aria-hidden
                style={{
                  transform: expanded ? 'rotate(180deg)' : 'none',
                  transition: 'transform 200ms',
                }}
              />
            </span>
          </button>

          {expanded && hasData ? (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                background: 'var(--canvas)',
              }}
            >
              {visibleAccounts.map((a, index) => (
                <li
                  key={a.account_id}
                  style={{
                    padding: '12px 16px',
                    borderTop: index === 0 ? '1px solid var(--border-subtle)' : '1px solid var(--border-subtle)',
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
                      }}
                    >
                      {a.name}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-editorial-mono)',
                        fontSize: 11,
                        color: 'var(--ink-tertiary)',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {a.broker ?? a.kind.toUpperCase()}
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
                      {a.invested_display}
                    </span>
                    {Number(a.cash_eur ?? 0) > 0 ? (
                      <span
                        style={{
                          fontFamily: 'var(--font-editorial-mono)',
                          fontSize: 11,
                          color: 'var(--forest-green)',
                          fontWeight: 700,
                        }}
                      >
                        Cash {a.cash_display}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <OpenSniperCta helper="Vos actifs en surveillance rapprochée." />
      </div>
    </AppShell>
  )
}
