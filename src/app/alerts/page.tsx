'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ALERTS_VIEW = 'vw_auto_alerts_ui_v1'
const SYSTEM_VIEW = 'vw_invest_ui_v1'
const AUTO_REFRESH_MS = 60000

type AlertStatus = 'ACTIVE' | 'EXECUTED' | 'EXPIRED' | 'IGNORED' | string

type AlertRow = {
  id: string
  ticker: string
  asset_name: string | null
  alert_type: string | null
  reason: string | null
  current_price: number | null
  trigger_price: number | null
  suggested_quantity: number | null
  suggested_amount: number | null
  status: AlertStatus
  created_at: string
  executed_at: string | null
}

type ScoredAlertRow = AlertRow & {
  nexialScore: number
}

type SystemRow = {
  ticker: string
  price_quality: string | null
  updated_at: string | null
}

type AccountName = 'PEA Boursorama' | 'CTO IBKR'

function money(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '—'

  return Number(value).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function dateTime(value?: string | null) {
  if (!value) return '—'

  const d = new Date(value)

  if (Number.isNaN(d.getTime())) return '—'

  return d.toLocaleString('fr-FR')
}

function diffPct(current?: number | null, limit?: number | null) {
  if (current == null || limit == null || limit === 0) return null

  return ((current - limit) / limit) * 100
}

function isStale(value?: string | null) {
  if (!value) return true

  const d = new Date(value)

  if (Number.isNaN(d.getTime())) return true

  const diffHours = (Date.now() - d.getTime()) / 36e5

  return diffHours > 48
}

function normalizeTicker(ticker?: string | null) {
  return String(ticker || '')
    .replace(/\..*$/, '')
    .trim()
    .toUpperCase()
}

function inferAccount(ticker: string): AccountName {
  const peaTickers = [
    'WPEA',
    'PANX',
    'ASML',
    'LVMH',
    'MC',
    'AI',
    'SU',
    'RMS',
    'TTE',
    'CAP',
    'RF',
    'SGO',
    'CS',
  ]

  return peaTickers.includes(normalizeTicker(ticker))
    ? 'PEA Boursorama'
    : 'CTO IBKR'
}

function accountClass(account: string) {
  if (account.includes('PEA')) {
    return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
  }

  if (account.includes('CTO')) {
    return 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
  }

  return 'border-white/10 bg-white/10 text-blue-100'
}

function cleanReason(row: AlertRow) {
  const reason = String(row.reason || row.alert_type || '').trim()

  if (!reason || reason.includes('CONTROLLED') || reason.includes('TEST')) {
    return 'Ordre limite prêt à être exécuté.'
  }

  if (reason === 'PRICE_AT_OR_BELOW_LIMIT') {
    return 'Le prix actuel est inférieur ou égal au prix limite prévu.'
  }

  if (reason === 'PRICE_IN_BUY_ZONE') {
    return 'Le prix est dans la zone d’achat validée.'
  }

  return reason
}

function confidenceLabel(diff: number | null) {
  if (diff == null) return 'Confiance élevée'
  if (diff <= -3) return 'Confiance élevée'
  if (diff <= -1) return 'Confiance solide'
  if (diff <= 0) return 'Zone critique'

  return 'Attendre'
}

function confidenceClass(diff: number | null) {
  if (diff == null || diff <= -1) {
    return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
  }

  if (diff <= 0) {
    return 'border-amber-300/30 bg-amber-400/10 text-amber-200'
  }

  return 'border-red-300/30 bg-red-400/10 text-red-200'
}

function statusClass(status?: string | null) {
  const s = String(status || '').toUpperCase()

  if (s === 'ACTIVE') {
    return 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
  }

  if (s === 'EXECUTED') {
    return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
  }

  if (s === 'EXPIRED' || s === 'IGNORED') {
    return 'border-white/10 bg-white/5 text-blue-100'
  }

  return 'border-white/10 bg-white/10 text-blue-100'
}

function scoreClass(score: number) {
  if (score >= 80) return 'text-emerald-300'
  if (score >= 60) return 'text-amber-300'
  return 'text-red-300'
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Valide'
  return 'Bloqué'
}

function computeNexialScore({
  row,
  priceNotOkRows,
  staleDataRows,
}: {
  row: AlertRow
  priceNotOkRows: SystemRow[]
  staleDataRows: SystemRow[]
}) {
  const diff = diffPct(row.current_price, row.trigger_price)

  const hasBadPrice = priceNotOkRows.some(
    (r) => normalizeTicker(r.ticker) === normalizeTicker(row.ticker)
  )

  const hasStaleData = staleDataRows.some(
    (r) => normalizeTicker(r.ticker) === normalizeTicker(row.ticker)
  )

  const timingScore =
    diff == null
      ? 50
      : diff <= -5
        ? 100
        : diff <= -3
          ? 90
          : diff <= -1
            ? 75
            : diff <= 0
              ? 60
              : 20

  const dataScore = hasBadPrice ? 0 : hasStaleData ? 40 : 100

  const momentumScore = diff == null ? 50 : diff < 0 ? 80 : 40

  const riskScore = hasBadPrice || hasStaleData ? 20 : 80

  return Math.round(
    timingScore * 0.4 +
      dataScore * 0.2 +
      momentumScore * 0.2 +
      riskScore * 0.2
  )
}

export default function AlertsPage() {
  const supabase = createClient()

  const [rows, setRows] = useState<AlertRow[]>([])
  const [systemRows, setSystemRows] = useState<SystemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)

      setError(null)

      const [alertsResult, systemResult] = await Promise.all([
        supabase
          .from(ALERTS_VIEW)
          .select('*')
          .order('created_at', { ascending: false }),

        supabase.from(SYSTEM_VIEW).select('ticker, price_quality, updated_at'),
      ])

      if (alertsResult.error) {
        setError(alertsResult.error.message)
        setRows([])
      } else {
        setRows((alertsResult.data || []) as AlertRow[])
      }

      if (systemResult.error) {
        setError(systemResult.error.message)
        setSystemRows([])
      } else {
        setSystemRows((systemResult.data || []) as SystemRow[])
      }

      setLastRefresh(new Date())

      if (!silent) setLoading(false)
    },
    [supabase]
  )

  async function executeAlert(id: string) {
    setBusyId(id)
    setError(null)

    const { error } = await supabase.rpc('fn_execute_alert_v1', {
      p_alert_id: id,
    })

    if (error) setError(error.message)

    await load(true)

    setBusyId(null)
  }

  async function ignoreAlert(id: string) {
    setBusyId(id)
    setError(null)

    const { error } = await supabase.rpc('fn_dismiss_alert_v1', {
      p_alert_id: id,
    })

    if (error) setError(error.message)

    await load(true)

    setBusyId(null)
  }

  useEffect(() => {
    load()

    const interval = window.setInterval(() => {
      load(true)
    }, AUTO_REFRESH_MS)

    return () => window.clearInterval(interval)
  }, [load])

  const activeRows = useMemo(
    () => rows.filter((row) => String(row.status).toUpperCase() === 'ACTIVE'),
    [rows]
  )

  const executedRows = useMemo(
    () => rows.filter((row) => String(row.status).toUpperCase() === 'EXECUTED'),
    [rows]
  )

  const ignoredRows = useMemo(
    () =>
      rows.filter((row) =>
        ['EXPIRED', 'IGNORED'].includes(String(row.status).toUpperCase())
      ),
    [rows]
  )

  const historyRows = useMemo(
    () => rows.filter((row) => String(row.status).toUpperCase() !== 'ACTIVE'),
    [rows]
  )

  const activeTickers = useMemo(
    () => activeRows.map((row) => normalizeTicker(row.ticker)),
    [activeRows]
  )

  const priceNotOkRows = useMemo(
    () =>
      systemRows.filter(
        (row) => String(row.price_quality || '').toUpperCase() !== 'OK'
      ),
    [systemRows]
  )

  const staleDataRows = useMemo(
    () => systemRows.filter((row) => isStale(row.updated_at)),
    [systemRows]
  )

  const blockingPriceNotOkRows = useMemo(
    () =>
      priceNotOkRows.filter((row) =>
        activeTickers.includes(normalizeTicker(row.ticker))
      ),
    [priceNotOkRows, activeTickers]
  )

  const blockingStaleDataRows = useMemo(
    () =>
      staleDataRows.filter((row) =>
        activeTickers.includes(normalizeTicker(row.ticker))
      ),
    [staleDataRows, activeTickers]
  )

  const scoredRows = useMemo<ScoredAlertRow[]>(() => {
    return activeRows.map((row) => ({
      ...row,
      nexialScore: computeNexialScore({
        row,
        priceNotOkRows: blockingPriceNotOkRows,
        staleDataRows: blockingStaleDataRows,
      }),
    }))
  }, [activeRows, blockingPriceNotOkRows, blockingStaleDataRows])

  const topRows = useMemo<ScoredAlertRow[]>(() => {
    return [...scoredRows]
      .sort((a, b) => b.nexialScore - a.nexialScore)
      .slice(0, 3)
  }, [scoredRows])

  const primaryAlert = topRows[0] ?? null

  const hasSystemAlerts =
    blockingPriceNotOkRows.length > 0 || blockingStaleDataRows.length > 0

  const decision = topRows.length > 0 ? 'Agir' : 'Attendre'

  if (loading) {
    return (
      <main className="min-h-screen bg-[#111a33] p-6 text-white">
        <section className="rounded-[2rem] border border-white/10 bg-[#182441] p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
            Nexial Alerts
          </p>

          <h1 className="mt-4 text-4xl font-semibold">Chargement...</h1>

          <p className="mt-2 text-blue-100">Lecture du moteur d’alertes.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#111a33] px-5 py-5 text-white">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#263b6b] via-[#1d2f59] to-[#152244] p-8 shadow-sm">
          <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
                Nexial Alerts
              </p>

              <h1 className="mt-10 text-5xl font-semibold tracking-tight lg:text-6xl">
                {topRows.length > 0
                  ? 'Top alertes à valider'
                  : 'Aucune alerte actionnable'}
              </h1>

              <p className="mt-6 max-w-4xl text-lg leading-8 text-blue-100">
                {topRows.length > 0
                  ? 'Nexial classe les alertes actives par score, limite l’affichage au Top 3 et bloque toute exécution si la donnée prix n’est pas fiable.'
                  : 'Le marché est surveillé. Nexial attend un point d’entrée réellement exploitable avant de proposer une action.'}
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-sm text-blue-200">
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                  Auto-refresh : 60 sec
                </span>

                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                  Dernière MAJ :{' '}
                  {lastRefresh ? lastRefresh.toLocaleTimeString('fr-FR') : '—'}
                </span>

                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                  Top affiché : {topRows.length}/3
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-8 text-right backdrop-blur">
              <p className="text-sm text-blue-200">Décision</p>

              <p
                className={`mt-3 text-5xl font-semibold ${
                  topRows.length > 0 ? 'text-emerald-300' : 'text-yellow-300'
                }`}
              >
                {decision}
              </p>

              <p className="mt-3 text-blue-100">
                {activeRows.length} alerte(s) active(s)
              </p>
            </div>
          </div>

          <section className="mt-10 grid gap-4 md:grid-cols-3">
            <Kpi
              label="Actives"
              value={String(activeRows.length)}
              positive={activeRows.length > 0}
            />

            <Kpi
              label="Exécutées"
              value={String(executedRows.length)}
              positive={executedRows.length > 0}
            />

            <Kpi label="Ignorées" value={String(ignoredRows.length)} />
          </section>
        </header>

        {error && (
          <section className="rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-200">
            Erreur Alerts : {error}
          </section>
        )}

        {hasSystemAlerts && (
          <section className="rounded-[2rem] border border-amber-300/20 bg-[#182441] p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-3xl font-semibold text-amber-300">
                  ⚠️ Alertes système
                </h2>

                <p className="mt-3 max-w-4xl text-blue-100">
                  Certaines données ne sont pas encore exploitables. Nexial
                  bloque automatiquement l’exécution si la qualité prix ou la
                  fraîcheur data n’est pas suffisante.
                </p>
              </div>

              <button
                onClick={() => load()}
                className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-5 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/20"
              >
                Recontrôler
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <SystemAlertCard
                label="Prix non OK"
                value={blockingPriceNotOkRows.length}
                detail={
                  blockingPriceNotOkRows.length > 0
                    ? blockingPriceNotOkRows
                        .slice(0, 6)
                        .map((r) => r.ticker)
                        .join(', ')
                    : 'Tous les prix actifs sont exploitables.'
                }
              />

              <SystemAlertCard
                label="Données anciennes"
                value={blockingStaleDataRows.length}
                detail={
                  blockingStaleDataRows.length > 0
                    ? blockingStaleDataRows
                        .slice(0, 6)
                        .map((r) => r.ticker)
                        .join(', ')
                    : 'Toutes les données actives sont fraîches.'
                }
              />
            </div>
          </section>
        )}

        {primaryAlert && (
          <PrimaryAlertCard
            row={primaryAlert}
            busyId={busyId}
            executeAlert={executeAlert}
            ignoreAlert={ignoreAlert}
            priceNotOkRows={blockingPriceNotOkRows}
            staleDataRows={blockingStaleDataRows}
          />
        )}

        {topRows.length > 1 && (
          <section className="grid gap-5">
            <h2 className="text-2xl font-semibold">Autres alertes du Top 3</h2>

            {topRows.slice(1).map((row) => (
              <PrimaryAlertCard
                key={row.id}
                row={row}
                compact
                busyId={busyId}
                executeAlert={executeAlert}
                ignoreAlert={ignoreAlert}
                priceNotOkRows={blockingPriceNotOkRows}
                staleDataRows={blockingStaleDataRows}
              />
            ))}
          </section>
        )}

        {activeRows.length > 3 && (
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 text-sm text-blue-100">
            {activeRows.length - 3} alerte(s) active(s) masquée(s) car Nexial
            limite volontairement l’écran au Top 3 prioritaire.
          </section>
        )}

        {topRows.length === 0 && (
          <section className="rounded-[2rem] border border-white/10 bg-[#182441] p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-4xl font-semibold text-yellow-300">
                  🟡 Attendre
                </h2>

                <p className="mt-5 max-w-4xl text-lg leading-8 text-blue-100">
                  Aucune action à prendre. Le cash reste disponible. Nexial
                  déclenchera une alerte uniquement si le prix atteint une zone
                  exploitable avec un rendement/risque suffisant.
                </p>

                <p className="mt-4 text-blue-100">
                  Aucun signal exploitable. Nexial attend un repli marché pour
                  déclencher une opportunité.
                </p>
              </div>

              <button
                onClick={() => load()}
                className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-6 py-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              >
                Rafraîchir
              </button>
            </div>
          </section>
        )}

        <section className="rounded-[2rem] border border-white/10 bg-[#182441] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold">Historique</h2>

              <p className="mt-2 text-blue-100">
                Suivi des alertes exécutées ou ignorées.
              </p>
            </div>

            <button
              onClick={() => load()}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-blue-100 transition hover:bg-white/10"
            >
              Rafraîchir
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/10 text-blue-100">
                <tr>
                  <th className="p-4">Ticker</th>
                  <th className="p-4">Compte</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4">Quantité</th>
                  <th className="p-4">Prix limite</th>
                  <th className="p-4">Montant</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>

              <tbody>
                {historyRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-blue-100">
                      Aucun historique.
                    </td>
                  </tr>
                ) : (
                  historyRows.map((row) => (
                    <tr key={row.id} className="border-t border-white/10">
                      <td className="p-4 font-semibold text-white">
                        {row.ticker}
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${accountClass(
                            inferAccount(row.ticker)
                          )}`}
                        >
                          {inferAccount(row.ticker)}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                            row.status
                          )}`}
                        >
                          {row.status}
                        </span>
                      </td>

                      <td className="p-4 text-blue-100">
                        {money(row.suggested_quantity)}
                      </td>

                      <td className="p-4 text-blue-100">
                        {money(row.trigger_price)}
                      </td>

                      <td className="p-4 text-blue-100">
                        {money(row.suggested_amount)}
                      </td>

                      <td className="p-4 text-blue-100">
                        {dateTime(row.executed_at || row.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

function PrimaryAlertCard({
  row,
  compact = false,
  busyId,
  executeAlert,
  ignoreAlert,
  priceNotOkRows,
  staleDataRows,
}: {
  row: ScoredAlertRow
  compact?: boolean
  busyId: string | null
  executeAlert: (id: string) => Promise<void>
  ignoreAlert: (id: string) => Promise<void>
  priceNotOkRows: SystemRow[]
  staleDataRows: SystemRow[]
}) {
  const diff = diffPct(row.current_price, row.trigger_price)

  const hasBadPrice = priceNotOkRows.some(
    (r) => normalizeTicker(r.ticker) === normalizeTicker(row.ticker)
  )

  const hasStaleData = staleDataRows.some(
    (r) => normalizeTicker(r.ticker) === normalizeTicker(row.ticker)
  )

  const executable =
    diff != null && diff <= 0 && !hasBadPrice && !hasStaleData

  const accountName = inferAccount(row.ticker)

  return (
    <article
      className={`rounded-[2rem] border border-cyan-300/20 bg-[#182441] shadow-sm ${
        compact ? 'p-6' : 'p-8'
      }`}
    >
      <div className="grid gap-8 xl:grid-cols-[1fr_340px] xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
              🟢 Opportunité détectée
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                row.status
              )}`}
            >
              {row.status}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${accountClass(
                accountName
              )}`}
            >
              {accountName}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${confidenceClass(
                diff
              )}`}
            >
              {confidenceLabel(diff)}
            </span>

            <span
              className={`rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold ${scoreClass(
                row.nexialScore
              )}`}
            >
              Score Nexial : {row.nexialScore}/100 ·{' '}
              {scoreLabel(row.nexialScore)}
            </span>

            {diff != null && (
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  diff <= 0
                    ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
                    : 'border-amber-300/30 bg-amber-400/10 text-amber-200'
                }`}
              >
                {diff > 0 ? '+' : ''}
                {diff.toFixed(2)} % vs limite
              </span>
            )}
          </div>

          <h2
            className={`mt-6 font-semibold tracking-tight ${
              compact ? 'text-5xl' : 'text-7xl'
            }`}
          >
            {row.ticker}
          </h2>

          <p className="mt-3 text-lg text-blue-100">
            {row.asset_name || row.ticker}
          </p>

          <p className="mt-5 max-w-4xl text-lg leading-8 text-blue-100">
            {cleanReason(row)}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-blue-100">
              Type : ordre limite
            </span>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-blue-100">
              Créée : {dateTime(row.created_at)}
            </span>

            {diff != null && diff <= 0 && diff > -1 && (
              <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-sm text-amber-100">
                Zone critique : proche de la limite
              </span>
            )}

            {hasBadPrice && (
              <span className="rounded-full border border-red-300/30 bg-red-400/10 px-3 py-1 text-sm text-red-100">
                Prix non fiable
              </span>
            )}

            {hasStaleData && (
              <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-sm text-amber-100">
                Donnée ancienne
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:items-end xl:pt-3">
          <div className="flex gap-3">
            <button
              onClick={() => executeAlert(row.id)}
              disabled={busyId === row.id || !executable}
              className={`rounded-2xl px-8 py-5 text-base font-bold tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                executable
                  ? 'bg-emerald-300 text-[#111a33] shadow-lg shadow-emerald-900/30 hover:scale-105 hover:bg-emerald-200 active:scale-95'
                  : 'bg-white/10 text-blue-100'
              }`}
            >
              EXECUTE
            </button>

            <button
              onClick={() => ignoreAlert(row.id)}
              disabled={busyId === row.id}
              className="rounded-2xl border border-white/10 bg-white/5 px-8 py-5 text-base font-bold text-blue-100 transition-all hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              IGNORE
            </button>
          </div>

          {!executable && (
            <p className="max-w-xs text-right text-sm text-amber-300">
              Exécution bloquée : données non fiables ou prix hors limite.
            </p>
          )}
        </div>
      </div>

      <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info label="Prix actuel" value={money(row.current_price)} highlight />
        <Info label="Prix limite" value={money(row.trigger_price)} />
        <Info label="Quantité" value={money(row.suggested_quantity)} />
        <Info label="Montant" value={money(row.suggested_amount)} />
      </div>

      {!executable && (
        <div className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          Prix supérieur à la limite ou donnée non fiable : exécution bloquée.
          Nexial attend une condition propre.
        </div>
      )}
    </article>
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
    <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
      <p className="text-sm text-blue-200">{label}</p>

      <p
        className={`mt-3 text-4xl font-semibold ${
          positive ? 'text-emerald-300' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function SystemAlertCard({
  label,
  value,
  detail,
}: {
  label: string
  value: number
  detail: string
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        value > 0
          ? 'border-amber-300/30 bg-amber-400/10'
          : 'border-emerald-300/30 bg-emerald-400/10'
      }`}
    >
      <p className={value > 0 ? 'text-amber-200' : 'text-emerald-200'}>
        {label}
      </p>

      <p className="mt-3 text-4xl font-semibold text-white">{value}</p>

      <p className="mt-3 text-sm leading-6 text-blue-100">{detail}</p>
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
      className={`rounded-2xl border p-6 ${
        highlight
          ? 'border-cyan-300/30 bg-cyan-300/10'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">
        {label}
      </p>

      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  )
}