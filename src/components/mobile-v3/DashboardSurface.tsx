'use client'

// Dashboard mobile surface — UX-R1 / P6 refinement.
//
// Hierarchy (top-down, all stable inside AppShell V3):
//   - MobileTopHeader (compact, no version badge by default,
//     compact freshness pill rendered in the body when STALE)
//   - Cash master card (premium dark gradient, integrated accounts
//     drawer, "Ton argent" eyebrow)
//   - Top opportunités (CollapsibleSection, 3 FocusOpportunityCard
//     items from fn_focus_today, CTA jumps to /aujourdhui)
//   - Actions en surveillance (CollapsibleSection, 5-row Sniper
//     ribbon from fn_focus_assets_list, row click jumps to /sniper)
//
// No metier recompute, no client-side ranking. All amounts, labels,
// signals and CTAs come from the backend payloads.

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, Target } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { CollapsibleSection } from '@/components/shell/CollapsibleSection'
import { DataFreshnessBadge } from '@/components/shell/DataFreshnessBadge'
import { MarketStatusBadge } from '@/components/shell/MarketStatusBadge'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
import type {
  DashboardHeaderPayload,
  FetchEnvelope,
  FocusAsset,
  FocusAssetsListPayload,
  FocusTodayItem,
  FocusTodayPayload,
  MarketContext,
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

const metaPale: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  color: 'var(--forest-green-pale)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
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
  const total = Number(a.total_eur ?? 0)
  const cash = Number(a.cash_eur ?? 0)
  const invested = Number(a.invested_eur ?? 0)
  return total > 0 || cash > 0 || invested > 0
}

function distanceTone(color: string | undefined): string {
  switch (color) {
    case 'green':
      return 'var(--forest-green)'
    case 'yellow':
      return '#8B6914'
    case 'red':
      return 'var(--burgundy)'
    case 'neutral':
    default:
      return 'var(--ink-tertiary)'
  }
}

function verdictTone(color: string | undefined): string {
  // Backend-driven verdict color → calm token. Same palette family as
  // distanceTone but used for the morning brief verdict ("Acheter /
  // Surveiller / Attendre / Ne rien faire" rendered verbatim).
  switch (color) {
    case 'green':
      return 'var(--forest-green)'
    case 'yellow':
      return '#8B6914'
    case 'red':
      return 'var(--burgundy)'
    case 'neutral':
    default:
      return 'var(--ink-secondary)'
  }
}

function buildMarketLine(ctx: MarketContext | undefined): string {
  if (!ctx) return ''
  const parts: string[] = []
  if (ctx.regime_label_fr) parts.push(ctx.regime_label_fr)
  const eu = ctx.eu_open === true
  const us = ctx.us_open === true
  if (eu && us) parts.push('EU et US ouverts')
  else if (eu) parts.push('EU ouverts')
  else if (us) parts.push('US ouverts')
  else parts.push('Marchés fermés')
  return parts.join(' · ')
}

function emptyMorningMessage(payload: FocusTodayPayload | null | undefined): string {
  const e = payload?.empty_state
  if (e && typeof e === 'object') {
    const candidate = (e as Record<string, unknown>).message_fr
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate
    }
  }
  return 'Marchés calmes ce matin, rien d’urgent.'
}

export function DashboardSurface() {
  const router = useRouter()
  const [header, setHeader] = useState<SurfaceState<DashboardHeaderPayload>>(initial)
  const [cash, setCash] = useState<SurfaceState<PortfolioCashBreakdownPayload>>(initial)
  const [focusToday, setFocusToday] = useState<SurfaceState<FocusTodayPayload>>(initial)
  const [focusAssets, setFocusAssets] = useState<SurfaceState<FocusAssetsListPayload>>(initial)
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
      fetchEnvelope<FocusTodayPayload>('/api/mobile/focus-today', ctrl.signal),
      fetchEnvelope<FocusAssetsListPayload>('/api/mobile/focus-assets-list', ctrl.signal),
    ]).then(([h, c, f, fa]) => {
      if (cancelled) return
      setHeader(h)
      setCash(c)
      setFocusToday(f)
      setFocusAssets(fa)
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
  const visibleAccounts = useMemo(() => accountsAll.filter(hasMoney), [accountsAll])

  const morningPriorities = useMemo(
    () => (focusToday.data?.priorities ?? []).slice(0, 3),
    [focusToday.data?.priorities],
  )
  const morningMarketLine = useMemo(
    () => buildMarketLine(focusToday.data?.market_context),
    [focusToday.data?.market_context],
  )

  const focusList = focusAssets.data?.focus_assets ?? []
  const sniperRibbon = useMemo(() => focusList.slice(0, 5), [focusList])

  const isLoading = header.loading || cash.loading
  const hasData = !!patrimoine && !!totals

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

  // CTA dispatch on Dashboard stays lightweight: every row in the
  // morning brief routes to /aujourdhui where modals (LadderBuilder,
  // ExitPlan, ThesisEditor) are wired. The 30-second view never opens
  // heavy UI locally.
  const goAujourdhui = () => router.push('/aujourdhui')

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
        <section
          data-card="morning-brief"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <header
            style={{
              padding: '14px 16px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 10,
                color: 'var(--ink-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
              }}
            >
              Ce matin
            </span>
            {focusToday.loading && !focusToday.data ? (
              <span style={paragraph}>Chargement…</span>
            ) : morningMarketLine ? (
              <span
                style={{
                  fontFamily: 'var(--font-editorial-sans)',
                  fontSize: 13,
                  color: 'var(--ink-secondary)',
                  lineHeight: 1.4,
                }}
              >
                {morningMarketLine}
              </span>
            ) : null}
          </header>

          {focusToday.loading && !focusToday.data ? (
            <div style={{ padding: '4px 16px 14px' }}>
              <div
                aria-busy="true"
                style={{
                  height: 52,
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid var(--border-subtle)',
                }}
              />
            </div>
          ) : focusToday.error ? (
            <div style={{ padding: '4px 16px 14px' }}>
              <p style={paragraph}>Certaines données n’ont pas pu être mises à jour.</p>
            </div>
          ) : morningPriorities.length === 0 ? (
            <div style={{ padding: '4px 16px 14px' }}>
              <p style={paragraph}>{emptyMorningMessage(focusToday.data)}</p>
            </div>
          ) : (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
              }}
            >
              {morningPriorities.map((item, idx) => (
                <MorningBriefRow
                  key={item.alert_id || item.asset_id || item.ticker}
                  item={item}
                  isLast={idx === morningPriorities.length - 1}
                  onOpen={goAujourdhui}
                />
              ))}
            </ul>
          )}
        </section>

        <section
          data-card="cash-master"
          data-variant="dark"
          style={{
            background:
              'linear-gradient(135deg, #2A5A40 0%, var(--forest-deep) 60%, #15321F 100%)',
            border: '1px solid #15321F',
            borderRadius: 12,
            overflow: 'hidden',
            color: '#FFFFFF',
            boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 6px 18px rgba(15,42,28,0.18)',
          }}
        >
          <header
            style={{
              padding: '16px 18px 4px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <span style={metaPale}>Ton argent</span>
          </header>

          {isLoading && !hasData ? (
            <div style={{ padding: '6px 18px 18px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-editorial-mono)',
                  fontSize: 14,
                  color: 'var(--forest-green-pale)',
                }}
              >
                Chargement…
              </span>
            </div>
          ) : header.error || !patrimoine || !totals ? (
            <div style={{ padding: '6px 18px 18px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-editorial-sans)',
                  fontSize: 13,
                  color: 'var(--forest-green-pale)',
                }}
              >
                Certaines données n’ont pas pu être mises à jour.
              </span>
            </div>
          ) : (
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
                    color:
                      (patrimoine.pnl_eur ?? 0) >= 0
                        ? 'var(--forest-green-pale)'
                        : '#F1A39B',
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
          )}

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
                    borderTop:
                      index === 0
                        ? '1px solid var(--border-subtle)'
                        : '1px solid var(--border-subtle)',
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

        <CollapsibleSection
          groupKey="dashboard-sniper-ribbon"
          title="Actions en surveillance"
          count={sniperRibbon.length || null}
          subtitle="Actifs en surveillance rapprochée."
          defaultOpen
        >
          {focusAssets.loading ? (
            <p aria-busy="true" style={paragraph}>
              Chargement…
            </p>
          ) : focusAssets.error ? (
            <p style={paragraph}>Certaines données n’ont pas pu être mises à jour.</p>
          ) : sniperRibbon.length === 0 ? (
            <p style={paragraph}>Aucun actif en surveillance rapprochée.</p>
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
              {sniperRibbon.map((asset, idx) => (
                <SniperRibbonRow
                  key={asset.asset_id}
                  asset={asset}
                  isLast={idx === sniperRibbon.length - 1}
                  onOpen={() => router.push('/sniper')}
                />
              ))}
            </ul>
          )}
          {focusList.length > sniperRibbon.length ? (
            <button
              type="button"
              onClick={() => router.push('/sniper')}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                color: 'var(--forest-green)',
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              Voir tous les snipers →
            </button>
          ) : null}
        </CollapsibleSection>
      </div>
    </AppShell>
  )
}

interface SniperRibbonRowProps {
  asset: FocusAsset
  isLast: boolean
  onOpen: () => void
}

function SniperRibbonRow({ asset, isLast, onOpen }: SniperRibbonRowProps) {
  const target = asset.price_targets?.[0]
  const distancePct = target?.distance_pct
  const distanceColor = asset.signal?.distance_color

  return (
    <li
      style={{
        borderTop: isLast ? 'none' : '1px solid var(--border-subtle)',
        // shift the first row up so the inner padding handles its own
        // separator above; subsequent rows take a top border.
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: '10px 0',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Target
          size={14}
          aria-hidden
          style={{ color: 'var(--forest-green)', flexShrink: 0 }}
        />
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {asset.asset_name}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 11,
              color: 'var(--ink-secondary)',
              letterSpacing: '0.03em',
            }}
          >
            {asset.ticker}
          </span>
        </span>
        {Number.isFinite(distancePct) && distancePct != null ? (
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 11,
              fontWeight: 700,
              color: distanceTone(distanceColor),
              whiteSpace: 'nowrap',
            }}
          >
            {distancePct >= 0 ? '+' : ''}
            {distancePct.toFixed(2)} % du palier
          </span>
        ) : null}
        <ChevronRight size={14} aria-hidden style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }} />
      </button>
    </li>
  )
}

const paragraph: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  color: 'var(--ink-tertiary)',
  lineHeight: 1.4,
}

interface MorningBriefRowProps {
  item: FocusTodayItem
  isLast: boolean
  onOpen: () => void
}

function MorningBriefRow({ item, isLast, onOpen }: MorningBriefRowProps) {
  const accent = verdictTone(item.verdict?.color)
  const priceDisplay =
    typeof item.context_compact?.price_display === 'string'
      ? item.context_compact.price_display
      : null
  const deltaDisplay =
    typeof item.context_compact?.delta_display === 'string'
      ? item.context_compact.delta_display
      : null
  const ctaLabel = item.cta?.label_fr ?? 'Voir plan'

  return (
    <li
      data-ticker={item.ticker}
      style={{
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: isLast ? 'none' : 'none',
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: '12px 16px',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
            <span
              aria-hidden
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: accent,
                flexShrink: 0,
                alignSelf: 'center',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--ink-primary)',
                letterSpacing: '0.02em',
              }}
            >
              {item.ticker}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--ink-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.asset_name_fr}
            </span>
          </span>
          {priceDisplay ? (
            <span
              style={{
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 13,
                color: 'var(--ink-primary)',
                whiteSpace: 'nowrap',
              }}
            >
              {priceDisplay}
            </span>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            {item.verdict?.label_fr ? (
              <span
                style={{
                  fontFamily: 'var(--font-editorial-sans)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: accent,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {item.verdict.label_fr}
              </span>
            ) : null}
            {deltaDisplay ? (
              <span
                style={{
                  fontFamily: 'var(--font-editorial-mono)',
                  fontSize: 11,
                  color: 'var(--ink-tertiary)',
                }}
              >
                {deltaDisplay}
              </span>
            ) : null}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--forest-green)',
              whiteSpace: 'nowrap',
            }}
          >
            {ctaLabel}
            <ChevronRight size={12} aria-hidden />
          </span>
        </div>
      </button>
    </li>
  )
}
