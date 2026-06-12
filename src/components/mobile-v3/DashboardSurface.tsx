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
  ExecutionPlannerItem,
  ExecutionPlannerPayload,
  FetchEnvelope,
  PortfolioCashAccount,
  PortfolioCashBreakdownPayload,
  SniperCard,
  SniperDashboardPayload,
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

// Qualitative distance state — mirrors the Sniper page wording so the
// ribbon speaks the same language as /sniper (single source of truth).
function distanceLabel(distance_z2_pct: number | null | undefined): string | null {
  if (distance_z2_pct == null || !Number.isFinite(distance_z2_pct)) return null
  const abs = Math.abs(distance_z2_pct)
  if (abs < 1) return 'Dans la zone'
  if (abs < 3) return 'Proche zone'
  if (abs <= 10) return 'Approche'
  return 'Loin'
}

function formatTarget(value: number | null | undefined, currency: string | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value} ${currency || 'EUR'}`
  }
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

export function DashboardSurface() {
  const router = useRouter()
  const [header, setHeader] = useState<SurfaceState<DashboardHeaderPayload>>(initial)
  const [cash, setCash] = useState<SurfaceState<PortfolioCashBreakdownPayload>>(initial)
  const [sniperDash, setSniperDash] = useState<SurfaceState<SniperDashboardPayload>>(initial)
  const [planner, setPlanner] = useState<SurfaceState<ExecutionPlannerPayload>>(initial)
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
      fetchEnvelope<SniperDashboardPayload>('/api/mobile/sniper-dashboard', ctrl.signal),
      fetchEnvelope<ExecutionPlannerPayload>('/api/mobile/execution-planner', ctrl.signal),
    ]).then(([h, c, sd, ep]) => {
      if (cancelled) return
      setHeader(h)
      setCash(c)
      setSniperDash(sd)
      setPlanner(ep)
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

  // "Actifs en surveillance" = intentions Sniper ACTIVES, pas la liste
  // FOCUS (user_position_thesis) qui faisait remonter des cibles CANCELLED
  // (AI/MELI/SAP/MSFT). fn_sniper_dashboard renvoie TOUS les STRONG_BUY +
  // ceux ayant un sniper actif ; on ne garde que ceux avec une cible active.
  const activeSnipers = useMemo(
    () => (sniperDash.data?.snipers ?? []).filter((s) => (s.sniper_targets_count ?? 0) > 0),
    [sniperDash.data?.snipers],
  )
  const sniperRibbon = useMemo(() => activeSnipers.slice(0, 5), [activeSnipers])

  // Execution planner — fn_execution_planner. Ordre du payload consommé
  // verbatim, aucun tri/filtre front.
  const plannerSections = planner.data?.sections
  const prioItems = plannerSections?.priorites_cio_du_jour?.items ?? []
  const apprItems = plannerSections?.opportunites_en_approche?.items ?? []
  const plannerTotals = planner.data?.totals
  const plannerEmpty =
    !!planner.data && (plannerTotals?.priorites ?? 0) === 0 && (plannerTotals?.en_approche ?? 0) === 0

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

        {/* Plan d'exécution du jour — source unique fn_execution_planner.
            Remplace l'ancien brief fn_focus_today (AI/SAP/Adyen). */}
        {planner.loading && !planner.data ? (
          <CollapsibleSection
            groupKey="dashboard-exec-loading"
            title="Plan d’exécution du jour"
            count={null}
            defaultOpen
          >
            <p aria-busy="true" style={paragraph}>
              Chargement…
            </p>
          </CollapsibleSection>
        ) : planner.error && !planner.data ? (
          <CollapsibleSection
            groupKey="dashboard-exec-error"
            title="Plan d’exécution du jour"
            count={null}
            defaultOpen
          >
            <p style={paragraph}>Certaines données n’ont pas pu être mises à jour.</p>
          </CollapsibleSection>
        ) : plannerEmpty ? (
          <CollapsibleSection
            groupKey="dashboard-exec-empty"
            title="Plan d’exécution du jour"
            count={null}
            defaultOpen
          >
            <p style={paragraph}>
              {planner.data?.empty_state_fr ??
                'Aucune opportunité aujourd’hui — ne rien faire est une décision valide.'}
            </p>
          </CollapsibleSection>
        ) : planner.data ? (
          <>
            <ExecutionPlannerSectionView
              groupKey="dashboard-exec-prio"
              title={plannerSections?.priorites_cio_du_jour?.title_fr ?? 'Priorités CIO du jour'}
              subtitle={plannerSections?.priorites_cio_du_jour?.subtitle_fr}
              items={prioItems}
            />
            <ExecutionPlannerSectionView
              groupKey="dashboard-exec-appr"
              title={
                plannerSections?.opportunites_en_approche?.title_fr ?? 'Opportunités en approche'
              }
              subtitle={plannerSections?.opportunites_en_approche?.subtitle_fr}
              items={apprItems}
              maxItems={8}
            />
          </>
        ) : null}

        <CollapsibleSection
          groupKey="dashboard-sniper-ribbon"
          title={
            activeSnipers.length > 0
              ? `${activeSnipers.length} actif${activeSnipers.length > 1 ? 's' : ''} en surveillance`
              : 'Actifs en surveillance'
          }
          count={null}
          subtitle="Intentions Sniper actives, proches d’une zone."
          defaultOpen
        >
          {sniperDash.loading ? (
            <p aria-busy="true" style={paragraph}>
              Chargement…
            </p>
          ) : sniperDash.error ? (
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
          {!sniperDash.loading ? (
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
  asset: SniperCard
  isLast: boolean
  onOpen: () => void
}

function SniperRibbonRow({ asset, isLast, onOpen }: SniperRibbonRowProps) {
  // Enrichissement déjà calculé par fn_sniper_dashboard : prix courant,
  // couleur de distance, label qualitatif "Approche". Identique à /sniper.
  const target = asset.sniper_targets?.[0] as Record<string, unknown> | undefined
  const targetPrice = typeof target?.target_price === 'number' ? target.target_price : null
  const priceDisplay = asset.card_summary?.price_display
  const distanceColor = asset.signal?.distance_color
  const dLabel = distanceLabel(asset.signal?.distance_z2_pct ?? null)
  const cibleLabel = formatTarget(targetPrice, asset.currency)

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
        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 2,
            flexShrink: 0,
          }}
        >
          {priceDisplay ? (
            <span
              style={{
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--ink-primary)',
                whiteSpace: 'nowrap',
              }}
            >
              {priceDisplay}
            </span>
          ) : null}
          {cibleLabel || dLabel ? (
            <span
              style={{
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 10.5,
                color: 'var(--ink-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              {cibleLabel ? `Cible ${cibleLabel}` : null}
              {cibleLabel && dLabel ? ' · ' : null}
              {dLabel ? (
                <span style={{ color: distanceTone(distanceColor), fontWeight: 700 }}>
                  {dLabel}
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
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

// ─────────────────────────────────────────────────────────
// Execution planner — sections "Priorités CIO du jour" /
// "Opportunités en approche". Render-only : chaque champ vient
// déjà calculé du payload fn_execution_planner.
// ─────────────────────────────────────────────────────────
function formatNum(value: number | null | undefined, digits = 2): string | null {
  if (value == null || !Number.isFinite(value)) return null
  try {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value)
  } catch {
    return String(value)
  }
}

function formatSignedPct(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatNum(Math.abs(value), 2)} %`
}

function zoneStateTone(state: string | undefined): string {
  switch (state) {
    case 'ZONE_ATTEINTE':
      return CASH_POSITIVE
    case 'APPROCHE_ZONE':
      return CASH_GOLD
    default:
      return CASH_INK_SOFT
  }
}

function executionActionLabel(code: string | undefined): string | null {
  switch (code) {
    case 'WAIT_LIMIT_ORDER':
      return 'Ordre limite conseillé'
    case 'BUY_NOW':
    case 'EXECUTE_NOW':
      return 'Exécutable maintenant'
    case 'WAIT':
      return 'Attendre'
    default:
      return code ?? null
  }
}

function orderSideLabel(side: string | undefined): string {
  if (side === 'buy') return 'Achat'
  if (side === 'sell') return 'Vente'
  return side ?? ''
}

interface ExecutionPlannerSectionViewProps {
  groupKey: string
  title: string
  subtitle?: string
  items: ExecutionPlannerItem[]
  /** Borne d'affichage (en_approche peut renvoyer ~22 items). */
  maxItems?: number
}

function ExecutionPlannerSectionView({
  groupKey,
  title,
  subtitle,
  items,
  maxItems,
}: ExecutionPlannerSectionViewProps) {
  const shown = typeof maxItems === 'number' ? items.slice(0, maxItems) : items
  const hidden = items.length - shown.length
  return (
    <CollapsibleSection
      groupKey={groupKey}
      title={title}
      count={items.length || null}
      subtitle={subtitle}
      defaultOpen
    >
      {items.length === 0 ? (
        <p style={paragraph}>Rien dans cette section pour le moment.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map((item) => (
            <ExecutionPlannerCard key={item.asset_id || item.ticker} item={item} />
          ))}
          {hidden > 0 ? (
            <p style={paragraph}>
              +{hidden} autre{hidden > 1 ? 's' : ''} en approche
            </p>
          ) : null}
        </div>
      )}
    </CollapsibleSection>
  )
}

function ExecutionPlannerCard({ item }: { item: ExecutionPlannerItem }) {
  const zoneTone = zoneStateTone(item.zone_state)
  const tranche = item.suggested_tranche
  const order = item.order_status
  const shares = typeof tranche?.whole_shares === 'number' ? tranche.whole_shares : null
  const limit = formatNum(tranche?.limit_price_native ?? null, 2)
  const needEur = formatTarget(item.need_eur ?? null, 'EUR')
  const actionLabel = executionActionLabel(item.entry?.recommended_action)
  const distance = formatSignedPct(item.nearest_zone_distance_pct)
  const zd = item.zone_distances_pct
  const detail = order?.active_detail

  return (
    <article
      data-card="ExecutionPlannerCard"
      data-ticker={item.ticker}
      data-zone-state={item.zone_state}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${zoneTone}`,
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* En-tête : name + ticker + deployment_score */}
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-editorial-serif)',
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--ink-primary)',
              letterSpacing: 'var(--tracking-display)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.name}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--ink-tertiary)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {item.ticker}
          </span>
        </span>
        {Number.isFinite(item.deployment_score) ? (
          <span
            title="Score de déploiement"
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 13,
              fontWeight: 700,
              color: zoneTone,
              whiteSpace: 'nowrap',
            }}
          >
            {formatNum(item.deployment_score, 1)}
          </span>
        ) : null}
      </header>

      {/* Urgence + état de zone */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={execChip}>Urgence {item.urgency_score}/9</span>
        {item.zone_state_label_fr ? (
          <span style={{ ...execChip, color: zoneTone, borderColor: zoneTone }}>
            {item.zone_state_label_fr}
          </span>
        ) : null}
        {item.urgency_reason_fr ? (
          <span style={{ fontFamily: 'var(--font-editorial-sans)', fontSize: 11.5, color: 'var(--ink-tertiary)' }}>
            {item.urgency_reason_fr}
          </span>
        ) : null}
      </div>

      {/* Distance + détail zones */}
      {distance || zd ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
            flexWrap: 'wrap',
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 11.5,
            color: 'var(--ink-secondary)',
          }}
        >
          {distance ? (
            <span>
              Zone la plus proche{' '}
              <span style={{ color: zoneTone, fontWeight: 700 }}>{distance}</span>
            </span>
          ) : null}
          {zd ? (
            <span style={{ color: 'var(--ink-tertiary)' }}>
              z1 {formatSignedPct(zd.z1) ?? '—'} · z2 {formatSignedPct(zd.z2) ?? '—'} · z3{' '}
              {formatSignedPct(zd.z3) ?? '—'}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Exécution : tranche suggérée + besoin + action */}
      <dl
        style={{
          margin: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(110px,auto) 1fr',
          rowGap: 4,
          columnGap: 12,
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 13,
        }}
      >
        {shares != null && limit ? (
          <>
            <dt style={execMeta}>Tranche</dt>
            <dd style={{ ...execValue, justifySelf: 'end' }}>
              {shares} × {limit}
              {item.suggested_account_label ? (
                <span style={{ color: 'var(--ink-tertiary)' }}> · {item.suggested_account_label}</span>
              ) : null}
            </dd>
          </>
        ) : null}
        {needEur ? (
          <>
            <dt style={execMeta}>Besoin</dt>
            <dd style={{ ...execValue, justifySelf: 'end' }}>{needEur}</dd>
          </>
        ) : null}
        {actionLabel ? (
          <>
            <dt style={execMeta}>Action</dt>
            <dd style={{ ...execValue, justifySelf: 'end' }}>{actionLabel}</dd>
          </>
        ) : null}
      </dl>

      {/* État ordre */}
      {order?.active ? (
        <span style={{ ...execChip, color: CASH_GOLD, borderColor: CASH_GOLD }}>
          Ordre actif
          {detail
            ? ` · ${orderSideLabel(detail.side)} ${
                typeof detail.quantity === 'number' ? Math.round(detail.quantity) : ''
              }${detail.limit_price != null ? ` @ ${formatNum(detail.limit_price, 2)}` : ''}`
            : ''}
        </span>
      ) : order?.executed_recent ? (
        <span style={{ ...execChip, color: CASH_POSITIVE, borderColor: CASH_POSITIVE }}>
          Exécuté récemment
        </span>
      ) : null}
    </article>
  )
}

const execChip: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '3px 9px',
  borderRadius: 999,
  border: '1px solid var(--border-subtle)',
  background: 'transparent',
  color: 'var(--ink-secondary)',
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
}

const execMeta: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  color: 'var(--ink-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontWeight: 500,
}

const execValue: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  color: 'var(--ink-primary)',
  fontWeight: 600,
}
