'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const VIEW = 'vw_portfolio_positions_ui_v2'

type PositionRow = {
  position_id: string
  account_id: string
  account_name: string | null
  account_type: string | null
  broker_code: string | null
  ticker: string
  asset_name: string | null
  asset_type: string | null
  asset_bucket: string | null
  sector: string | null
  country: string | null
  pea_eligible: boolean | null
  quantity: number | null
  pru: number | null
  currency: string | null
  broker_price: number | null
  live_price: number | null
  price_source: string | null
  value_native: number | null
  value_eur: number | null
  pnl_native: number | null
  pnl_eur: number | null
  pnl_pct: number | null
  portfolio_weight_pct: number | null
  account_weight_pct: number | null
  data_quality: string | null
  updated_at: string | null
}

type ScopeFilter = 'ALL' | 'PEA' | 'CTO'

function eur(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function money(value?: number | null, currency = 'EUR') {
  if (value == null || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function pct(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)} %`
}

function num(value?: number | null, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value))
}

function isDataOk(value?: string | null) {
  return String(value || '').toUpperCase() === 'OK'
}

function freshnessLabel(updatedAt?: string | null) {
  if (!updatedAt) return 'MAJ inconnue'

  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return 'MAJ inconnue'

  const diffHours = (Date.now() - date.getTime()) / 36e5

  if (diffHours < 24) return '< 24h'
  if (diffHours < 48) return '24-48h'
  if (diffHours < 72) return '48-72h'

  return '> 72h'
}

function isFresh(updatedAt?: string | null) {
  if (!updatedAt) return false

  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return false

  const diffHours = (Date.now() - date.getTime()) / 36e5
  return diffHours <= 72
}

function getDecision(score: number, pnlPct: number | null, cashStatus: string, dataAlerts: number) {
  if (dataAlerts > 0) {
    return {
      label: 'Contrôler les données',
      tone: 'watch' as const,
      text: 'Certaines données prix ou positions doivent être vérifiées avant toute décision forte.',
    }
  }

  if (score >= 75 && (pnlPct ?? 0) >= 5) {
    return {
      label: 'Portefeuille solide',
      tone: 'good' as const,
      text: 'La structure est saine. Continuer à privilégier les opportunités en zone plutôt que l’achat forcé.',
    }
  }

  if (score >= 60) {
    return {
      label: 'Attendre / Sélectif',
      tone: 'wait' as const,
      text: 'Le portefeuille est correct. Déployer uniquement sur les meilleures opportunités avec prix validé.',
    }
  }

  return {
    label: 'Optimiser',
    tone: 'risk' as const,
    text: 'Le portefeuille mérite une revue : concentration, faiblesse relative ou qualité data à améliorer.',
  }
}

function getPortfolioRegime(score: number) {
  if (score >= 80) return 'Excellent'
  if (score >= 70) return 'Solide'
  if (score >= 60) return 'Neutre'
  if (score >= 45) return 'Fragile'
  return 'À revoir'
}

export default function PerformancePage() {
  const supabase = createClient()

  const [rows, setRows] = useState<PositionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scope, setScope] = useState<ScopeFilter>('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from(VIEW)
        .select('*')

      if (error) {
        setError(error.message)
        setRows([])
      } else {
        setRows((data || []) as PositionRow[])
      }

      setLoading(false)
    }

    load()
  }, [supabase])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rows.filter((row) => {
      if (scope !== 'ALL' && row.account_type !== scope) return false

      if (query) {
        const haystack = [
          row.ticker,
          row.asset_name,
          row.account_name,
          row.broker_code,
          row.asset_bucket,
          row.sector,
          row.country,
        ]
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(query)) return false
      }

      return true
    })
  }, [rows, scope, search])

  const stats = useMemo(() => {
    const value = filteredRows.reduce((sum, row) => sum + Number(row.value_eur || 0), 0)
    const pnl = filteredRows.reduce((sum, row) => sum + Number(row.pnl_eur || 0), 0)
    const cost = value - pnl
    const pnlPct = cost !== 0 ? (pnl / cost) * 100 : null

    const pea = filteredRows
      .filter((row) => row.account_type === 'PEA')
      .reduce((sum, row) => sum + Number(row.value_eur || 0), 0)

    const cto = filteredRows
      .filter((row) => row.account_type === 'CTO')
      .reduce((sum, row) => sum + Number(row.value_eur || 0), 0)

    const winners = filteredRows.filter((row) => Number(row.pnl_eur || 0) > 0).length
    const losers = filteredRows.filter((row) => Number(row.pnl_eur || 0) < 0).length

    const dataAlerts = filteredRows.filter((row) => !isDataOk(row.data_quality)).length
    const oldData = filteredRows.filter((row) => !isFresh(row.updated_at)).length

    const sortedByWeight = [...filteredRows].sort(
      (a, b) => Number(b.portfolio_weight_pct || 0) - Number(a.portfolio_weight_pct || 0)
    )

    const topWeight = sortedByWeight[0]
    const topWeightPct = Number(topWeight?.portfolio_weight_pct || 0)

    const best = [...filteredRows].sort(
      (a, b) => Number(b.pnl_pct || 0) - Number(a.pnl_pct || 0)
    )[0]

    const worst = [...filteredRows].sort(
      (a, b) => Number(a.pnl_pct || 0) - Number(b.pnl_pct || 0)
    )[0]

    const avgPnlPct =
      filteredRows.length > 0
        ? filteredRows.reduce((sum, row) => sum + Number(row.pnl_pct || 0), 0) / filteredRows.length
        : null

    const positiveRatio =
      filteredRows.length > 0 ? (winners / filteredRows.length) * 100 : null

    const concentrationPenalty = Math.min(Math.max(topWeightPct - 10, 0) * 2, 25)
    const performanceScore = Math.max(Math.min((pnlPct ?? 0) * 2 + 50, 100), 0)
    const breadthScore = positiveRatio ?? 0
    const dataScore = Math.max(100 - (dataAlerts + oldData) * 12, 0)

    const portfolioScore = Math.round(
      performanceScore * 0.4 +
        breadthScore * 0.25 +
        dataScore * 0.2 +
        (100 - concentrationPenalty) * 0.15
    )

    const cashStatus =
      value > 0 && pea + cto > 0
        ? 'Investi'
        : 'Non disponible'

    const decision = getDecision(portfolioScore, pnlPct, cashStatus, dataAlerts + oldData)
    const regime = getPortfolioRegime(portfolioScore)

    return {
      value,
      pnl,
      pnlPct,
      pea,
      cto,
      winners,
      losers,
      dataAlerts,
      oldData,
      topWeight,
      topWeightPct,
      best,
      worst,
      avgPnlPct,
      positiveRatio,
      portfolioScore,
      performanceScore,
      breadthScore,
      dataScore,
      concentrationPenalty,
      decision,
      regime,
    }
  }, [filteredRows])

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort(
      (a, b) => Number(b.value_eur || 0) - Number(a.value_eur || 0)
    )
  }, [filteredRows])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#111a33] p-8 text-white">
        <div className="mx-auto max-w-[1500px] rounded-[1.75rem] border border-white/10 bg-[#182441] p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
            Nexial Performance
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Chargement performance...</h1>
          <p className="mt-2 text-sm text-blue-100">
            Lecture de {VIEW}.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#111a33] px-5 py-5 text-white">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#243763] via-[#1c2b50] to-[#151f3b] shadow-sm">
          <div className="px-7 py-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
                  Nexial Performance
                </p>
                <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">
                  Performance décisionnelle
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-blue-100">
                  Diagnostic du portefeuille, score Nexial, concentration, performance et décision prioritaire.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-right backdrop-blur">
                  <p className="text-xs text-blue-200">Score Nexial</p>
                  <p className="mt-1 text-4xl font-semibold text-cyan-300">
                    {stats.portfolioScore}/100
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-right backdrop-blur">
                  <p className="text-xs text-blue-200">Décision</p>
                  <p
                    className={`mt-1 text-2xl font-semibold ${
                      stats.decision.tone === 'good'
                        ? 'text-emerald-300'
                        : stats.decision.tone === 'wait'
                          ? 'text-amber-300'
                          : stats.decision.tone === 'risk'
                            ? 'text-red-300'
                            : 'text-cyan-300'
                    }`}
                  >
                    {stats.decision.label}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <section className="grid gap-3 border-t border-white/10 p-4 md:grid-cols-3 xl:grid-cols-7">
            <Kpi label="Valeur" value={eur(stats.value)} />
            <Kpi label="P&L" value={eur(stats.pnl)} positive={stats.pnl >= 0} danger={stats.pnl < 0} />
            <Kpi label="Performance" value={pct(stats.pnlPct)} positive={(stats.pnlPct ?? 0) >= 0} danger={(stats.pnlPct ?? 0) < 0} />
            <Kpi label="PEA" value={eur(stats.pea)} />
            <Kpi label="CTO" value={eur(stats.cto)} />
            <Kpi label="Gagnants / Perdants" value={`${stats.winners} / ${stats.losers}`} />
            <Kpi label="Data" value={stats.dataAlerts + stats.oldData === 0 ? 'OK' : `${stats.dataAlerts + stats.oldData} alertes`} danger={stats.dataAlerts + stats.oldData > 0} />
          </section>
        </header>

        {error && (
          <section className="rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-200">
            Erreur Performance : {error}
          </section>
        )}

        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-6 shadow-sm">
            <p className="text-sm font-medium text-blue-200">Synthèse Nexial</p>
            <h2 className="mt-2 text-4xl font-semibold text-white">
              {stats.regime}
            </h2>
            <p className="mt-3 max-w-4xl text-base leading-7 text-blue-100">
              {stats.decision.text}
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <ScoreCard label="Performance" value={stats.performanceScore} />
              <ScoreCard label="Largeur" value={stats.breadthScore} />
              <ScoreCard label="Data" value={stats.dataScore} />
              <ScoreCard label="Concentration" value={100 - stats.concentrationPenalty} />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-6 shadow-sm">
            <p className="text-sm font-medium text-blue-200">Risque principal</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {stats.topWeight?.ticker || '—'}
            </h2>

            <div className="mt-5 space-y-3">
              <SystemLine label="Poids 1re ligne" value={pct(stats.topWeightPct)} ok={stats.topWeightPct <= 10} />
              <SystemLine label="Performance moyenne" value={pct(stats.avgPnlPct)} ok={(stats.avgPnlPct ?? 0) >= 0} />
              <SystemLine label="Positions positives" value={pct(stats.positiveRatio)} ok={(stats.positiveRatio ?? 0) >= 50} />
              <SystemLine label="Vue source" value={VIEW} ok />
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <InsightCard
            title="Top performance"
            ticker={stats.best?.ticker}
            name={stats.best?.asset_name}
            value={pct(stats.best?.pnl_pct)}
            subValue={eur(stats.best?.pnl_eur)}
            tone="good"
          />

          <InsightCard
            title="Point faible"
            ticker={stats.worst?.ticker}
            name={stats.worst?.asset_name}
            value={pct(stats.worst?.pnl_pct)}
            subValue={eur(stats.worst?.pnl_eur)}
            tone="bad"
          />
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Filtres</h2>
              <p className="text-sm text-blue-100">
                Analyse globale, PEA ou CTO.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <QuickButton label="Tous" active={scope === 'ALL'} onClick={() => setScope('ALL')} />
              <QuickButton label="PEA" active={scope === 'PEA'} onClick={() => setScope('PEA')} />
              <QuickButton label="CTO" active={scope === 'CTO'} onClick={() => setScope('CTO')} />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un actif..."
                className="h-[40px] min-w-[260px] rounded-full border border-white/10 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-blue-200/60 hover:border-cyan-300/40 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#182441] shadow-sm">
          <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Détail des positions</h2>
              <p className="mt-1 text-sm text-blue-100">
                Triées par poids dans le portefeuille.
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-blue-100">
              {filteredRows.length} lignes affichées
            </div>
          </div>

          {sortedRows.length === 0 ? (
            <div className="p-6 text-blue-100">
              Aucune position pour ce filtre.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-[13px]">
                <thead className="bg-[#1d2b4c] text-left text-blue-100">
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-3">Actif</th>
                    <th className="px-3 py-3">Compte</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3 text-right">Valeur</th>
                    <th className="px-3 py-3 text-right">P&L</th>
                    <th className="px-3 py-3 text-right">Perf</th>
                    <th className="px-3 py-3 text-right">Poids</th>
                    <th className="px-3 py-3 text-right">Cours</th>
                    <th className="px-3 py-3 text-right">PRU</th>
                    <th className="px-3 py-3 text-right">Data</th>
                    <th className="px-3 py-3 text-right">MAJ</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedRows.map((row) => {
                    const pnlPositive = Number(row.pnl_eur || 0) >= 0

                    return (
                      <tr key={row.position_id || `${row.account_name}-${row.ticker}`} className="border-b border-white/10 transition hover:bg-cyan-300/5">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-white">{row.ticker}</p>
                          <p className="text-xs text-blue-200">{row.asset_name || '—'}</p>
                        </td>

                        <td className="px-3 py-3 text-blue-100">
                          {row.account_name || '—'}
                        </td>

                        <td className="px-3 py-3">
                          <ScopeBadge value={row.account_type || 'UNKNOWN'} />
                        </td>

                        <td className="px-3 py-3 text-right font-semibold text-white">
                          {eur(row.value_eur)}
                        </td>

                        <td className={`px-3 py-3 text-right font-semibold ${pnlPositive ? 'text-emerald-300' : 'text-red-300'}`}>
                          {eur(row.pnl_eur)}
                        </td>

                        <td className={`px-3 py-3 text-right font-semibold ${Number(row.pnl_pct || 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                          {pct(row.pnl_pct)}
                        </td>

                        <td className="px-3 py-3 text-right text-blue-100">
                          {pct(row.portfolio_weight_pct)}
                        </td>

                        <td className="px-3 py-3 text-right text-blue-100">
                          {money(row.live_price, row.currency || 'EUR')}
                        </td>

                        <td className="px-3 py-3 text-right text-blue-100">
                          {money(row.pru, row.currency || 'EUR')}
                        </td>

                        <td className="px-3 py-3 text-right">
                          <QualityBadge value={row.data_quality || 'UNKNOWN'} />
                        </td>

                        <td className="px-3 py-3 text-right">
                          <FreshnessBadge
                            label={freshnessLabel(row.updated_at)}
                            fresh={isFresh(row.updated_at)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function Kpi({
  label,
  value,
  positive,
  danger,
}: {
  label: string
  value: string
  positive?: boolean
  danger?: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-sm backdrop-blur">
      <p className="text-sm font-medium text-blue-200">{label}</p>
      <p
        className={`mt-2 text-xl font-semibold ${
          danger ? 'text-red-300' : positive ? 'text-emerald-300' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function ScoreCard({
  label,
  value,
}: {
  label: string
  value: number
}) {
  const safeValue = Math.round(Math.max(Math.min(value || 0, 100), 0))

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{safeValue}/100</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-cyan-300"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  )
}

function SystemLine({
  label,
  value,
  ok,
}: {
  label: string
  value: string
  ok: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-sm text-blue-100">{label}</span>
      <span
        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
          ok
            ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
            : 'border-amber-300/30 bg-amber-400/10 text-amber-200'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function InsightCard({
  title,
  ticker,
  name,
  value,
  subValue,
  tone,
}: {
  title: string
  ticker?: string
  name?: string | null
  value: string
  subValue: string
  tone: 'good' | 'bad'
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-6 shadow-sm">
      <p className="text-sm font-medium text-blue-200">{title}</p>
      <h3 className="mt-3 text-3xl font-semibold text-white">{ticker || '—'}</h3>
      <p className="mt-1 text-sm text-blue-100">{name || '—'}</p>
      <div className="mt-5 flex items-end justify-between">
        <p className={`text-3xl font-semibold ${tone === 'good' ? 'text-emerald-300' : 'text-red-300'}`}>
          {value}
        </p>
        <p className={`text-lg font-semibold ${tone === 'good' ? 'text-emerald-300' : 'text-red-300'}`}>
          {subValue}
        </p>
      </div>
    </div>
  )
}

function QuickButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-cyan-300/20 text-cyan-100 ring-1 ring-cyan-300/30'
          : 'border border-white/10 bg-white/10 text-blue-100 hover:bg-white/15'
      }`}
    >
      {label}
    </button>
  )
}

function ScopeBadge({ value }: { value: string }) {
  const className =
    value === 'PEA'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : value === 'CTO'
        ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
        : 'border-white/10 bg-white/10 text-blue-100'

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {value}
    </span>
  )
}

function QualityBadge({ value }: { value: string }) {
  const normalized = value.toUpperCase()

  const className =
    normalized === 'OK'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : normalized.includes('FALLBACK') || normalized.includes('MISSING') || normalized.includes('STALE')
        ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
        : 'border-red-300/30 bg-red-400/10 text-red-200'

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {value}
    </span>
  )
}

function FreshnessBadge({
  label,
  fresh,
}: {
  label: string
  fresh: boolean
}) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
        fresh
          ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
          : 'border-amber-300/30 bg-amber-400/10 text-amber-200'
      }`}
    >
      {label}
    </span>
  )
}