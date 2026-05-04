'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  AlertTriangle,
  ArrowDownRight,
  BadgeEuro,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Database,
  Eye,
  Filter,
  Grid3X3,
  LineChart,
  List,
  Radar,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'

const VIEW = 'vw_nexial_signal_v1'

type WatchlistRow = {
  id: string
  ticker: string
  asset_name: string | null
  account_type: string | null
  latest_price: number | null
  currency: string | null
  buy_zone_low: number | null
  buy_zone_high: number | null
  distance_to_buy_zone_pct: number | null
  zone_status: string | null
  price_quality: string | null
  priority_score: number | null
  score: number | null
  capital_efficiency_score: number | null
  nexial_score: number | null
  nexial_phase: string | null
  nexial_reason: string | null
  nexial_action: string | null
  thesis: string | null
  price_timestamp: string | null
}

type ScopeFilter = 'ALL' | 'PEA' | 'CTO' | 'UNKNOWN'
type PhaseFilter = 'ALL' | 'BUY' | 'WATCH' | 'WAIT' | 'RISK'
type QualityFilter = 'ALL' | 'OK' | 'NO_DATA' | 'STALE'
type StatusFilter = 'ALL' | 'EXECUTABLE' | 'HOT' | 'WATCH' | 'BLOCKED'
type ViewMode = 'LIST' | 'CARDS'

type OpportunityStatus =
  | 'EXECUTABLE'
  | 'HOT_PULLBACK'
  | 'WATCH_PULLBACK'
  | 'TOO_EARLY'
  | 'DEEP_PULLBACK'
  | 'BLOCKED_DATA'

type WatchlistGroup = {
  key: string
  label: string
  rows: WatchlistRow[]
  total: number
  executable: number
  hot: number
  watch: number
  blocked: number
  avgScore: number
  sort: number
}

function money(value?: number | null, currency = 'EUR') {
  if (value == null || Number.isNaN(Number(value))) return '—'

  const safeCurrency = currency && currency.length === 3 ? currency : 'EUR'

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: safeCurrency,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function num(value?: number | null, digits = 0) {
  if (value == null || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value))
}

function pct(value?: number | null, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(digits)} %`
}

function formatDate(value?: string | null) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function isFresh(value?: string | null) {
  if (!value) return false

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false

  return (Date.now() - date.getTime()) / 36e5 <= 48
}

function freshnessLabel(value?: string | null) {
  if (!value) return 'MAJ inconnue'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'MAJ inconnue'

  const diffHours = (Date.now() - date.getTime()) / 36e5

  if (diffHours < 6) return '< 6h'
  if (diffHours < 24) return '< 24h'
  if (diffHours < 48) return '24-48h'

  return '> 48h'
}

function normalizeScope(scope?: string | null): ScopeFilter {
  const value = String(scope || '').toUpperCase()

  if (value.includes('PEA')) return 'PEA'
  if (value.includes('CTO')) return 'CTO'

  return 'UNKNOWN'
}

function getPhase(row: WatchlistRow): PhaseFilter {
  const phase = String(row.nexial_phase || '').toUpperCase()

  if (phase === 'BUY') return 'BUY'
  if (phase === 'WATCH') return 'WATCH'
  if (phase === 'WAIT') return 'WAIT'
  if (phase === 'RISK') return 'RISK'

  return 'WATCH'
}

function scopeRank(scope?: string | null) {
  const value = normalizeScope(scope)

  if (value === 'PEA') return 1
  if (value === 'CTO') return 2

  return 3
}

function phaseRank(row: WatchlistRow) {
  const phase = getPhase(row)

  if (phase === 'BUY') return 4
  if (phase === 'WATCH') return 3
  if (phase === 'WAIT') return 2
  if (phase === 'RISK') return 1

  return 0
}

function priceIsOk(row: WatchlistRow) {
  return String(row.price_quality || '').toUpperCase() === 'OK'
}

function hasValidPrice(row: WatchlistRow) {
  return row.latest_price != null && Number(row.latest_price) > 0
}

function hasValidZone(row: WatchlistRow) {
  return (
    row.buy_zone_low != null &&
    row.buy_zone_high != null &&
    Number(row.buy_zone_low) > 0 &&
    Number(row.buy_zone_high) > 0 &&
    Number(row.buy_zone_low) <= Number(row.buy_zone_high)
  )
}

function zoneLabel(row: WatchlistRow) {
  if (!hasValidZone(row)) return 'Zone non définie'

  return `${money(row.buy_zone_low, row.currency || 'EUR')} – ${money(
    row.buy_zone_high,
    row.currency || 'EUR'
  )}`
}

function opportunityStatus(row: WatchlistRow): OpportunityStatus {
  if (!priceIsOk(row) || !hasValidPrice(row) || !hasValidZone(row) || !isFresh(row.price_timestamp)) {
    return 'BLOCKED_DATA'
  }

  const price = Number(row.latest_price)
  const low = Number(row.buy_zone_low)
  const high = Number(row.buy_zone_high)
  const distance = Number(row.distance_to_buy_zone_pct)

  if (price >= low && price <= high) return 'EXECUTABLE'
  if (price < low) return 'DEEP_PULLBACK'

  if (Number.isFinite(distance) && distance > 0 && distance <= 2) return 'HOT_PULLBACK'
  if (Number.isFinite(distance) && distance > 2 && distance <= 5) return 'WATCH_PULLBACK'

  return 'TOO_EARLY'
}

function isExecutable(row: WatchlistRow) {
  const phase = getPhase(row)
  const score = Number(row.nexial_score || 0)

  return opportunityStatus(row) === 'EXECUTABLE' && score >= 60 && (phase === 'BUY' || phase === 'WATCH')
}

function isHot(row: WatchlistRow) {
  const phase = getPhase(row)
  const score = Number(row.nexial_score || 0)

  return opportunityStatus(row) === 'HOT_PULLBACK' && score >= 60 && (phase === 'BUY' || phase === 'WATCH')
}

function isWatch(row: WatchlistRow) {
  const phase = getPhase(row)
  const score = Number(row.nexial_score || 0)

  return opportunityStatus(row) === 'WATCH_PULLBACK' && score >= 60 && (phase === 'BUY' || phase === 'WATCH')
}

function rankingScore(row: WatchlistRow) {
  const status = opportunityStatus(row)
  const distance = Number(row.distance_to_buy_zone_pct)
  const nexialScore = Number(row.nexial_score || 0)
  const priorityScore = Number(row.priority_score || 0)
  const capitalScore = Number(row.capital_efficiency_score || 0)

  const statusBoost =
    status === 'EXECUTABLE'
      ? 140
      : status === 'HOT_PULLBACK'
        ? 95
        : status === 'WATCH_PULLBACK'
          ? 55
          : status === 'DEEP_PULLBACK'
            ? 20
            : status === 'TOO_EARLY'
              ? -20
              : -120

  const phaseBoost =
    getPhase(row) === 'BUY'
      ? 45
      : getPhase(row) === 'WATCH'
        ? 25
        : getPhase(row) === 'WAIT'
          ? -15
          : -70

  const distancePenalty = Number.isFinite(distance) && distance > 0 ? Math.min(distance * 4, 80) : 0

  return nexialScore * 2 + priorityScore * 0.7 + capitalScore * 0.5 + statusBoost + phaseBoost - distancePenalty
}

function actionLabel(row: WatchlistRow) {
  const status = opportunityStatus(row)

  if (status === 'EXECUTABLE') return 'Achat possible'
  if (status === 'HOT_PULLBACK') return 'Attendre entrée zone'
  if (status === 'WATCH_PULLBACK') return 'Surveiller pullback'
  if (status === 'DEEP_PULLBACK') return 'Audit pullback fort'
  if (status === 'TOO_EARLY') return 'Trop tôt'
  return 'Data bloquée'
}

function decisionTitle(stats: {
  executable: number
  hot: number
  watch: number
  blocked: number
}) {
  if (stats.executable > 0) return 'ACHAT EN ZONE'
  if (stats.hot > 0) return 'PULLBACK PROCHE'
  if (stats.watch > 0) return 'SURVEILLANCE ACTIVE'
  if (stats.blocked > 0) return 'SIGNAUX BLOQUÉS'
  return 'NO ACTION — WAIT'
}

function decisionText(stats: {
  executable: number
  hot: number
  watch: number
  blocked: number
}) {
  if (stats.executable > 0) {
    return `${stats.executable} actif(s) sont réellement dans leur zone d’achat. L’achat reste conditionné à la validation finale dans Actions.`
  }

  if (stats.hot > 0) {
    return `${stats.hot} actif(s) sont très proches de zone. Nexial surveille mais bloque l’achat tant que le prix reste au-dessus.`
  }

  if (stats.watch > 0) {
    return `${stats.watch} actif(s) sont à surveiller. Pas d’achat immédiat : attendre un meilleur point d’entrée.`
  }

  if (stats.blocked > 0) {
    return 'Des actifs sont bloqués par data/zone/prix. Aucun signal ne doit être transformé en ordre.'
  }

  return 'Aucun achat propre. La bonne décision est de patienter.'
}

function statusTone(status: OpportunityStatus): 'positive' | 'warning' | 'negative' | 'neutral' | 'risk' {
  if (status === 'EXECUTABLE') return 'positive'
  if (status === 'HOT_PULLBACK') return 'warning'
  if (status === 'WATCH_PULLBACK') return 'neutral'
  if (status === 'TOO_EARLY') return 'negative'
  if (status === 'DEEP_PULLBACK') return 'warning'
  return 'risk'
}

export default function WatchlistPage() {
  const supabase = useMemo(() => createClient(), [])

  const [rows, setRows] = useState<WatchlistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [scope, setScope] = useState<ScopeFilter>('ALL')
  const [phase, setPhase] = useState<PhaseFilter>('ALL')
  const [quality, setQuality] = useState<QualityFilter>('ALL')
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('LIST')
  const [selectedRow, setSelectedRow] = useState<WatchlistRow | null>(null)

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError(null)

    const { data, error } = await supabase.from(VIEW).select('*')

    if (error) {
      setError(error.message)
      setRows([])
    } else {
      setRows((data || []) as WatchlistRow[])
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    load(false)
  }, [])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rows.filter((row) => {
      const rowScope = normalizeScope(row.account_type)
      const rowPhase = getPhase(row)
      const rowQuality = String(row.price_quality || 'NO_DATA').toUpperCase()
      const rowStatus = opportunityStatus(row)

      if (scope !== 'ALL' && rowScope !== scope) return false
      if (phase !== 'ALL' && rowPhase !== phase) return false
      if (quality !== 'ALL' && rowQuality !== quality) return false

      if (status === 'EXECUTABLE' && rowStatus !== 'EXECUTABLE') return false
      if (status === 'HOT' && rowStatus !== 'HOT_PULLBACK') return false
      if (status === 'WATCH' && rowStatus !== 'WATCH_PULLBACK') return false
      if (status === 'BLOCKED' && rowStatus !== 'BLOCKED_DATA') return false

      if (query) {
        const haystack = [
          row.ticker,
          row.asset_name,
          row.account_type,
          row.nexial_phase,
          row.nexial_action,
          row.nexial_reason,
          row.thesis,
          row.zone_status,
          row.price_quality,
        ]
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(query)) return false
      }

      return true
    })
  }, [rows, scope, phase, quality, status, search])

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const rankDiff = rankingScore(b) - rankingScore(a)
      if (rankDiff !== 0) return rankDiff

      const phaseDiff = phaseRank(b) - phaseRank(a)
      if (phaseDiff !== 0) return phaseDiff

      return Number(b.nexial_score || 0) - Number(a.nexial_score || 0)
    })
  }, [filteredRows])

  const executableRows = useMemo(() => sortedRows.filter(isExecutable).slice(0, 3), [sortedRows])
  const hotRows = useMemo(() => sortedRows.filter(isHot).slice(0, 3), [sortedRows])
  const watchRows = useMemo(() => sortedRows.filter(isWatch).slice(0, 6), [sortedRows])

  const stats = useMemo(() => {
    const total = filteredRows.length
    const pea = filteredRows.filter((row) => normalizeScope(row.account_type) === 'PEA').length
    const cto = filteredRows.filter((row) => normalizeScope(row.account_type) === 'CTO').length
    const buy = filteredRows.filter((row) => getPhase(row) === 'BUY').length
    const watch = filteredRows.filter((row) => getPhase(row) === 'WATCH').length
    const wait = filteredRows.filter((row) => getPhase(row) === 'WAIT').length
    const risk = filteredRows.filter((row) => getPhase(row) === 'RISK').length
    const executable = filteredRows.filter(isExecutable).length
    const hot = filteredRows.filter(isHot).length
    const watchPullback = filteredRows.filter(isWatch).length
    const tooEarly = filteredRows.filter((row) => opportunityStatus(row) === 'TOO_EARLY').length
    const deepPullback = filteredRows.filter((row) => opportunityStatus(row) === 'DEEP_PULLBACK').length
    const blocked = filteredRows.filter((row) => opportunityStatus(row) === 'BLOCKED_DATA').length
    const avgScore =
      total > 0
        ? filteredRows.reduce((sum, row) => sum + Number(row.nexial_score || 0), 0) / total
        : 0

    return {
      total,
      pea,
      cto,
      buy,
      watch,
      wait,
      risk,
      executable,
      hot,
      watchPullback,
      tooEarly,
      deepPullback,
      blocked,
      avgScore,
    }
  }, [filteredRows])

  const groups = useMemo((): WatchlistGroup[] => {
    const map = new Map<string, WatchlistRow[]>()

    sortedRows.forEach((row) => {
      const key = normalizeScope(row.account_type)
      const current = map.get(key) || []
      current.push(row)
      map.set(key, current)
    })

    return Array.from(map.entries())
      .map(([key, groupRows]) => {
        const total = groupRows.length
        const executable = groupRows.filter(isExecutable).length
        const hot = groupRows.filter(isHot).length
        const watch = groupRows.filter(isWatch).length
        const blocked = groupRows.filter((row) => opportunityStatus(row) === 'BLOCKED_DATA').length
        const avgScore =
          total > 0
            ? groupRows.reduce((sum, row) => sum + Number(row.nexial_score || 0), 0) / total
            : 0

        return {
          key,
          label: key,
          rows: groupRows,
          total,
          executable,
          hot,
          watch,
          blocked,
          avgScore,
          sort: scopeRank(key),
        }
      })
      .sort((a, b) => a.sort - b.sort)
  }, [sortedRows])

  function resetFilters() {
    setScope('ALL')
    setPhase('ALL')
    setQuality('ALL')
    setStatus('ALL')
    setSearch('')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#08111f] p-6 text-white">
        <div className="mx-auto max-w-[1600px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#101827] shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
          <div className="relative p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_36%),radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_32%)]" />
            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                <Database size={14} /> Nexial Watchlist
              </div>
              <h1 className="text-4xl font-semibold tracking-tight">Chargement Watchlist Master...</h1>
              <p className="mt-3 text-sm text-slate-400">
                Lecture de <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-200">{VIEW}</code>
              </p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const title = decisionTitle({
    executable: stats.executable,
    hot: stats.hot,
    watch: stats.watchPullback,
    blocked: stats.blocked,
  })

  const text = decisionText({
    executable: stats.executable,
    hot: stats.hot,
    watch: stats.watchPullback,
    blocked: stats.blocked,
  })

  return (
    <main className="min-h-screen bg-[#08111f] px-4 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-[1720px] space-y-5">
        <Hero
          title={title}
          text={text}
          stats={stats}
          refreshing={refreshing}
          onRefresh={() => load(true)}
        />

        {error && (
          <section className="rounded-[1.5rem] border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-200">
            Erreur Watchlist : {error}
          </section>
        )}

        <section className="grid gap-4 xl:grid-cols-[0.86fr_1.14fr]">
          <DecisionPanel stats={stats} title={title} text={text} />
          <TopRadarPanel
            executableRows={executableRows}
            hotRows={hotRows}
            watchRows={watchRows}
            onOpen={setSelectedRow}
          />
        </section>

        <FilterPanel
          scope={scope}
          phase={phase}
          quality={quality}
          status={status}
          search={search}
          viewMode={viewMode}
          onScope={setScope}
          onPhase={setPhase}
          onQuality={setQuality}
          onStatus={setStatus}
          onSearch={setSearch}
          onViewMode={setViewMode}
          onReset={resetFilters}
        />

        <section className="space-y-4">
          {groups.length === 0 ? (
            <div className="rounded-[1.75rem] border border-white/10 bg-[#101827]/95 p-8 text-center text-slate-400">
              Aucun actif ne correspond aux filtres actifs.
            </div>
          ) : viewMode === 'LIST' ? (
            groups.map((group) => (
              <WatchlistListBlock key={group.key} group={group} onOpen={setSelectedRow} />
            ))
          ) : (
            groups.map((group) => (
              <WatchlistCardBlock key={group.key} group={group} onOpen={setSelectedRow} />
            ))
          )}
        </section>
      </div>

      {selectedRow && <WatchlistDrawer row={selectedRow} onClose={() => setSelectedRow(null)} />}
    </main>
  )
}
function Hero({
  title,
  text,
  stats,
  refreshing,
  onRefresh,
}: {
  title: string
  text: string
  stats: {
    total: number
    pea: number
    cto: number
    executable: number
    hot: number
    watchPullback: number
    blocked: number
    avgScore: number
  }
  refreshing: boolean
  onRefresh: () => void
}) {
  const positive = stats.executable > 0
  const warning = stats.hot > 0 && stats.executable === 0

  return (
    <header className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#101827] shadow-[0_30px_120px_rgba(0,0,0,0.38)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_34%),radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.07),transparent_42%)]" />

      <div className="relative grid gap-8 p-6 lg:grid-cols-[1.25fr_0.75fr] lg:p-8">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            <Radar size={14} /> Watchlist Master · Pullback Engine
          </div>

          <h1
            className={`max-w-5xl text-5xl font-semibold tracking-[-0.055em] md:text-7xl ${
              positive ? 'text-emerald-300' : warning ? 'text-amber-300' : 'text-cyan-300'
            }`}
          >
            {title}
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">{text}</p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <HeroMetric
              label="Exécutables"
              value={String(stats.executable)}
              helper="achat uniquement ici"
              icon={<TrendingUp size={18} />}
              tone={stats.executable > 0 ? 'positive' : 'neutral'}
            />
            <HeroMetric
              label="Hot pullback"
              value={String(stats.hot)}
              helper="proche mais pas achat"
              icon={<Target size={18} />}
              tone={stats.hot > 0 ? 'warning' : 'neutral'}
            />
            <HeroMetric
              label="Data / blocages"
              value={String(stats.blocked)}
              helper="non exploitables"
              icon={stats.blocked === 0 ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              tone={stats.blocked === 0 ? 'positive' : 'warning'}
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Actualisation...' : 'Actualiser radar'}
            </button>

            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-400">
              Source : {VIEW}
            </span>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Synthèse univers</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <CompactMetric label="Univers" value={String(stats.total)} />
            <CompactMetric label="Score moyen" value={`${num(stats.avgScore, 0)}/100`} />
            <CompactMetric label="PEA" value={String(stats.pea)} />
            <CompactMetric label="CTO" value={String(stats.cto)} />
            <CompactMetric label="Surveillance" value={String(stats.watchPullback)} />
            <CompactMetric label="Blocages" value={String(stats.blocked)} />
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4 text-sm leading-6 text-slate-300">
            Règle stricte : un actif proche reste en surveillance. L’achat devient possible uniquement lorsque le prix entre dans la zone validée.
          </div>
        </aside>
      </div>
    </header>
  )
}

function DecisionPanel({
  stats,
  title,
  text,
}: {
  stats: {
    executable: number
    hot: number
    watchPullback: number
    tooEarly: number
    deepPullback: number
    blocked: number
    buy: number
    watch: number
    wait: number
    risk: number
  }
  title: string
  text: string
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[#101827]/95 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <LineChart size={18} className="text-cyan-300" /> Lecture CIO
          </div>
          <p className="mt-1 text-sm text-slate-400">Achat sur pullback seulement. Pas de breakout.</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
          Capital discipline
        </div>
      </div>

      <h2 className="text-4xl font-semibold tracking-tight text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <DecisionTile label="Achat zone" value={String(stats.executable)} icon={<TrendingUp size={18} />} tone="positive" />
        <DecisionTile label="Hot" value={String(stats.hot)} icon={<Target size={18} />} tone="warning" />
        <DecisionTile label="Watch" value={String(stats.watchPullback)} icon={<Radar size={18} />} tone="watch" />
        <DecisionTile label="Trop tôt" value={String(stats.tooEarly)} icon={<ShieldCheck size={18} />} tone="warning" />
        <DecisionTile label="Sous zone" value={String(stats.deepPullback)} icon={<ArrowDownRight size={18} />} tone="warning" />
        <DecisionTile label="Data/Risk" value={String(stats.blocked + stats.risk)} icon={<AlertTriangle size={18} />} tone="risk" />
      </div>
    </section>
  )
}

function TopRadarPanel({
  executableRows,
  hotRows,
  watchRows,
  onOpen,
}: {
  executableRows: WatchlistRow[]
  hotRows: WatchlistRow[]
  watchRows: WatchlistRow[]
  onOpen: (row: WatchlistRow) => void
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[#101827]/95 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)]">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles size={18} className="text-cyan-300" /> Top radar
          </div>
          <p className="mt-1 text-sm text-slate-400">Exécutable séparé de proche zone pour éviter les achats trop tôt.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-300">
          Top 3 strict
        </span>
      </div>

      {executableRows.length > 0 ? (
        <>
          <p className="mb-3 text-sm font-semibold text-emerald-300">En zone — achat possible</p>
          <div className="grid gap-3 lg:grid-cols-3">
            {executableRows.map((row, index) => (
              <SignalCard key={row.id} row={row} index={index} onOpen={() => onOpen(row)} />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-[1.25rem] border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          Aucun achat en zone. Ne pas créer d’ordre.
        </div>
      )}

      {hotRows.length > 0 && (
        <div className="mt-5">
          <p className="mb-3 text-sm font-semibold text-amber-300">Hot pullback — attendre entrée zone</p>
          <div className="grid gap-3 lg:grid-cols-3">
            {hotRows.map((row, index) => (
              <SignalCard key={row.id} row={row} index={index} onOpen={() => onOpen(row)} />
            ))}
          </div>
        </div>
      )}

      {hotRows.length === 0 && watchRows.length > 0 && (
        <div className="mt-5">
          <p className="mb-3 text-sm font-semibold text-cyan-300">Watch pullback</p>
          <div className="grid gap-3 lg:grid-cols-3">
            {watchRows.slice(0, 3).map((row, index) => (
              <SignalCard key={row.id} row={row} index={index} onOpen={() => onOpen(row)} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function FilterPanel({
  scope,
  phase,
  quality,
  status,
  search,
  viewMode,
  onScope,
  onPhase,
  onQuality,
  onStatus,
  onSearch,
  onViewMode,
  onReset,
}: {
  scope: ScopeFilter
  phase: PhaseFilter
  quality: QualityFilter
  status: StatusFilter
  search: string
  viewMode: ViewMode
  onScope: (value: ScopeFilter) => void
  onPhase: (value: PhaseFilter) => void
  onQuality: (value: QualityFilter) => void
  onStatus: (value: StatusFilter) => void
  onSearch: (value: string) => void
  onViewMode: (value: ViewMode) => void
  onReset: () => void
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[#101827]/95 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)]">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Filter size={18} className="text-cyan-300" /> Filtres radar
          </div>
          <p className="mt-1 text-sm text-slate-400">Enveloppe, phase, statut d’entrée, qualité prix et recherche.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <PillButton label="Global" active={scope === 'ALL'} onClick={() => onScope('ALL')} />
          <PillButton label="PEA" active={scope === 'PEA'} onClick={() => onScope('PEA')} positive />
          <PillButton label="CTO" active={scope === 'CTO'} onClick={() => onScope('CTO')} />
          <PillButton label="Executable" active={status === 'EXECUTABLE'} onClick={() => onStatus(status === 'EXECUTABLE' ? 'ALL' : 'EXECUTABLE')} positive />
          <PillButton label="Hot" active={status === 'HOT'} onClick={() => onStatus(status === 'HOT' ? 'ALL' : 'HOT')} warning />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Select label="Enveloppe" value={scope} onChange={(value) => onScope(value as ScopeFilter)} options={['ALL', 'PEA', 'CTO', 'UNKNOWN']} />
        <Select label="Phase" value={phase} onChange={(value) => onPhase(value as PhaseFilter)} options={['ALL', 'BUY', 'WATCH', 'WAIT', 'RISK']} />
        <Select label="Qualité" value={quality} onChange={(value) => onQuality(value as QualityFilter)} options={['ALL', 'OK', 'NO_DATA', 'STALE']} />
        <Select label="Statut" value={status} onChange={(value) => onStatus(value as StatusFilter)} options={['ALL', 'EXECUTABLE', 'HOT', 'WATCH', 'BLOCKED']} />

        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Recherche</span>
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Ticker, actif, thèse..."
              className="h-[46px] w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
            />
          </div>
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ViewModeSwitch value={viewMode} onChange={onViewMode} />

        <button onClick={onReset} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.07]">
          Réinitialiser
        </button>
      </div>
    </section>
  )
}

function WatchlistListBlock({
  group,
  onOpen,
}: {
  group: WatchlistGroup
  onOpen: (row: WatchlistRow) => void
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#101827]/95 shadow-[0_24px_90px_rgba(0,0,0,0.25)]">
      <WatchlistGroupHeader group={group} />

      <div className="hidden border-b border-white/10 bg-black/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 xl:grid xl:grid-cols-[1.2fr_0.55fr_0.65fr_0.7fr_0.9fr_0.75fr_0.8fr_0.8fr] xl:items-center xl:gap-3">
        <div>Actif</div>
        <div className="text-right">Score</div>
        <div className="text-right">Phase</div>
        <div className="text-right">Prix</div>
        <div className="text-right">Zone</div>
        <div className="text-right">Distance</div>
        <div className="text-right">Statut</div>
        <div className="text-right">Action</div>
      </div>

      <div className="divide-y divide-white/10">
        {group.rows.map((row) => (
          <WatchlistListRow key={row.id} row={row} onOpen={() => onOpen(row)} />
        ))}
      </div>
    </section>
  )
}

function WatchlistGroupHeader({ group }: { group: WatchlistGroup }) {
  return (
    <div className="flex flex-col gap-4 border-b border-white/10 p-5 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-cyan-300">
          {group.label === 'PEA' ? <BadgeEuro size={22} /> : group.label === 'CTO' ? <CircleDollarSign size={22} /> : <Radar size={22} />}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-white">{group.label}</h2>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">{group.total} actifs</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">Score {num(group.avgScore, 0)}/100</span>
          </div>
          <p className="mt-1 text-sm text-slate-400">Radar {group.label} · pullback only · pas d’achat trop tôt</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SmallMetric label="Zone" value={String(group.executable)} positive={group.executable > 0} />
        <SmallMetric label="Hot" value={String(group.hot)} warning={group.hot > 0} />
        <SmallMetric label="Watch" value={String(group.watch)} />
        <SmallMetric label="Data" value={group.blocked === 0 ? 'OK' : String(group.blocked)} warning={group.blocked > 0} />
      </div>
    </div>
  )
}

function WatchlistListRow({ row, onOpen }: { row: WatchlistRow; onOpen: () => void }) {
  const status = opportunityStatus(row)
  const phase = getPhase(row)

  return (
    <button onClick={onOpen} className="block w-full px-5 py-4 text-left transition hover:bg-cyan-300/5">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.55fr_0.65fr_0.7fr_0.9fr_0.75fr_0.8fr_0.8fr] xl:items-center xl:gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-white">{row.ticker}</span>
            <ScopeBadge value={normalizeScope(row.account_type)} />
            <span className="xl:hidden"><StatusBadge status={status} /></span>
          </div>
          <div className="mt-1 truncate text-sm text-slate-400">{row.asset_name || '—'}</div>
        </div>

        <ListValue value={`${num(row.nexial_score, 0)}/100`} tone={Number(row.nexial_score || 0) >= 80 ? 'positive' : 'neutral'} />
        <div className="hidden justify-end xl:flex"><PhaseBadge value={phase} /></div>
        <ListValue value={money(row.latest_price, row.currency || 'EUR')} />
        <ListValue value={zoneLabel(row)} />
        <ListValue value={pct(row.distance_to_buy_zone_pct)} tone={statusTone(status)} />
        <div className="hidden justify-end xl:flex"><StatusBadge status={status} /></div>
        <div className="hidden justify-end xl:flex"><ActionBadge value={actionLabel(row)} status={status} /></div>
      </div>
    </button>
  )
}

function WatchlistCardBlock({
  group,
  onOpen,
}: {
  group: WatchlistGroup
  onOpen: (row: WatchlistRow) => void
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#101827]/95 shadow-[0_24px_90px_rgba(0,0,0,0.25)]">
      <WatchlistGroupHeader group={group} />

      <div className="grid gap-4 p-5 xl:grid-cols-2 2xl:grid-cols-3">
        {group.rows.map((row) => (
          <WatchlistCard key={row.id} row={row} onOpen={() => onOpen(row)} />
        ))}
      </div>
    </section>
  )
}

function WatchlistCard({ row, onOpen }: { row: WatchlistRow; onOpen: () => void }) {
  const status = opportunityStatus(row)
  const phase = getPhase(row)

  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.055]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-xl font-semibold tracking-tight text-white">{row.ticker}</h3>
            <ScopeBadge value={normalizeScope(row.account_type)} />
          </div>
          <p className="mt-1 truncate text-sm text-slate-400">{row.asset_name || '—'}</p>
        </div>

        <ScoreBadge value={row.nexial_score} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <CardMetric label="Phase" value={phase} icon={<Radar size={15} />} />
        <CardMetric label="Prix" value={money(row.latest_price, row.currency || 'EUR')} icon={<Wallet size={15} />} />
        <CardMetric label="Distance" value={pct(row.distance_to_buy_zone_pct)} icon={<ArrowDownRight size={15} />} tone={statusTone(status)} />
        <CardMetric label="Statut" value={status.replace('_', ' ')} icon={<Target size={15} />} tone={statusTone(status)} />
      </div>

      <div className="mt-4 border-t border-white/10 pt-4 text-sm">
        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-600">Zone achat</div>
        <div className="mt-1 font-medium text-slate-200">{zoneLabel(row)}</div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={status} />
        <QualityBadge value={row.price_quality || 'UNKNOWN'} fresh={isFresh(row.price_timestamp)} />
        <FreshnessBadge label={freshnessLabel(row.price_timestamp)} fresh={isFresh(row.price_timestamp)} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="line-clamp-2 text-xs leading-5 text-slate-500">{row.nexial_reason || row.thesis || 'Surveillance active.'}</p>
        <button onClick={onOpen} className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10">
          Détail
        </button>
      </div>
    </article>
  )
}

function SignalCard({
  row,
  index,
  onOpen,
}: {
  row: WatchlistRow
  index: number
  onOpen: () => void
}) {
  const status = opportunityStatus(row)

  return (
    <button onClick={onOpen} className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white/[0.07]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs text-slate-200">#{index + 1}</span>
            <ScopeBadge value={normalizeScope(row.account_type)} />
          </div>
          <h3 className="mt-3 truncate text-2xl font-semibold text-white">{row.ticker}</h3>
          <p className="mt-1 truncate text-sm text-slate-300">{row.asset_name || '—'}</p>
        </div>

        <ScoreBadge value={row.nexial_score} />
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <MiniInfo label="Prix" value={money(row.latest_price, row.currency || 'EUR')} />
        <MiniInfo label="Zone" value={zoneLabel(row)} />
        <MiniInfo label="Distance" value={pct(row.distance_to_buy_zone_pct)} tone={statusTone(status)} />
      </div>

      <p className="mt-4 line-clamp-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-300">
        {status === 'EXECUTABLE'
          ? row.nexial_reason || 'Prix dans la zone. Achat possible après validation.'
          : 'Surveillance active : ne pas acheter avant entrée en zone.'}
      </p>
    </button>
  )
}

function WatchlistDrawer({ row, onClose }: { row: WatchlistRow; onClose: () => void }) {
  const status = opportunityStatus(row)
  const phase = getPhase(row)
  const fresh = isFresh(row.price_timestamp)

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <button aria-label="Fermer le détail" className="absolute inset-0 cursor-default" onClick={onClose} />

      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#07111f] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Détail opportunité</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h2 className="text-4xl font-semibold tracking-tight">{row.ticker}</h2>
              <ScopeBadge value={normalizeScope(row.account_type)} />
            </div>
            <p className="mt-1 text-slate-400">{row.asset_name || '—'}</p>
          </div>

          <button onClick={onClose} className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-slate-300 transition hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Décision Nexial</p>
              <p className="mt-1 text-2xl font-semibold text-white">{actionLabel(row)}</p>
            </div>
            <StatusBadge status={status} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            {status === 'EXECUTABLE'
              ? row.nexial_reason || 'Prix entré dans la zone. Achat possible uniquement après validation finale.'
              : 'Achat bloqué tant que le prix n’est pas dans la zone validée.'}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <DrawerMetric label="Score Nexial" value={`${num(row.nexial_score, 0)}/100`} />
          <DrawerMetric label="Phase" value={phase} />
          <DrawerMetric label="Statut" value={status.replace('_', ' ')} tone={statusTone(status)} />
          <DrawerMetric label="Prix actuel" value={money(row.latest_price, row.currency || 'EUR')} />
          <DrawerMetric label="Distance zone" value={pct(row.distance_to_buy_zone_pct)} tone={statusTone(status)} />
          <DrawerMetric label="Zone basse" value={money(row.buy_zone_low, row.currency || 'EUR')} />
          <DrawerMetric label="Zone haute" value={money(row.buy_zone_high, row.currency || 'EUR')} />
          <DrawerMetric label="Qualité prix" value={row.price_quality || 'UNKNOWN'} tone={priceIsOk(row) && fresh ? 'positive' : 'warning'} />
          <DrawerMetric label="Dernière MAJ" value={formatDate(row.price_timestamp)} />
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm font-semibold text-white">Thèse</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">{row.thesis || 'Aucune thèse renseignée.'}</p>
        </div>
      </aside>
    </div>
  )
}

function HeroMetric({ label, value, helper, icon, tone = 'neutral' }: { label: string; value: string; helper: string; icon: ReactNode; tone?: 'neutral' | 'positive' | 'warning' | 'risk' }) {
  const toneClass = tone === 'positive' ? 'text-emerald-300 border-emerald-300/20 bg-emerald-400/10' : tone === 'warning' ? 'text-amber-300 border-amber-300/20 bg-amber-400/10' : tone === 'risk' ? 'text-red-300 border-red-300/20 bg-red-400/10' : 'text-cyan-200 border-white/10 bg-white/[0.05]'

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <div className={`rounded-2xl border p-2 ${toneClass}`}>{icon}</div>
      </div>
      <div className="text-2xl font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-400">{helper}</div>
    </div>
  )
}

function DecisionTile({ label, value, icon, tone }: { label: string; value: string; icon: ReactNode; tone: 'positive' | 'warning' | 'watch' | 'risk' }) {
  const className = tone === 'positive' ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200' : tone === 'warning' ? 'border-amber-300/20 bg-amber-400/10 text-amber-200' : tone === 'risk' ? 'border-red-300/20 bg-red-400/10 text-red-200' : 'border-cyan-300/20 bg-cyan-300/10 text-cyan-200'

  return (
    <div className={`rounded-[1.25rem] border p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  )
}

function ViewModeSwitch({ value, onChange }: { value: ViewMode; onChange: (value: ViewMode) => void }) {
  return (
    <div className="inline-flex w-fit rounded-2xl border border-white/10 bg-black/10 p-1">
      <button onClick={() => onChange('LIST')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${value === 'LIST' ? 'bg-cyan-300/20 text-cyan-100 ring-1 ring-cyan-300/25' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>
        <List size={16} /> Liste
      </button>
      <button onClick={() => onChange('CARDS')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${value === 'CARDS' ? 'bg-cyan-300/20 text-cyan-100 ring-1 ring-cyan-300/25' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>
        <Grid3X3 size={16} /> Cartes
      </button>
    </div>
  )
}

function PillButton({ label, active, onClick, positive, warning }: { label: string; active: boolean; onClick: () => void; positive?: boolean; warning?: boolean }) {
  const activeClass = positive ? 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100' : warning ? 'border-amber-300/40 bg-amber-400/20 text-amber-100' : 'border-cyan-300/40 bg-cyan-300/20 text-cyan-100'

  return (
    <button onClick={onClick} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? activeClass : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.07]'}`}>
      {label}
    </button>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <div className="relative">
        <select value={value} onChange={(event) => onChange(event.target.value)} className="h-[46px] w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 pr-9 text-sm text-white outline-none transition hover:border-white/20 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10">
          {options.map((option) => (
            <option key={option} value={option} className="bg-[#101827] text-white">{option}</option>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
      </div>
    </label>
  )
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function SmallMetric({ label, value, positive, warning }: { label: string; value: string; positive?: boolean; warning?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${positive ? 'text-emerald-300' : warning ? 'text-amber-300' : 'text-white'}`}>{value}</div>
    </div>
  )
}

function MiniInfo({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'positive' | 'warning' | 'negative' | 'neutral' | 'risk' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${tone === 'positive' ? 'text-emerald-300' : tone === 'warning' ? 'text-amber-300' : tone === 'negative' ? 'text-red-300' : tone === 'risk' ? 'text-red-300' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function ListValue({ value, tone = 'neutral' }: { value: string; tone?: 'positive' | 'warning' | 'negative' | 'neutral' | 'risk' }) {
  return (
    <div className="grid grid-cols-2 items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-2 xl:block xl:border-0 xl:bg-transparent xl:px-0 xl:py-0 xl:text-right">
      <span className={`text-sm font-semibold ${tone === 'positive' ? 'text-emerald-300' : tone === 'warning' ? 'text-amber-300' : tone === 'negative' ? 'text-red-300' : tone === 'risk' ? 'text-red-300' : 'text-white'}`}>{value}</span>
    </div>
  )
}

function CardMetric({ label, value, icon, tone = 'neutral' }: { label: string; value: string; icon: ReactNode; tone?: 'positive' | 'warning' | 'negative' | 'neutral' | 'risk' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-600">
        {label}
        <span className={tone === 'positive' ? 'text-emerald-300' : tone === 'warning' ? 'text-amber-300' : tone === 'negative' ? 'text-red-300' : tone === 'risk' ? 'text-red-300' : 'text-slate-500'}>{icon}</span>
      </div>
      <div className={`truncate text-sm font-semibold ${tone === 'positive' ? 'text-emerald-300' : tone === 'warning' ? 'text-amber-300' : tone === 'negative' ? 'text-red-300' : tone === 'risk' ? 'text-red-300' : 'text-white'}`}>{value}</div>
    </div>
  )
}

function DrawerMetric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'positive' | 'warning' | 'negative' | 'neutral' | 'risk' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${tone === 'positive' ? 'text-emerald-300' : tone === 'warning' ? 'text-amber-300' : tone === 'negative' ? 'text-red-300' : tone === 'risk' ? 'text-red-300' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function ScopeBadge({ value }: { value: string }) {
  const className = value === 'PEA' ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200' : value === 'CTO' ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200' : 'border-white/10 bg-white/10 text-slate-300'

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{value}</span>
}

function ScoreBadge({ value }: { value?: number | null }) {
  const score = Number(value || 0)
  const className = score >= 80 ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200' : score >= 60 ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200' : score >= 40 ? 'border-amber-300/30 bg-amber-400/10 text-amber-200' : 'border-red-300/30 bg-red-400/10 text-red-200'

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{num(score, 0)}/100</span>
}

function PhaseBadge({ value }: { value: string }) {
  const phase = value.toUpperCase()
  const className = phase === 'BUY' ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200' : phase === 'WATCH' ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200' : phase === 'WAIT' ? 'border-amber-300/30 bg-amber-400/10 text-amber-200' : 'border-red-300/30 bg-red-400/10 text-red-200'

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{phase}</span>
}

function StatusBadge({ status }: { status: OpportunityStatus }) {
  const className =
    status === 'EXECUTABLE'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : status === 'HOT_PULLBACK'
        ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
        : status === 'WATCH_PULLBACK'
          ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
          : status === 'DEEP_PULLBACK'
            ? 'border-purple-300/30 bg-purple-400/10 text-purple-200'
            : status === 'TOO_EARLY'
              ? 'border-red-300/30 bg-red-400/10 text-red-200'
              : 'border-slate-300/20 bg-slate-400/10 text-slate-300'

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{status.replace('_', ' ')}</span>
}

function ActionBadge({ value, status }: { value: string; status: OpportunityStatus }) {
  const tone = statusTone(status)
  const className =
    tone === 'positive'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : tone === 'warning'
        ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
        : tone === 'negative'
          ? 'border-red-300/30 bg-red-400/10 text-red-200'
          : tone === 'risk'
            ? 'border-slate-300/20 bg-slate-400/10 text-slate-300'
            : 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{value}</span>
}

function QualityBadge({ value, fresh }: { value: string; fresh: boolean }) {
  const normalized = value.toUpperCase()
  const className = normalized === 'OK' && fresh ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200' : normalized === 'OK' ? 'border-amber-300/30 bg-amber-400/10 text-amber-200' : normalized === 'STALE' ? 'border-amber-300/30 bg-amber-400/10 text-amber-200' : 'border-red-300/30 bg-red-400/10 text-red-200'

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{value}</span>
}

function FreshnessBadge({ label, fresh }: { label: string; fresh: boolean }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${fresh ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200' : 'border-amber-300/30 bg-amber-400/10 text-amber-200'}`}>
      {label}
    </span>
  )
}