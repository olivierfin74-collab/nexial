'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const VIEW = 'vw_entry_plans_v1'

type EntryPlanRow = {
  ticker: string
  signal: string
  variation: number | null
  priority: number | null
  created_at: string | null
  close_price: number | null
  currency: string | null
  price_updated_at: string | null
  plan_status: string
  account_type: string
  suggested_limit_price: number | null
  suggested_amount: number | null
  suggested_quantity: number | null
  plan_reason: string | null
}

function num(value?: number | null, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value))
}

function money(value?: number | null, currency = 'EUR') {
  if (value == null || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function pct(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)} %`
}

function freshnessLabel(timestamp?: string | null) {
  if (!timestamp) return 'MAJ inconnue'

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return 'MAJ inconnue'

  const diffMinutes = (Date.now() - date.getTime()) / 60000

  if (diffMinutes < 30) return '< 30 min'
  if (diffMinutes < 60) return '< 1h'
  if (diffMinutes < 180) return '< 3h'
  if (diffMinutes < 1440) return '< 24h'

  return '> 24h'
}

function statusLabel(status?: string | null) {
  const s = String(status || '').toUpperCase()

  if (s === 'READY') return 'Prêt'
  if (s === 'PREPARE') return 'Préparer'
  if (s === 'WATCH') return 'Surveiller'

  return 'Attendre'
}

function statusClass(status?: string | null) {
  const s = String(status || '').toUpperCase()

  if (s === 'READY') return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
  if (s === 'PREPARE') return 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
  if (s === 'WATCH') return 'border-amber-300/30 bg-amber-400/10 text-amber-200'

  return 'border-white/10 bg-white/10 text-blue-100'
}

function signalLabel(signal?: string | null) {
  const s = String(signal || '').toUpperCase()

  if (s === 'BUY_ZONE') return 'Zone achat'
  if (s === 'ENTRY_PLAN') return 'Plan d’entrée'
  if (s === 'WATCH_STRONG') return 'Surveillance forte'
  if (s === 'WATCH') return 'Surveillance'

  return 'Attente'
}

function scopeClass(accountType?: string | null) {
  const s = String(accountType || '').toUpperCase()

  if (s === 'PEA') return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
  if (s === 'CTO') return 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'

  return 'border-white/10 bg-white/10 text-blue-100'
}

function executionLabel(row: EntryPlanRow) {
  const qty = Number(row.suggested_quantity || 0)
  const status = String(row.plan_status || '').toUpperCase()

  if (qty <= 0) return 'Non exécutable — montant insuffisant'
  if (status === 'READY') return 'Ordre possible après validation Actions'
  if (status === 'PREPARE') return 'Ordre limite longue durée à préparer'
  if (status === 'WATCH') return 'Surveillance renforcée — pas encore ordre'

  return 'Attendre'
}

function copyOrderText(row: EntryPlanRow) {
  const currency = row.currency || (row.account_type === 'CTO' ? 'USD' : 'EUR')

  return [
    `Ticker: ${row.ticker}`,
    `Compte: ${row.account_type}`,
    `Type: Ordre limite`,
    `Quantité: ${row.suggested_quantity ?? 0}`,
    `Prix limite: ${num(row.suggested_limit_price, 2)} ${currency}`,
    `Montant indicatif: ${num(row.suggested_amount, 2)} ${currency}`,
    `Validité: GTC / longue durée`,
    `Signal: ${row.signal}`,
    `Raison: ${row.plan_reason || ''}`,
  ].join('\n')
}

export default function EntryPlansPage() {
  const supabase = createClient()

  const [rows, setRows] = useState<EntryPlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedTicker, setCopiedTicker] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from(VIEW)
      .select('*')
      .order('priority', { ascending: false })
      .order('variation', { ascending: true })

    if (error) {
      setError(error.message)
      setRows([])
    } else {
      setRows((data || []) as EntryPlanRow[])
    }

    setLoading(false)
  }

  async function copyOrder(row: EntryPlanRow) {
    await navigator.clipboard.writeText(copyOrderText(row))
    setCopiedTicker(row.ticker)

    setTimeout(() => {
      setCopiedTicker(null)
    }, 1800)
  }

  useEffect(() => {
    load()
  }, [])

  const prepareRows = useMemo(() => {
    return rows.filter((row) => String(row.plan_status).toUpperCase() === 'PREPARE')
  }, [rows])

  const readyRows = useMemo(() => {
    return rows.filter((row) => String(row.plan_status).toUpperCase() === 'READY')
  }, [rows])

  const watchRows = useMemo(() => {
    return rows.filter((row) => String(row.plan_status).toUpperCase() === 'WATCH')
  }, [rows])

  const executableRows = useMemo(() => {
    return rows.filter((row) => Number(row.suggested_quantity || 0) > 0)
  }, [rows])

  const maxPriority = Math.max(0, ...rows.map((row) => Number(row.priority || 0)))

  const mainDecision =
    readyRows.length > 0
      ? 'Valider Actions'
      : prepareRows.length > 0
        ? 'Préparer ordre'
        : watchRows.length > 0
          ? 'Surveiller'
          : 'Attendre'

  const mainText =
    readyRows.length > 0
      ? 'Un plan est prêt. Passer par Actions pour validation finale avant exécution.'
      : prepareRows.length > 0
        ? 'Un ou plusieurs ordres limites peuvent être préparés, sans achat au marché.'
        : watchRows.length > 0
          ? 'Des actifs se rapprochent de zones intéressantes. Surveillance renforcée.'
          : 'Aucun plan d’entrée actif. Discipline : attendre.'

  if (loading) {
    return (
      <main className="min-h-screen bg-[#111a33] p-8 text-white">
        <div className="mx-auto max-w-[1550px] rounded-[1.75rem] border border-white/10 bg-[#182441] p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
            Nexial Entry Plans
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Chargement des plans d’entrée...</h1>
          <p className="mt-2 text-sm text-blue-100">Lecture de {VIEW}</p>
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
                  Nexial Entry Plans
                </p>
                <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">
                  Plans d’entrée
                </h1>
                <p className="mt-4 max-w-4xl text-base leading-7 text-blue-100">
                  Préparation des ordres limites longue durée. Un plan d’entrée n’est pas un achat marché :
                  il prépare l’exécution disciplinée si le prix atteint la zone visée.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-right backdrop-blur">
                  <p className="text-xs text-blue-200">Décision</p>
                  <p
                    className={`mt-1 text-2xl font-semibold ${
                      readyRows.length > 0
                        ? 'text-emerald-300'
                        : prepareRows.length > 0
                          ? 'text-cyan-300'
                          : watchRows.length > 0
                            ? 'text-amber-300'
                            : 'text-blue-100'
                    }`}
                  >
                    {mainDecision}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-right backdrop-blur">
                  <p className="text-xs text-blue-200">Priorité max</p>
                  <p
                    className={`mt-1 text-4xl font-semibold ${
                      maxPriority >= 4
                        ? 'text-emerald-300'
                        : maxPriority >= 3
                          ? 'text-cyan-300'
                          : maxPriority >= 2
                            ? 'text-amber-300'
                            : 'text-white'
                    }`}
                  >
                    {maxPriority}/4
                  </p>
                  <p className="mt-1 text-xs text-blue-200">
                    {executableRows.length} plan(s) exécutable(s)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <section className="grid gap-3 border-t border-white/10 p-4 md:grid-cols-2 xl:grid-cols-6">
            <Kpi label="Plans" value={String(rows.length)} positive={rows.length > 0} />
            <Kpi label="READY" value={String(readyRows.length)} positive={readyRows.length > 0} />
            <Kpi label="PREPARE" value={String(prepareRows.length)} positive={prepareRows.length > 0} />
            <Kpi label="WATCH" value={String(watchRows.length)} />
            <Kpi label="Exécutables" value={String(executableRows.length)} positive={executableRows.length > 0} />
            <Kpi label="Source" value="Entry plans" />
          </section>
        </header>

        {error && (
          <section className="rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-200">
            Erreur source Entry Plans : {error}
          </section>
        )}

        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-6 shadow-sm">
            <p className="text-sm font-medium text-blue-200">Lecture immédiate</p>
            <h2
              className={`mt-2 text-4xl font-semibold ${
                readyRows.length > 0
                  ? 'text-emerald-300'
                  : prepareRows.length > 0
                    ? 'text-cyan-300'
                    : watchRows.length > 0
                      ? 'text-amber-300'
                      : 'text-blue-100'
              }`}
            >
              {mainDecision}
            </h2>
            <p className="mt-3 max-w-4xl text-base leading-7 text-blue-100">
              {mainText}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-6 shadow-sm">
            <p className="text-sm font-medium text-blue-200">Règles d’ordre</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Exécution disciplinée
            </h2>

            <div className="mt-5 space-y-3">
              <SystemLine label="Type d’ordre" value="Limite" ok />
              <SystemLine label="Validité" value="GTC / longue durée" ok />
              <SystemLine label="Achat marché" value="Interdit" ok />
              <SystemLine label="Validation finale" value="Actions" ok />
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Ordres préparés
              </h2>
              <p className="mt-1 text-sm text-blue-100">
                Les prix limites sont indicatifs et doivent être validés avant exécution.
              </p>
            </div>

            <button
              onClick={load}
              className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              Rafraîchir
            </button>
          </div>

          <div className="grid gap-4">
            {rows.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-blue-100">
                Aucun plan d’entrée actif actuellement.
              </div>
            )}

            {rows.map((row, index) => {
              const executable = Number(row.suggested_quantity || 0) > 0
              const currency = row.currency || (row.account_type === 'CTO' ? 'USD' : 'EUR')

              return (
                <article
                  key={`${row.ticker}-${row.signal}-${index}`}
                  className={`rounded-[1.35rem] border p-5 shadow-sm ${
                    row.plan_status === 'READY'
                      ? 'border-emerald-300/30 bg-emerald-400/10'
                      : row.plan_status === 'PREPARE'
                        ? 'border-cyan-300/30 bg-cyan-300/10'
                        : 'border-white/10 bg-[#1d2b4c]'
                  }`}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium text-blue-100">
                          #{index + 1}
                        </span>

                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${scopeClass(row.account_type)}`}>
                          {row.account_type}
                        </span>

                        <h3 className="text-2xl font-semibold text-white">
                          {row.ticker}
                        </h3>

                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(row.plan_status)}`}>
                          {statusLabel(row.plan_status)}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100">
                          {signalLabel(row.signal)}
                        </span>
                      </div>

                      <p className="mt-2 max-w-4xl text-sm leading-6 text-blue-100">
                        {executionLabel(row)}. Variation détectée : {pct(row.variation)}.
                      </p>
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100">
                      Prix MAJ {freshnessLabel(row.price_updated_at)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Info label="Prix actuel" value={money(row.close_price, currency)} />
                    <Info label="Prix limite" value={money(row.suggested_limit_price, currency)} highlight />
                    <Info label="Quantité" value={num(row.suggested_quantity, 0)} />
                    <Info label="Montant" value={money(row.suggested_amount, currency)} />
                    <Info label="Variation" value={pct(row.variation)} />
                    <Info label="Priorité" value={`${row.priority ?? 0}/4`} />
                    <Info label="Statut" value={statusLabel(row.plan_status)} />
                    <Info label="Compte" value={row.account_type} />
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_420px]">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">
                        Raison Nexial
                      </p>
                      <p className="mt-2 text-sm leading-6 text-blue-100">
                        {row.plan_reason || 'Plan généré automatiquement depuis les alertes live.'}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">
                        Ordre
                      </p>

                      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                        <button
                          disabled={!executable}
                          onClick={() => copyOrder(row)}
                          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                            executable
                              ? 'border border-cyan-300/30 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20'
                              : 'cursor-not-allowed border border-white/10 bg-white/5 text-blue-200/50'
                          }`}
                        >
                          {copiedTicker === row.ticker ? 'Copié' : 'Copier ordre'}
                        </button>

                        <button className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-blue-100 transition hover:bg-white/15">
                          Surveiller
                        </button>
                      </div>

                      <p className={`mt-3 text-sm ${executable ? 'text-cyan-200' : 'text-amber-200'}`}>
                        {executable
                          ? `Ordre limite : ${num(row.suggested_quantity, 0)} ${row.ticker} à ${money(row.suggested_limit_price, currency)}.`
                          : 'Montant indicatif insuffisant pour acheter au moins 1 titre.'}
                      </p>
                    </div>
                  </div>
                </article>
              )
            })}
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
}: {
  label: string
  value: string
  positive?: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-sm backdrop-blur">
      <p className="text-sm font-medium text-blue-200">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${positive ? 'text-emerald-300' : 'text-white'}`}>
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
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight ? 'border-cyan-300/30 bg-cyan-300/10' : 'border-white/10 bg-white/5'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-white">
        {value}
      </p>
    </div>
  )
}