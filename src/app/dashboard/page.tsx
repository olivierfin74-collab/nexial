'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const INVEST_VIEW = 'vw_invest_ui_v1'

type InvestRow = {
  id: string
  ticker: string
  asset_name: string
  display_subtitle: string | null
  amount_suggested: number | null
  suggested_quantity: number | null
  buy_zone_low: number | null
  buy_zone_high: number | null
  score: number | null
  capital_efficiency_score: number | null
  expected_return_pct: number | null
  decision: string | null
  reason: string | null
  latest_close_price: number | null
  currency: string | null
  price_quality: string | null
  price_source: string | null
  updated_at: string | null
}

type PatrimoineTotal = {
  total_positions_eur: number | null
  total_cash_eur: number | null
  total_general_eur: number | null
}

function eur(value?: number | null) {
  if (value == null) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function money(value?: number | null, currency = 'EUR') {
  if (value == null) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function num(value?: number | null, digits = 2) {
  if (value == null) return '—'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value))
}

function pct(value?: number | null) {
  if (value == null) return '—'
  return `${num(value, 2)} %`
}

function isActionable(row: InvestRow) {
  const decision = String(row.decision || '').toUpperCase()
  const quality = String(row.price_quality || '').toUpperCase()

  return (
    quality === 'OK' &&
    (decision.includes('READY') || decision.includes('BUY') || decision.includes('ACHAT'))
  )
}

function isDataFresh(updatedAt?: string | null) {
  if (!updatedAt) return false

  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return false

  const diffHours = (Date.now() - date.getTime()) / 36e5
  return diffHours <= 48
}

function freshnessLabel(updatedAt?: string | null) {
  if (!updatedAt) return 'MAJ inconnue'

  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return 'MAJ inconnue'

  const diffHours = (Date.now() - date.getTime()) / 36e5

  if (diffHours < 24) return '< 24h'
  if (diffHours < 48) return '24-48h'
  return '> 48h'
}

function decisionBadgeClass(decision?: string | null) {
  const value = String(decision || '').toUpperCase()

  if (value.includes('READY') || value.includes('BUY') || value.includes('ACHAT')) {
    return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
  }

  if (value.includes('SURVEILLANCE') || value.includes('WAIT') || value.includes('ATTENDRE')) {
    return 'border-amber-300/30 bg-amber-400/10 text-amber-200'
  }

  return 'border-white/10 bg-white/10 text-blue-100'
}

function qualityBadgeClass(quality?: string | null) {
  const value = String(quality || '').toUpperCase()

  if (value === 'OK') return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'

  if (value.includes('STALE') || value.includes('FALLBACK') || value.includes('UNKNOWN')) {
    return 'border-amber-300/30 bg-amber-400/10 text-amber-200'
  }

  return 'border-red-300/30 bg-red-400/10 text-red-200'
}

function zoneLabel(row: InvestRow) {
  if (row.buy_zone_low != null && row.buy_zone_high != null) {
    return `${money(row.buy_zone_low, row.currency || 'EUR')} - ${money(
      row.buy_zone_high,
      row.currency || 'EUR'
    )}`
  }

  return 'NONE'
}

export default function DashboardPage() {
  const supabase = createClient()

  const [investRows, setInvestRows] = useState<InvestRow[]>([])
  const [patrimoine, setPatrimoine] = useState<PatrimoineTotal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const [investRes, patrimoineRes] = await Promise.all([
        supabase.from(INVEST_VIEW).select('*'),
        supabase.from('vw_patrimoine_total_general_eur_v1').select('*').single(),
      ])

      if (investRes.error) {
        setError(investRes.error.message)
        setInvestRows([])
      } else {
        setInvestRows((investRes.data || []) as InvestRow[])
      }

      if (patrimoineRes.data) {
        setPatrimoine(patrimoineRes.data as PatrimoineTotal)
      }

      setLoading(false)
    }

    load()
  }, [supabase])

  const sortedRows = useMemo(() => {
    return [...investRows].sort((a, b) => {
      const scoreA = Number(a.capital_efficiency_score || 0) + Number(a.score || 0)
      const scoreB = Number(b.capital_efficiency_score || 0) + Number(b.score || 0)
      return scoreB - scoreA
    })
  }, [investRows])

  const actionableRows = useMemo(() => sortedRows.filter(isActionable), [sortedRows])
  const topRows = useMemo(() => sortedRows.slice(0, 3), [sortedRows])

  const amountNow = useMemo(() => {
    return actionableRows.reduce((sum, row) => sum + Number(row.amount_suggested || 0), 0)
  }, [actionableRows])

  const best = sortedRows[0]

  const staleRows = sortedRows.filter((row) => !isDataFresh(row.updated_at)).length

  const badPriceRows = sortedRows.filter(
    (row) => String(row.price_quality || '').toUpperCase() !== 'OK'
  ).length

  const decisionTitle = actionableRows.length > 0 ? 'Investir' : 'Attendre'

  const decisionText =
    actionableRows.length > 0
      ? `${actionableRows.length} idée(s) exploitable(s). Montant à engager maintenant : ${eur(amountNow)}.`
      : `Aucune idée n’est en zone d’achat. ${
          best ? `Meilleure idée à surveiller : ${best.ticker}. ` : ''
        }Discipline prioritaire : attendre un meilleur point d’entrée.`

  if (loading) {
    return (
      <main className="min-h-screen bg-[#111a33] p-8 text-white">
        <div className="mx-auto max-w-[1550px] rounded-[1.75rem] border border-white/10 bg-[#182441] p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
            Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Chargement dashboard...</h1>
          <p className="mt-2 text-sm text-blue-100">
            Lecture de {INVEST_VIEW} et du patrimoine consolidé.
          </p>
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
                  Nexial Dashboard
                </p>
                <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">
                  Pilotage capital
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-blue-100">
                  Source officielle : {INVEST_VIEW}. Décision, cash, qualité data et top idées actionnables.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-right backdrop-blur">
                  <p className="text-xs text-blue-200">Décision</p>
                  <p
                    className={`mt-1 text-2xl font-semibold ${
                      actionableRows.length > 0 ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {decisionTitle}
                  </p>
                </div>

                <Link
                  href="/actions"
                  className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-4 text-right text-white transition hover:bg-cyan-300/20"
                >
                  <p className="text-xs text-blue-200">Exécution</p>
                  <p className="mt-1 text-2xl font-semibold">Ouvrir Actions</p>
                </Link>
              </div>
            </div>
          </div>

          <section className="grid gap-3 border-t border-white/10 p-4 md:grid-cols-2 xl:grid-cols-6">
            <Kpi label="Patrimoine total" value={eur(patrimoine?.total_general_eur)} />
            <Kpi label="Positions" value={eur(patrimoine?.total_positions_eur)} />
            <Kpi label="Cash disponible" value={eur(patrimoine?.total_cash_eur)} />
            <Kpi label="À investir maintenant" value={eur(amountNow)} positive={amountNow > 0} />
            <Kpi label="Idées actionnables" value={String(actionableRows.length)} positive={actionableRows.length > 0} />
            <Kpi
              label="Qualité data"
              value={badPriceRows === 0 && staleRows === 0 ? 'OK' : `${badPriceRows + staleRows} alertes`}
              danger={badPriceRows > 0 || staleRows > 0}
            />
          </section>
        </header>

        {error && (
          <section className="rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-200">
            Erreur source Invest : {error}
          </section>
        )}

        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-6 shadow-sm">
            <p className="text-sm font-medium text-blue-200">Décision</p>
            <h2
              className={`mt-2 text-4xl font-semibold ${
                actionableRows.length > 0 ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {decisionTitle}
            </h2>
            <p className="mt-3 max-w-4xl text-base leading-7 text-blue-100">
              {decisionText}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-6 shadow-sm">
            <p className="text-sm font-medium text-blue-200">Contrôle système</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Données & discipline
            </h2>

            <div className="mt-5 space-y-3">
              <SystemLine label="Source invest" value={INVEST_VIEW} ok />
              <SystemLine label="Prix non OK" value={String(badPriceRows)} ok={badPriceRows === 0} />
              <SystemLine label="Données anciennes" value={String(staleRows)} ok={staleRows === 0} />
              <SystemLine label="Règle achat" value="Prix OK + zone valide" ok />
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Top idées</h2>
              <p className="mt-1 text-sm text-blue-100">
                Prix, quantité et décision issus uniquement de {INVEST_VIEW}.
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-blue-100">
              Max 3
            </span>
          </div>

          <div className="grid gap-4">
            {topRows.map((item, index) => {
              const actionable = isActionable(item)
              const fresh = isDataFresh(item.updated_at)

              return (
                <article
                  key={`${item.id}-${item.ticker}-${index}`}
                  className={`rounded-[1.25rem] border p-5 shadow-sm ${
                    actionable
                      ? 'border-emerald-300/30 bg-emerald-400/10'
                      : 'border-white/10 bg-[#1d2b4c]'
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-white">
                          {item.ticker} — {item.asset_name}
                        </h3>
                        <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium text-blue-100">
                          #{index + 1}
                        </span>
                        {actionable && (
                          <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                            Actionnable
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-blue-100">
                        {item.display_subtitle || item.reason}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <span
                        className={`rounded-full border px-3 py-1 text-sm font-medium ${decisionBadgeClass(
                          item.decision
                        )}`}
                      >
                        {item.decision || 'SURVEILLANCE'}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-sm font-medium ${
                          fresh
                            ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
                            : 'border-amber-300/30 bg-amber-400/10 text-amber-200'
                        }`}
                      >
                        {freshnessLabel(item.updated_at)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <Info label="Montant suggéré" value={money(item.amount_suggested, item.currency || 'EUR')} />
                    <Info label="Quantité suggérée" value={num(item.suggested_quantity, 4)} />
                    <Info
                      label="Prix actuel"
                      value={money(item.latest_close_price, item.currency || 'EUR')}
                      highlight={item.price_quality === 'OK'}
                    />
                    <Info label="Zone d’achat" value={zoneLabel(item)} />
                    <Info label="Score" value={num(item.score, 2)} />
                    <Info label="Capital efficiency" value={num(item.capital_efficiency_score, 2)} />
                    <Info label="Rendement attendu" value={pct(item.expected_return_pct)} />
                    <Info
                      label="Source prix"
                      value={`${item.price_source || '—'} · ${item.price_quality || '—'}`}
                      badgeClass={qualityBadgeClass(item.price_quality)}
                    />
                  </div>

                  {item.reason && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-blue-100">
                      {item.reason}
                    </div>
                  )}
                </article>
              )
            })}

            {topRows.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-blue-100">
                Aucune idée disponible dans la vue officielle.
              </div>
            )}
          </div>
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
        className={`mt-2 text-2xl font-semibold ${
          danger ? 'text-red-300' : positive ? 'text-emerald-300' : 'text-white'
        }`}
      >
        {value}
      </p>
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

function Info({
  label,
  value,
  highlight = false,
  badgeClass,
}: {
  label: string
  value: string
  highlight?: boolean
  badgeClass?: string
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight ? 'border-cyan-300/30 bg-cyan-300/10' : 'border-white/10 bg-white/5'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">{label}</p>
      {badgeClass ? (
        <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass}`}>
          {value}
        </span>
      ) : (
        <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      )}
    </div>
  )
}