'use client'

// Dashboard mobile surface — patrimoine + cash + accounts breakdown.
// Mounts AppShell + MobileTopHeader so the route shares the exact
// same shell/lifecycle as every other v3 surface. Pure render-only:
// no metier logic, no client-side recompute, every label and amount
// comes verbatim from the backend.

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { CollapsibleSection } from '@/components/shell/CollapsibleSection'
import { MarketStatusBadge } from '@/components/shell/MarketStatusBadge'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
import { OpenSniperCta } from '@/components/mobile-v3/OpenSniperCta'
import type {
  DashboardHeaderPayload,
  FetchEnvelope,
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
const value: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 16,
  color: 'var(--ink-primary)',
  margin: 0,
}

export function DashboardSurface() {
  const [header, setHeader] = useState<SurfaceState<DashboardHeaderPayload>>(initial)
  const [cash, setCash] = useState<SurfaceState<PortfolioCashBreakdownPayload>>(initial)

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
  const accounts = cash.data?.accounts ?? []
  const contextLine = market?.context_fr

  const positivePnL = (patrimoine?.pnl_eur ?? 0) >= 0
  const pnlColor = positivePnL ? 'var(--forest-green)' : 'var(--burgundy)'

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
        contextLine={contextLine}
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
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <header style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={meta}>Patrimoine total</span>
            {header.loading ? (
              <span style={{ ...value, color: 'var(--ink-tertiary)' }}>Chargement…</span>
            ) : header.error || !patrimoine ? (
              <span style={{ ...value, color: 'var(--ink-tertiary)', fontSize: 14 }}>
                Certaines données n’ont pas pu être mises à jour.
              </span>
            ) : (
              <>
                <span
                  style={{
                    fontFamily: 'var(--font-editorial-serif)',
                    fontSize: 28,
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
          </header>

          {totals ? (
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px 12px',
                margin: 0,
              }}
            >
              <div>
                <dt style={meta}>Investi</dt>
                <dd style={value}>{totals.invested_display}</dd>
              </div>
              <div>
                <dt style={meta}>Cash</dt>
                <dd style={value}>{totals.cash_display}</dd>
              </div>
            </dl>
          ) : null}
        </section>

        <OpenSniperCta helper="Vos actifs en surveillance rapprochée." />

        <CollapsibleSection
          groupKey="dashboard-comptes"
          title="Comptes"
          count={accounts.length || null}
          subtitle="Investi et cash disponible par compte."
          defaultOpen={false}
        >
          {cash.loading ? (
            <p
              aria-busy="true"
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                color: 'var(--ink-tertiary)',
              }}
            >
              Chargement…
            </p>
          ) : cash.error ? (
            <p
              role="status"
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                color: 'var(--ink-secondary)',
              }}
            >
              Certaines données n’ont pas pu être mises à jour.
            </p>
          ) : accounts.length === 0 ? (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                color: 'var(--ink-tertiary)',
              }}
            >
              Aucun compte rattaché.
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
              {accounts.map((a, index) => (
                <li
                  key={a.account_id}
                  style={{
                    padding: '10px 0',
                    borderTop: index === 0 ? 'none' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      minWidth: 0,
                    }}
                  >
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
                  <span
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-editorial-mono)',
                        fontSize: 13,
                        color: 'var(--ink-primary)',
                      }}
                    >
                      {a.invested_display}
                    </span>
                    {a.cash_eur > 0 ? (
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
          )}
        </CollapsibleSection>
      </div>
    </AppShell>
  )
}
