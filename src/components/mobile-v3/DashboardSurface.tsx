'use client'

// Dashboard mobile surface — UX-R1 / P6 / morning-brief refinement.
//
// Hierarchy (top-down, fixed order inside AppShell V3):
//   - MobileTopHeader (compact, no version badge by default,
//     market + freshness in the extras slot)
//   - Cash master card "Ton argent" (premium deep-forest variant,
//     integrated accounts drawer)
//   - "Ce matin" morning brief (3-row max from fn_focus_today,
//     verdict + price + delta + CTA → /aujourdhui)
//   - "N actifs en surveillance" (CollapsibleSection, 5-row Sniper
//     ribbon from fn_focus_assets_list, row click jumps to /sniper)
//
// No metier recompute, no client-side ranking. All amounts, labels,
// signals and CTAs come from the backend payloads.

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, Target } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { CollapsibleSection } from '@/components/shell/CollapsibleSection'
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

// Editorial premium palette — Nexial Atelier "Papier Orné" refined.
// Direction: page éditoriale calme (Financial Times privé /
// carnet de décision), no longer parchemin jaune ni widget admin
// beige. Borders fade out, the paper itself does the framing,
// typography carries the hierarchy.
const CASH_BG = '#F5F1E8'
const CASH_BORDER = 'rgba(122, 80, 30, 0.10)'
const CASH_DIVIDER = 'rgba(122, 80, 30, 0.10)'
const CASH_INK = '#2A1E0C'
const CASH_INK_SOFT = '#5C3F12'
const CASH_SEPIA_MUTED = '#9A7E4A'
const CASH_POSITIVE = '#2D6B1F'
const CASH_NEGATIVE = '#A8302C'
const CASH_GOLD = '#B8924A'

// Editorial eyebrow — small caps mono, sepia muted, generous tracking.
// Less "system tag", more "magazine eyebrow".
const metaPale: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 9,
  color: CASH_SEPIA_MUTED,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  fontWeight: 500,
  margin: 0,
}

// Numerical "lede" — serif, large, premium. Reused for Patrimoine;
// Cash dispo overrides fontSize to enforce hierarchy (Patrimoine
// dominant, Cash subordinated).
const bigOnDark: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-serif)',
  fontSize: 30,
  fontWeight: 500,
  color: CASH_INK,
  letterSpacing: '-0.015em',
  margin: 0,
  lineHeight: 1.1,
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
      return CASH_POSITIVE
    case 'yellow':
      return CASH_GOLD
    case 'red':
      return CASH_NEGATIVE
    case 'neutral':
    default:
      return CASH_INK_SOFT
  }
}

function verdictTone(color: string | undefined): string {
  // Backend-driven verdict color → paper palette token. Same family
  // as distanceTone; kept separate so we can adjust independently.
  switch (color) {
    case 'green':
      return CASH_POSITIVE
    case 'yellow':
      return CASH_GOLD
    case 'red':
      return CASH_NEGATIVE
    case 'neutral':
    default:
      return CASH_INK_SOFT
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

// Front-side override for the freshness chip wording. Backend ships
// freshness.label_fr verbatim — but when status is FRESH the label
// can still read like "À rafraîchir" depending on backend phrasing,
// which contradicts the market being live. We override the FRESH
// case to a calm positive wording; DELAYED / STALE / other states
// keep the backend label as-is.
function computeFreshnessLabel(
  freshness: DashboardHeaderPayload['data_freshness'] | undefined,
): string | null {
  if (!freshness || !freshness.label_fr) return null
  if (freshness.status === 'FRESH') return 'Données à jour'
  return freshness.label_fr
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

  // Editorial header meta — pure typographic, no pills, no dots.
  // Replaces the shell badges (MarketStatusBadge / DataFreshnessBadge)
  // on /dashboard only with a sober two-line block: market state
  // in serif italic + freshness in tiny mono caps. Other surfaces
  // (Portfolio, Orders, Watchlist) continue to use the shell badges.
  // Wording is 100 % backend-driven: only the eu_open / us_open
  // booleans are formatted client-side ("EU ouverts" / "US ouverts"
  // / "EU et US ouverts" / "Marchés fermés"), the regime and the
  // freshness labels come verbatim from the API.
  const headerMarketLabel = (() => {
    if (!market) return null
    const eu = market.eu_open === true
    const us = market.us_open === true
    let states: string
    if (eu && us) states = 'EU et US ouverts'
    else if (eu) states = 'EU ouverts'
    else if (us) states = 'US ouverts'
    else states = 'Marchés fermés'
    const regime = market.regime_label_fr?.trim() ?? ''
    return regime ? `${states} · ${regime}` : states
  })()

  const freshnessLabel = computeFreshnessLabel(freshness)

  const marketExtras =
    headerMarketLabel || freshnessLabel ? (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 2,
        }}
      >
        {headerMarketLabel ? (
          <span
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              fontWeight: 500,
              color: CASH_INK_SOFT,
              lineHeight: 1.3,
            }}
          >
            {headerMarketLabel}
          </span>
        ) : null}
        {freshnessLabel ? (
          <span
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 11,
              fontWeight: 400,
              color: CASH_SEPIA_MUTED,
              lineHeight: 1.3,
            }}
          >
            {freshnessLabel}
          </span>
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
          data-card="cash-master"
          data-variant="editorial"
          style={{
            background: CASH_BG,
            border: `1px solid ${CASH_BORDER}`,
            borderRadius: 12,
            overflow: 'hidden',
            color: CASH_INK,
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.65) inset, 0 10px 28px rgba(122,80,30,0.06)',
          }}
        >
          <header
            style={{
              padding: '16px 20px 4px',
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
                  color: CASH_INK_SOFT,
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
                  color: CASH_INK_SOFT,
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
                padding: '2px 20px 18px',
                alignItems: 'start',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={metaPale}>Patrimoine</span>
                <span style={bigOnDark}>{patrimoine.display}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-editorial-mono)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    marginTop: 2,
                    color:
                      (patrimoine.pnl_eur ?? 0) >= 0
                        ? CASH_POSITIVE
                        : CASH_NEGATIVE,
                  }}
                >
                  {patrimoine.pnl_display}
                </span>
              </div>
              <div
                aria-hidden
                style={{
                  background: 'rgba(122, 80, 30, 0.10)',
                  margin: '6px 16px',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={metaPale}>Cash dispo</span>
                <span
                  style={{
                    ...bigOnDark,
                    fontSize: 20,
                    color:
                      Number(totals.cash_eur ?? 0) > 0
                        ? CASH_POSITIVE
                        : CASH_INK,
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
              padding: '12px 20px',
              borderTop: `1px solid ${CASH_DIVIDER}`,
              background: 'transparent',
              cursor: hasData && visibleAccounts.length > 0 ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              textAlign: 'left',
              color: CASH_INK_SOFT,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                color: CASH_INK_SOFT,
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
                color: CASH_INK,
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
                          color: CASH_POSITIVE,
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
          groupKey="dashboard-morning-brief"
          title={
            morningPriorities.length > 0
              ? `Aujourd’hui · ${morningPriorities.length} proposition${morningPriorities.length > 1 ? 's' : ''}`
              : 'Aujourd’hui'
          }
          count={null}
          subtitle={morningMarketLine || undefined}
          defaultOpen
        >
          {focusToday.loading && !focusToday.data ? (
            <p aria-busy="true" style={paragraph}>
              Chargement…
            </p>
          ) : focusToday.error ? (
            <p style={paragraph}>Certaines données n’ont pas pu être mises à jour.</p>
          ) : morningPriorities.length === 0 ? (
            <p style={paragraph}>{emptyMorningMessage(focusToday.data)}</p>
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
        </CollapsibleSection>

        <CollapsibleSection
          groupKey="dashboard-sniper-ribbon"
          title={
            sniperRibbon.length > 0
              ? `${sniperRibbon.length} actif${sniperRibbon.length > 1 ? 's' : ''} en surveillance`
              : 'Actifs en surveillance'
          }
          count={null}
          subtitle="Actifs proches d’une zone ou à suivre."
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
          {!focusAssets.loading ? (
            <button
              type="button"
              onClick={() => router.push('/sniper')}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                color: CASH_GOLD,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              {sniperRibbon.length > 0 ? 'Voir tous les snipers →' : 'Voir le radar Sniper →'}
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
          style={{ color: CASH_GOLD, flexShrink: 0 }}
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
            {Math.abs(distancePct).toFixed(2)} % avant achat
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
  const ctaLabel = 'Voir dans Aujourd’hui'

  return (
    <li
      data-ticker={item.ticker}
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: '12px 0',
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
            gap: 10,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            <span
              style={{
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 11,
                fontWeight: 600,
                color: CASH_SEPIA_MUTED,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {item.ticker}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 13,
                fontWeight: 500,
                color: CASH_INK,
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
                fontSize: 12.5,
                color: CASH_INK,
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
            gap: 10,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            {item.verdict?.label_fr ? (
              <span
                style={{
                  fontFamily: 'var(--font-editorial-sans)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: accent,
                  letterSpacing: '0.01em',
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
                  color: CASH_SEPIA_MUTED,
                  letterSpacing: '0.02em',
                }}
              >
                · {deltaDisplay}
              </span>
            ) : null}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 11.5,
              fontWeight: 600,
              color: CASH_GOLD,
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
