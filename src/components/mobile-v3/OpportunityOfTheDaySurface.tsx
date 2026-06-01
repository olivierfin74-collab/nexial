import type { CSSProperties } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/shell/AppShell'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
import type { OpportunityRecord } from '@/lib/opportunityOfTheDay'

// ---------------------------------------------------------------------------
// ADR-44 payload contract for nx.fn_opportunity_of_the_day(p_user_id).
// The backend is frozen (Claude Web 31/05/2026) — this surface reads the
// stable shape directly. Fields are optional defensively (Nexial doctrine:
// in-code guards over exhaustive tests), but the names are the contract.
// ---------------------------------------------------------------------------

interface DecisionBreakdown {
  timing?: number
  drift?: number
  quality?: number
  regime?: number
}

interface OpportunityCandidate {
  ticker?: string
  name?: string
  asset_id?: string
  currency?: string
  price?: number
  target?: number
  target_source?: string
  conviction?: string
  strategic_profile?: string
  entry_quality_score?: number
  entry_verdict?: string
  composite_score?: number
  decision_breakdown?: DecisionBreakdown
  weight_current_pct?: number
  weight_target_pct?: number
  suggested_amount_eur?: number
  suggested_account_id?: string
  suggested_account_label?: string
  reasons?: string[]
  routing_hint?: string | null
  constraint_reason?: string | null
  cto_premium_watchlist?: boolean
}

interface OpportunityPayload {
  case?: string
  date?: string
  engine?: string
  regime?: string
  cash_available_net_eur?: number
  total_candidates?: number
  assets_already_covered?: number
  dominant?: OpportunityCandidate
  secondary?: OpportunityCandidate[]
  // NO_OPPORTUNITY case
  headline?: string
  message?: string
  candidates_evaluated?: number
}

// Decision Engine composite = sum of weighted contributions.
// Max contribution per dimension (sums to 100):
const BREAKDOWN_MAX: Record<keyof DecisionBreakdown, number> = {
  timing: 40,
  drift: 30,
  quality: 20,
  regime: 10,
}

const BREAKDOWN_META: Array<{
  key: keyof DecisionBreakdown
  label: string
  color: string
}> = [
  { key: 'timing', label: 'Timing', color: '#1F4530' },
  { key: 'drift', label: 'Dérive', color: '#A0843D' },
  { key: 'quality', label: 'Qualité', color: '#B8860B' },
  { key: 'regime', label: 'Régime', color: '#8B8B8B' },
]

interface OpportunityOfTheDaySurfaceProps {
  payload: OpportunityRecord | null
  error?: string | null
}

// --- Wording doctrine (ADR-38) -------------------------------------------

const CONVICTION_LABELS: Record<string, string> = {
  STRONG_BUY: 'Forte conviction',
  CORE_HOLD: 'Maintien patrimonial',
  BUY_DIPS: 'Attente repli',
  NEUTRAL: 'Construction',
}

const PROFILE_LABELS: Record<string, string> = {
  CORE_LT: 'Cœur patrimonial',
  WATCHLIST_CONSTRUCTION: 'Watchlist construction',
  SWING_TACTIQUE: 'Swing tactique',
  DEFENSIF: 'Défensif',
}

const VERDICT_LABELS: Record<string, string> = {
  INTERESSANT: 'Conditions favorables',
  NEUTRE: 'Conditions neutres',
  TROP_TOT: 'Trop tôt — attendre repli',
  NO_BUY: 'Extension excessive',
  PULLBACK_EXPLOITABLE: 'Pullback exploitable',
}

const REGIME_LABELS: Record<string, string> = {
  BULL: 'haussier',
  BULLISH: 'haussier',
  NEUTRAL: 'neutre',
  BEARISH: 'baissier',
}

function labelFor(map: Record<string, string>, key?: string): string | null {
  if (!key) return null
  return map[key] ?? prettify(key)
}

function prettify(raw: string): string {
  return raw
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .join(' ')
    .replace(/^./, (c) => c.toUpperCase())
}

// --- Formatting ----------------------------------------------------------

function formatPrice(value?: number, currency = 'EUR'): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatWhole(value?: number, currency = 'EUR'): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPct(value?: number, digits = 1): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return `${value.toFixed(digits).replace('.', ',')} %`
}

function formatWeight(current?: number, target?: number): string | null {
  const c = formatPct(current)
  const t = formatPct(target)
  if (c && t) return `${c} → ${t}`
  return t ?? c
}

// entry_verdict est désormais un libellé FR prêt à afficher (Decision Engine).
// On garde la table VERDICT_LABELS pour les anciens codes enum éventuels.
function verdictText(raw?: string): string | null {
  if (!raw || !raw.trim()) return null
  return VERDICT_LABELS[raw] ?? raw
}

function formatUpside(price?: number, target?: number): string | null {
  if (
    typeof price !== 'number' ||
    typeof target !== 'number' ||
    !Number.isFinite(price) ||
    !Number.isFinite(target) ||
    price <= 0
  ) {
    return null
  }
  const upside = ((target - price) / price) * 100
  const rounded = upside.toFixed(1).replace('.', ',')
  const sign = upside >= 0 ? '+' : ''
  return `${sign}${rounded} %`
}

function formatScore(value?: number): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value.toFixed(1)
}

function scoreColor(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'var(--ink-tertiary)'
  if (value >= 85) return '#1F4530' // forest-deep — conviction forte
  if (value >= 75) return '#2E7D52' // vert
  if (value >= 65) return 'var(--amber)'
  return 'var(--ink-tertiary)'
}

function pluralCount(count: number, singular: string, plural: string): string {
  return `${count} ${count <= 1 ? singular : plural}`
}

// --- Surface -------------------------------------------------------------

export function OpportunityOfTheDaySurface({
  payload,
  error = null,
}: OpportunityOfTheDaySurfaceProps) {
  const data = (payload as OpportunityPayload | null) ?? null
  const dominant = isRecord(data?.dominant) ? data!.dominant! : null
  const secondary = Array.isArray(data?.secondary)
    ? data!.secondary!.filter(isRecord).slice(0, 3)
    : []
  const isNoOpportunity = data?.case === 'NO_OPPORTUNITY' || (data != null && !dominant)

  return (
    <AppShell>
      <MobileTopHeader
        eyebrow="Aujourd'hui"
        title="Opportunité du Jour"
        subtitle="L'actif le plus pertinent à considérer aujourd'hui."
        compact
      />

      <main style={surface}>
        {error ? (
          <ErrorCard detail={error} />
        ) : !data ? (
          <ErrorCard detail="Le backend n'a renvoyé aucune donnée." />
        ) : isNoOpportunity ? (
          <NoOpportunityCard data={data} />
        ) : dominant ? (
          <>
            <DominantCard candidate={dominant} />
            {secondary.length > 0 ? <SecondarySection candidates={secondary} /> : null}
          </>
        ) : null}

        {data && !error ? <Footer data={data} /> : null}
      </main>
    </AppShell>
  )
}

// --- Dominant card -------------------------------------------------------

function DominantCard({ candidate }: { candidate: OpportunityCandidate }) {
  const currency = candidate.currency ?? 'EUR'
  const profileLabel = labelFor(PROFILE_LABELS, candidate.strategic_profile)
  const convictionLabel = labelFor(CONVICTION_LABELS, candidate.conviction)
  const verdictLabel = verdictText(candidate.entry_verdict)
  const score = formatScore(candidate.composite_score)
  const dotColor = scoreColor(candidate.composite_score)

  const price = formatPrice(candidate.price, currency)
  const target = formatWhole(candidate.target, currency)
  const upside = formatUpside(candidate.price, candidate.target)
  // suggested_amount_eur est toujours libellé en EUR, indépendamment de la
  // devise de l'actif (Visa coté USD → tranche affichée en €).
  const sizing = formatWhole(candidate.suggested_amount_eur, 'EUR')
  const entryScore = formatScore(candidate.entry_quality_score)
  const weight = formatWeight(candidate.weight_current_pct, candidate.weight_target_pct)

  const meta = [
    candidate.ticker,
    profileLabel ? profileLabel.toUpperCase() : null,
    convictionLabel,
  ].filter(Boolean) as string[]

  const reasons = (candidate.reasons ?? []).filter(
    (r): r is string => typeof r === 'string' && r.trim().length > 0,
  )

  return (
    <article style={dominantCard}>
      <div style={dominantTopRow}>
        {score ? (
          <span style={scoreBadge}>
            <span style={{ ...scoreDot, background: dotColor }} aria-hidden />
            Score {score}
          </span>
        ) : <span />}
        <CandidateBadges candidate={candidate} />
      </div>

      {candidate.name ? <h1 style={dominantName}>{candidate.name}</h1> : null}
      {meta.length > 0 ? <p style={dominantMeta}>{meta.join(' · ')}</p> : null}
      {verdictLabel ? <span style={verdictTag}>{verdictLabel}</span> : null}

      <div style={divider} />

      <dl style={factsList}>
        <Fact label="Prix actuel" value={price} />
        <Fact
          label="Cible long terme"
          value={target ? (upside ? `${target}  (${upside})` : target) : null}
        />
        <Fact label="Pondération" value={weight} />
        <Fact
          label="Tranche suggérée"
          value={sizing ? `${sizing} recommandés` : null}
        />
        <Fact label="Compte suggéré" value={candidate.suggested_account_label ?? null} />
        <Fact
          label="Qualité d'entrée"
          value={entryScore ? `${entryScore}/10` : null}
        />
      </dl>

      <DecisionBreakdownPanel
        breakdown={candidate.decision_breakdown}
        composite={candidate.composite_score}
      />

      {reasons.length > 0 ? (
        <>
          <div style={divider} />
          <div>
            <p style={justificationTitle}>Justification</p>
            {reasons.length === 1 ? (
              <p style={justificationText}>{reasons[0]}</p>
            ) : (
              <ul style={reasonsList}>
                {reasons.map((reason, index) => (
                  <li key={index} style={justificationText}>
                    {reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}

      <Link href="/sniper" style={primaryCta}>
        Voir le plan d&apos;entrée
      </Link>
    </article>
  )
}

function CandidateBadges({ candidate }: { candidate: OpportunityCandidate }) {
  const ctoOnly = candidate.routing_hint === 'CTO_ONLY'
  const premium = candidate.cto_premium_watchlist === true
  if (!ctoOnly && !premium) return null

  return (
    <div style={badgeRow}>
      {ctoOnly ? <span style={ctoBadge}>À placer en CTO</span> : null}
      {premium ? <span style={premiumBadge}>★ Watchlist premium CTO</span> : null}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div style={factRow}>
      <dt style={factLabel}>{label}</dt>
      <dd style={factValue}>{value}</dd>
    </div>
  )
}

function DecisionBreakdownPanel({
  breakdown,
  composite,
}: {
  breakdown?: DecisionBreakdown
  composite?: number
}) {
  if (!breakdown) return null

  const segments = BREAKDOWN_META.map((meta) => {
    const raw = breakdown[meta.key]
    const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0
    return { ...meta, value, max: BREAKDOWN_MAX[meta.key] }
  }).filter((s) => s.value > 0)

  if (segments.length === 0) return null

  const total = segments.reduce((sum, seg) => sum + seg.value, 0)
  const scale = typeof composite === 'number' && Number.isFinite(composite) ? composite : total
  const remainder = Math.max(0, 100 - scale)

  return (
    <>
      <div style={divider} />
      <div>
        <p style={justificationTitle}>Décomposition du score</p>
        <div style={breakdownBar} role="img" aria-label="Contributions au score composite">
          {segments.map((seg) => (
            <span
              key={seg.key}
              style={{
                flexGrow: seg.value,
                flexBasis: 0,
                background: seg.color,
              }}
            />
          ))}
          {remainder > 0 ? (
            <span style={{ flexGrow: remainder, flexBasis: 0, background: 'transparent' }} />
          ) : null}
        </div>
        <div style={breakdownLegend}>
          {segments.map((seg) => (
            <span key={seg.key} style={legendItem}>
              <span style={{ ...legendDot, background: seg.color }} aria-hidden />
              {seg.label}&nbsp;{formatScore(seg.value)}
              <span style={legendMax}>/{seg.max}</span>
            </span>
          ))}
        </div>
      </div>
    </>
  )
}

// --- Secondary cards -----------------------------------------------------

function SecondarySection({ candidates }: { candidates: OpportunityCandidate[] }) {
  return (
    <section style={secondarySection}>
      <h2 style={sectionTitle}>Secondaires</h2>
      <div style={secondaryStack}>
        {candidates.map((candidate, index) => (
          <SecondaryCard
            key={candidate.ticker ?? index}
            candidate={candidate}
          />
        ))}
      </div>
    </section>
  )
}

function SecondaryCard({ candidate }: { candidate: OpportunityCandidate }) {
  const currency = candidate.currency ?? 'EUR'
  const profileLabel = labelFor(PROFILE_LABELS, candidate.strategic_profile)
  const convictionLabel = labelFor(CONVICTION_LABELS, candidate.conviction)
  const score = formatScore(candidate.composite_score)
  const dotColor = scoreColor(candidate.composite_score)

  const price = formatPrice(candidate.price, currency)
  const target = formatWhole(candidate.target, currency)
  const upside = formatUpside(candidate.price, candidate.target)
  const sizing = formatWhole(candidate.suggested_amount_eur, 'EUR')
  const weight = formatWeight(candidate.weight_current_pct, candidate.weight_target_pct)

  const heading = [candidate.ticker, candidate.name].filter(Boolean).join(' · ')
  const meta = [profileLabel, convictionLabel].filter(Boolean).join(' · ')
  const footerBits = [
    weight ? `Pondération ${weight}` : null,
    candidate.suggested_account_label,
  ].filter(Boolean)

  return (
    <article style={secondaryCard}>
      <div style={secondaryHeadRow}>
        <span style={secondaryHeading}>{heading}</span>
        {score ? (
          <span style={secondaryScore}>
            <span style={{ ...scoreDotSmall, background: dotColor }} aria-hidden />
            {score}
          </span>
        ) : null}
      </div>
      {meta ? <p style={secondaryMeta}>{meta}</p> : null}
      {price ? (
        <p style={secondaryPrice}>
          {price}
          {target ? (
            <>
              {' '}
              <span aria-hidden>→</span> {target}
              {upside ? ` (${upside})` : ''}
            </>
          ) : null}
        </p>
      ) : null}
      {sizing ? (
        <p style={secondarySizing}>Tranche suggérée&nbsp;&nbsp;{sizing}</p>
      ) : null}
      {footerBits.length > 0 ? (
        <p style={secondarySizing}>{footerBits.join(' · ')}</p>
      ) : null}
    </article>
  )
}

// --- NO_OPPORTUNITY ------------------------------------------------------

function NoOpportunityCard({ data }: { data: OpportunityPayload }) {
  const title =
    (typeof data.headline === 'string' && data.headline.trim()) ||
    "Aucune opportunité aujourd'hui"
  const message =
    (typeof data.message === 'string' && data.message.trim()) ||
    'Préserver le cash reste la meilleure décision. Patience et sélectivité.'

  return (
    <article style={dominantCard}>
      <h1 style={dominantName}>{title}</h1>
      <p style={noOpportunityMessage}>{message}</p>
    </article>
  )
}

// --- Error ---------------------------------------------------------------

function ErrorCard({ detail }: { detail: string }) {
  return (
    <article style={dominantCard}>
      <h1 style={dominantName}>Lecture indisponible</h1>
      <p style={noOpportunityMessage}>
        La source backend n&apos;a pas pu être lue.
      </p>
      <p style={errorDetail}>{detail}</p>
    </article>
  )
}

// --- Footer --------------------------------------------------------------

function Footer({ data }: { data: OpportunityPayload }) {
  const cash = formatWhole(data.cash_available_net_eur, 'EUR')
  const regime = labelFor(REGIME_LABELS, data.regime)
  const evaluated =
    typeof data.total_candidates === 'number'
      ? data.total_candidates
      : typeof data.candidates_evaluated === 'number'
        ? data.candidates_evaluated
        : null
  const covered =
    typeof data.assets_already_covered === 'number' ? data.assets_already_covered : null

  const line1 = [
    cash ? `Cash disponible : ${cash}` : null,
    regime ? `Régime marché : ${regime}` : null,
  ].filter(Boolean)

  const line2 = [
    evaluated != null
      ? pluralCount(evaluated, 'opportunité évaluée', 'opportunités évaluées')
      : null,
    covered != null
      ? `${pluralCount(covered, 'actif déjà couvert', 'actifs déjà couverts')} par ordres actifs`
      : null,
  ].filter(Boolean)

  const engine = typeof data.engine === 'string' && data.engine.trim()
    ? data.engine
        .split('_')
        .filter(Boolean)
        .map((word) =>
          /^v\d+$/i.test(word)
            ? word.toLowerCase()
            : word.charAt(0).toUpperCase() + word.slice(1),
        )
        .join(' ')
    : null

  if (line1.length === 0 && line2.length === 0 && !engine) return null

  return (
    <footer style={footer}>
      {line1.length > 0 ? <p style={footerLine}>{line1.join(' · ')}</p> : null}
      {line2.length > 0 ? <p style={footerLine}>{line2.join(' · ')}</p> : null}
      {engine ? <p style={footerLine}>Moteur décisionnel&nbsp;: {engine}</p> : null}
    </footer>
  )
}

// --- helpers -------------------------------------------------------------

function isRecord(value: unknown): value is OpportunityRecord & OpportunityCandidate {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// --- styles --------------------------------------------------------------

const surface: CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  padding: '0 16px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

const dominantCard: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 14,
  padding: 18,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
}

const dominantTopRow: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 10,
  minHeight: 22,
}

const scoreBadge: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--ink-primary)',
  letterSpacing: '0.02em',
}

const scoreDot: CSSProperties = {
  width: 9,
  height: 9,
  borderRadius: '50%',
  display: 'inline-block',
}

const badgeRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  gap: 6,
}

const ctoBadge: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  fontWeight: 700,
  color: '#fff',
  background: 'var(--amber)',
  borderRadius: 6,
  padding: '3px 8px',
  letterSpacing: '0.03em',
  whiteSpace: 'nowrap',
}

const premiumBadge: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--gold)',
  background: 'rgba(160, 132, 61, 0.12)',
  borderRadius: 6,
  padding: '3px 8px',
  letterSpacing: '0.03em',
  whiteSpace: 'nowrap',
}

const dominantName: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-serif)',
  fontSize: 28,
  lineHeight: 1.1,
  fontWeight: 500,
  color: 'var(--ink-primary)',
}

const dominantMeta: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11.5,
  color: 'var(--ink-secondary)',
  letterSpacing: '0.04em',
}

const verdictTag: CSSProperties = {
  alignSelf: 'flex-start',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--forest-deep)',
  background: 'rgba(31, 69, 48, 0.08)',
  borderRadius: 6,
  padding: '3px 9px',
}

const breakdownBar: CSSProperties = {
  display: 'flex',
  height: 8,
  borderRadius: 999,
  overflow: 'hidden',
  background: 'var(--border-subtle)',
  gap: 2,
  margin: '2px 0 8px',
}

const breakdownLegend: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px 12px',
}

const legendItem: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11,
  color: 'var(--ink-secondary)',
}

const legendDot: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: '50%',
  display: 'inline-block',
}

const legendMax: CSSProperties = {
  color: 'var(--ink-tertiary)',
}

const divider: CSSProperties = {
  height: 1,
  background: 'var(--border-subtle)',
  margin: '2px 0',
}

const factsList: CSSProperties = {
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const factRow: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 12,
}

const factLabel: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  color: 'var(--ink-secondary)',
}

const factValue: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--ink-primary)',
  textAlign: 'right',
}

const justificationTitle: CSSProperties = {
  margin: '0 0 4px',
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10.5,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--ink-tertiary)',
}

const justificationText: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 14,
  lineHeight: 1.45,
  color: 'var(--ink-secondary)',
}

const reasonsList: CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

const primaryCta: CSSProperties = {
  minHeight: 44,
  marginTop: 4,
  borderRadius: 8,
  background: 'var(--forest-deep)',
  color: '#fff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 16px',
  textDecoration: 'none',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 14,
  fontWeight: 700,
  alignSelf: 'flex-start',
}

const secondarySection: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const sectionTitle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10.5,
  color: 'var(--ink-tertiary)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

const secondaryStack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const secondaryCard: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 12,
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

const secondaryHeadRow: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 10,
}

const secondaryHeading: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 13,
  fontWeight: 800,
  color: 'var(--ink-primary)',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const secondaryScore: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--ink-primary)',
  flexShrink: 0,
}

const scoreDotSmall: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: '50%',
  display: 'inline-block',
}

const secondaryMeta: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  color: 'var(--ink-secondary)',
}

const secondaryPrice: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 12.5,
  color: 'var(--ink-primary)',
}

const secondarySizing: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  color: 'var(--ink-tertiary)',
}

const noOpportunityMessage: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 15,
  lineHeight: 1.5,
  color: 'var(--ink-secondary)',
}

const errorDetail: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11,
  lineHeight: 1.4,
  color: 'var(--burgundy)',
  wordBreak: 'break-word',
}

const footer: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '4px 2px 0',
}

const footerLine: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11,
  lineHeight: 1.5,
  color: 'var(--ink-tertiary)',
  letterSpacing: '0.02em',
}
