'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

type ScopeFilter = 'ALL' | 'PEA' | 'CTO'
type PhaseFilter = 'ALL' | 'BUY' | 'WATCH' | 'WAIT' | 'RISK'
type QualityFilter = 'ALL' | 'OK' | 'STALE' | 'NO_DATA'

function money(value?: number | null, currency = 'EUR') {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function num(value?: number | null, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value))
}

function pct(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)} %`
}

function isFresh(timestamp?: string | null) {
  if (!timestamp) return false
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return false
  return (Date.now() - date.getTime()) / 36e5 <= 48
}

function freshnessLabel(timestamp?: string | null) {
  if (!timestamp) return 'MAJ inconnue'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return 'MAJ inconnue'
  const diffHours = (Date.now() - date.getTime()) / 36e5
  if (diffHours < 24) return '< 24h'
  if (diffHours < 48) return '24-48h'
  if (diffHours < 72) return '48-72h'
  return '> 72h'
}

function zoneLabel(row: WatchlistRow) {
  if (row.buy_zone_low != null && row.buy_zone_high != null) {
    return `${money(row.buy_zone_low, row.currency || 'EUR')} - ${money(
      row.buy_zone_high,
      row.currency || 'EUR'
    )}`
  }
  return 'Aucune zone'
}

function phaseRank(phase?: string | null) {
  const p = String(phase || '').toUpperCase()
  if (p === 'BUY') return 4
  if (p === 'WATCH') return 3
  if (p === 'WAIT') return 2
  if (p === 'RISK') return 1
  return 0
}

export default function WatchlistPage() {
  const supabase = createClient()

  const [rows, setRows] = useState<WatchlistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [scope, setScope] = useState<ScopeFilter>('ALL')
  const [phase, setPhase] = useState<PhaseFilter>('ALL')
  const [quality, setQuality] = useState<QualityFilter>('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.from(VIEW).select('*')

      if (error) {
        setError(error.message)
        setRows([])
      } else {
        setRows((data || []) as WatchlistRow[])
      }

      setLoading(false)
    }

    load()
  }, [supabase])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rows.filter((row) => {
      if (scope !== 'ALL' && row.account_type !== scope) return false
      if (phase !== 'ALL' && row.nexial_phase !== phase) return false
      if (quality !== 'ALL' && row.price_quality !== quality) return false

      if (query) {
        const haystack = [
          row.ticker,
          row.asset_name,
          row.account_type,
          row.nexial_phase,
          row.nexial_action,
          row.nexial_reason,
          row.thesis,
        ]
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(query)) return false
      }

      return true
    })
  }, [rows, scope, phase, quality, search])

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const phaseDiff = phaseRank(b.nexial_phase) - phaseRank(a.nexial_phase)
      if (phaseDiff !== 0) return phaseDiff
      return Number(b.nexial_score || 0) - Number(a.nexial_score || 0)
    })
  }, [filteredRows])

  const topRows = useMemo(() => sortedRows.slice(0, 3), [sortedRows])

  const stats = useMemo(() => {
    const total = filteredRows.length
    const pea = filteredRows.filter((row) => row.account_type === 'PEA').length
    const cto = filteredRows.filter((row) => row.account_type === 'CTO').length
    const buy = filteredRows.filter((row) => row.nexial_phase === 'BUY').length
    const watch = filteredRows.filter((row) => row.nexial_phase === 'WATCH').length
    const wait = filteredRows.filter((row) => row.nexial_phase === 'WAIT').length
    const dataAlerts = filteredRows.filter((row) => row.price_quality !== 'OK').length

    const avgScore =
      total > 0
        ? filteredRows.reduce((sum, row) => sum + Number(row.nexial_score || 0), 0) / total
        : 0

    return { total, pea, cto, buy, watch, wait, dataAlerts, avgScore }
  }, [filteredRows])

  const mainDecision =
    stats.buy > 0
      ? 'Opportunités disponibles'
      : stats.watch > 0
        ? 'Surveillance active'
        : 'Attendre'

  const mainDecisionText =
    stats.buy > 0
      ? `${stats.buy} actif(s) en phase BUY. Priorité aux meilleurs scores Nexial.`
      : stats.watch > 0
        ? 'Aucun achat propre actuellement. Les actifs restent sous surveillance active.'
        : 'Aucun signal exploitable. Discipline : attendre un meilleur point d’entrée.'

  if (loading) {
    return (
      <main className="min-h-screen bg-[#111a33] p-8 text-white">
        <div className="mx-auto max-w-[1550px] rounded-[1.75rem] border border-white/10 bg-[#182441] p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
            Nexial Watchlist
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Chargement watchlist...</h1>
          <p className="mt-2 text-sm text-blue-100">Lecture de {VIEW}.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#111a33] px-5 py-5 text-white">
      <div className="mx-auto max-w-[1550px] space-y-5">
        <header className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#243763] via-[#1c2b50] to-[#151f3b] shadow-sm">
          <div className="px-7 py-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
                  Nexial Watchlist
                </p>
                <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">
                  Signaux à surveiller
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-blue-100">
                  Score Nexial, phase, zone d’achat et décision en un seul écran. Source officielle : {VIEW}.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-right backdrop-blur">
                  <p className="text-xs text-blue-200">Décision</p>
                  <p
                    className={`mt-1 text-2xl font-semibold ${
                      stats.buy > 0
                        ? 'text-emerald-300'
                        : stats.watch > 0
                          ? 'text-cyan-300'
                          : 'text-amber-300'
                    }`}
                  >
                    {mainDecision}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-right backdrop-blur">
                  <p className="text-xs text-blue-200">Score moyen</p>
                  <p className="mt-1 text-4xl font-semibold text-cyan-300">
                    {num(stats.avgScore, 0)}/100
                  </p>
                </div>
              </div>
            </div>
          </div>

          <section className="grid gap-3 border-t border-white/10 p-4 md:grid-cols-3 xl:grid-cols-7">
            <Kpi label="Actifs" value={String(stats.total)} />
            <Kpi label="PEA" value={String(stats.pea)} />
            <Kpi label="CTO" value={String(stats.cto)} />
            <Kpi label="BUY" value={String(stats.buy)} positive={stats.buy > 0} />
            <Kpi label="WATCH" value={String(stats.watch)} />
            <Kpi label="WAIT" value={String(stats.wait)} />
            <Kpi
              label="Data"
              value={stats.dataAlerts === 0 ? 'OK' : `${stats.dataAlerts} alertes`}
              danger={stats.dataAlerts > 0}
            />
          </section>
        </header>

        {error && (
          <section className="rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-200">
            Erreur Watchlist : {error}
          </section>
        )}

        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-6 shadow-sm">
            <p className="text-sm font-medium text-blue-200">Lecture Nexial</p>
            <h2
              className={`mt-2 text-4xl font-semibold ${
                stats.buy > 0
                  ? 'text-emerald-300'
                  : stats.watch > 0
                    ? 'text-cyan-300'
                    : 'text-amber-300'
              }`}
            >
              {mainDecision}
            </h2>
            <p className="mt-3 max-w-4xl text-base leading-7 text-blue-100">
              {mainDecisionText}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-6 shadow-sm">
            <p className="text-sm font-medium text-blue-200">Règles du signal</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Score + Phase + Prix
            </h2>

            <div className="mt-5 space-y-3">
              <SystemLine label="BUY" value="Prix en zone ou sous zone" ok />
              <SystemLine label="WATCH" value="Proche zone ou data à vérifier" ok />
              <SystemLine label="WAIT" value="Prix trop haut" ok />
              <SystemLine label="Source" value={VIEW} ok />
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Filtres</h2>
              <p className="text-sm text-blue-100">
                Filtre par enveloppe, phase Nexial et qualité prix.
              </p>
            </div>

            <button
              onClick={() => {
                setScope('ALL')
                setPhase('ALL')
                setQuality('ALL')
                setSearch('')
              }}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
            >
              Réinitialiser
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Select label="Liste" value={scope} onChange={(v) => setScope(v as ScopeFilter)} options={['ALL', 'PEA', 'CTO']} />
            <Select label="Phase" value={phase} onChange={(v) => setPhase(v as PhaseFilter)} options={['ALL', 'BUY', 'WATCH', 'WAIT', 'RISK']} />
            <Select label="Qualité prix" value={quality} onChange={(v) => setQuality(v as QualityFilter)} options={['ALL', 'OK', 'STALE', 'NO_DATA']} />

            <label className="space-y-2">
              <span className="text-sm font-medium text-blue-100">Recherche</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ticker, actif, raison..."
                className="h-[44px] w-full rounded-xl border border-white/10 bg-white/10 px-4 text-white outline-none transition placeholder:text-blue-200/60 hover:border-cyan-300/40 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
              />
            </label>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Top signaux</h2>
              <p className="mt-1 text-sm text-blue-100">
                Priorité aux phases BUY, puis WATCH avec les meilleurs scores.
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-blue-100">
              Top 3
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {topRows.map((row, index) => (
              <SignalCard key={row.id} row={row} index={index} />
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#182441] shadow-sm">
          <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Watchlist complète</h2>
              <p className="mt-1 text-sm text-blue-100">
                Score Nexial, phase, action, zone et raison courte.
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-blue-100">
              {filteredRows.length} lignes affichées
            </div>
          </div>

          {sortedRows.length === 0 ? (
            <div className="p-6 text-blue-100">Aucun actif pour ce filtre.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1450px] text-[13px]">
                <thead className="bg-[#1d2b4c] text-left text-blue-100">
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-3">Actif</th>
                    <th className="px-3 py-3">Liste</th>
                    <th className="px-3 py-3 text-right">Score Nexial</th>
                    <th className="px-3 py-3 text-right">Phase</th>
                    <th className="px-3 py-3 text-right">Action</th>
                    <th className="px-3 py-3 text-right">Prix</th>
                    <th className="px-3 py-3 text-right">Zone achat</th>
                    <th className="px-3 py-3 text-right">Distance</th>
                    <th className="px-3 py-3 text-right">Qualité</th>
                    <th className="px-3 py-3 text-right">MAJ prix</th>
                    <th className="px-3 py-3">Raison</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedRows.map((row) => (
                    <tr key={row.id} className="border-b border-white/10 transition hover:bg-cyan-300/5">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-white">{row.ticker}</p>
                        <p className="text-xs text-blue-200">{row.asset_name || '—'}</p>
                      </td>

                      <td className="px-3 py-3">
                        <ScopeBadge value={row.account_type || 'UNKNOWN'} />
                      </td>

                      <td className="px-3 py-3 text-right">
                        <ScoreBadge value={row.nexial_score} />
                      </td>

                      <td className="px-3 py-3 text-right">
                        <PhaseBadge value={row.nexial_phase || 'WATCH'} />
                      </td>

                      <td className="px-3 py-3 text-right">
                        <ActionBadge value={row.nexial_action || 'Surveiller'} phase={row.nexial_phase || 'WATCH'} />
                      </td>

                      <td className="px-3 py-3 text-right text-white">
                        {money(row.latest_price, row.currency || 'EUR')}
                      </td>

                      <td className="px-3 py-3 text-right text-blue-100">
                        {zoneLabel(row)}
                      </td>

                      <td className="px-3 py-3 text-right text-blue-100">
                        {pct(row.distance_to_buy_zone_pct)}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <QualityBadge value={row.price_quality || 'UNKNOWN'} />
                      </td>

                      <td className="px-3 py-3 text-right">
                        <FreshnessBadge label={freshnessLabel(row.price_timestamp)} fresh={isFresh(row.price_timestamp)} />
                      </td>

                      <td className="max-w-[340px] px-3 py-3 text-blue-100">
                        {row.nexial_reason || 'Surveillance'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function SignalCard({ row, index }: { row: WatchlistRow; index: number }) {
  const phase = row.nexial_phase || 'WATCH'

  return (
    <article
      className={`rounded-[1.35rem] border p-5 shadow-sm ${
        phase === 'BUY'
          ? 'border-emerald-300/30 bg-emerald-400/10'
          : phase === 'WATCH'
            ? 'border-cyan-300/30 bg-cyan-300/10'
            : phase === 'WAIT'
              ? 'border-amber-300/30 bg-amber-400/10'
              : 'border-white/10 bg-[#1d2b4c]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs text-blue-100">
              #{index + 1}
            </span>
            <ScopeBadge value={row.account_type || 'UNKNOWN'} />
          </div>

          <h3 className="mt-3 text-2xl font-semibold text-white">{row.ticker}</h3>
          <p className="mt-1 text-sm text-blue-100">{row.asset_name || '—'}</p>
        </div>

        <ScoreBadge value={row.nexial_score} />
      </div>

      <div className="mt-5 grid gap-3">
        <MiniInfo label="Phase" value={phase} />
        <MiniInfo label="Action" value={row.nexial_action || 'Surveiller'} />
        <MiniInfo label="Prix" value={money(row.latest_price, row.currency || 'EUR')} />
        <MiniInfo label="Zone achat" value={zoneLabel(row)} />
        <MiniInfo label="Distance" value={pct(row.distance_to_buy_zone_pct)} />
      </div>

      <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-blue-100">
        {row.nexial_reason || row.thesis || 'Surveillance active.'}
      </p>
    </article>
  )
}

function Kpi({ label, value, positive, danger }: { label: string; value: string; positive?: boolean; danger?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-sm backdrop-blur">
      <p className="text-sm font-medium text-blue-200">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${danger ? 'text-red-300' : positive ? 'text-emerald-300' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-blue-100">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-[44px] w-full rounded-xl border border-white/10 bg-[#1d2b4c] px-4 text-white outline-none transition hover:border-cyan-300/40 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#1d2b4c] text-white">
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function SystemLine({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-sm text-blue-100">{label}</span>
      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${ok ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200' : 'border-amber-300/30 bg-amber-400/10 text-amber-200'}`}>
        {value}
      </span>
    </div>
  )
}

function ScopeBadge({ value }: { value: string }) {
  const className =
    value === 'PEA'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : value === 'CTO'
        ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
        : 'border-white/10 bg-white/10 text-blue-100'

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{value}</span>
}

function ScoreBadge({ value }: { value?: number | null }) {
  const score = Number(value || 0)
  const className =
    score >= 80
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : score >= 60
        ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
        : score >= 40
          ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
          : 'border-red-300/30 bg-red-400/10 text-red-200'

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{num(score, 0)}/100</span>
}

function PhaseBadge({ value }: { value: string }) {
  const phase = value.toUpperCase()
  const className =
    phase === 'BUY'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : phase === 'WATCH'
        ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
        : phase === 'WAIT'
          ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
          : 'border-red-300/30 bg-red-400/10 text-red-200'

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{phase}</span>
}

function ActionBadge({ value, phase }: { value: string; phase: string }) {
  const normalized = phase.toUpperCase()
  const className =
    normalized === 'BUY'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : normalized === 'WATCH'
        ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
        : normalized === 'WAIT'
          ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
          : 'border-red-300/30 bg-red-400/10 text-red-200'

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{value}</span>
}

function QualityBadge({ value }: { value: string }) {
  const normalized = value.toUpperCase()
  const className =
    normalized === 'OK'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : normalized === 'STALE'
        ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
        : 'border-red-300/30 bg-red-400/10 text-red-200'

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{value}</span>
}

function FreshnessBadge({ label, fresh }: { label: string; fresh: boolean }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${fresh ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200' : 'border-amber-300/30 bg-amber-400/10 text-amber-200'}`}>
      {label}
    </span>
  )
}