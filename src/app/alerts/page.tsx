'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ALERTS_VIEW = 'vw_alerts_active_v1'
const BADGE_VIEW = 'vw_alerts_mobile_badge_v1'
const ORDERS_VIEW = 'vw_execution_orders_ui_v1'
const SYSTEM_VIEW = 'vw_invest_ui_v1'
const PUSH_VIEW = 'vw_mobile_push_outbox_ui_v1'
const AUTO_REFRESH_MS = 60000

type AlertStatus = 'NEW' | 'SEEN' | 'DONE' | 'DISMISSED' | 'EXPIRED' | string
type AlertSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string

type AlertRow = {
  id: string
  user_id: string | null
  alert_type: string
  priority: number
  severity: AlertSeverity
  severity_rank?: number | null
  title: string
  message: string
  ticker: string | null
  asset_name: string | null
  account_scope: string | null
  order_id: string | null
  config_id: string | null
  action_primary: string | null
  action_secondary: string | null
  action_href: string | null
  status: AlertStatus
  status_label?: string | null
  dedupe_key: string
  created_at: string
  seen_at: string | null
  done_at: string | null
  dismissed_at: string | null
  expires_at: string | null
  payload: Record<string, unknown> | null

  order_status?: string | null
  limit_price?: number | null
  quantity?: number | null
  amount_estimated?: number | null
  currency?: string | null
  execution_probability?: number | null
  latest_price?: number | null
  distance_to_limit_pct?: number | null
  is_price_touched?: boolean | null
  is_actionable?: boolean | null
  is_expired?: boolean | null
}

type BadgeRow = {
  new_alerts: number
  active_alerts: number
  urgent_execution_alerts: number
  latest_alert_at: string | null
}

type SystemRow = {
  ticker: string
  price_quality: string | null
  updated_at: string | null
}

type OrderRow = {
  id: string
  ticker: string
  status: string
  limit_price: number | null
  quantity: number | null
  amount_estimated: number | null
  execution_probability: number | null
  latest_price: number | null
  is_price_touched: boolean | null
  distance_to_limit_pct: number | null
  created_at: string
}

type PushRow = {
  id: string
  alert_id: string | null
  title: string
  body: string
  status: string
  push_provider: string
  device_name: string | null
  platform: string | null
  created_at: string
  sent_at: string | null
  failed_at: string | null
  error_message: string | null
}

type ScoredAlertRow = AlertRow & {
  nexialScore: number
  accountName: string
  dataBlocked: boolean
  staleBlocked: boolean
}

type AccountName = 'PEA Boursorama' | 'CTO IBKR' | 'Global'

function money(value?: number | null, currency = 'EUR') {
  if (value == null || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function num(value?: number | null, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: digits,
  }).format(Number(value))
}

function dateTime(value?: string | null) {
  if (!value) return '—'

  const d = new Date(value)

  if (Number.isNaN(d.getTime())) return '—'

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
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

function inferAccount(ticker?: string | null, accountScope?: string | null): AccountName {
  const scope = String(accountScope || '').toUpperCase()

  if (scope === 'PEA') return 'PEA Boursorama'
  if (scope === 'CTO') return 'CTO IBKR'

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
    'RACE',
    'ADYEN',
    'PRX',
    'MONC',
    'BESI',
    'ASMI',
    'ATCO A',
    'ASSA B',
  ]

  const normalized = normalizeTicker(ticker)

  if (!normalized) return 'Global'

  return peaTickers.includes(normalized) ? 'PEA Boursorama' : 'CTO IBKR'
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

function severityRank(severity: string) {
  if (severity === 'CRITICAL') return 1
  if (severity === 'HIGH') return 2
  if (severity === 'MEDIUM') return 3
  if (severity === 'LOW') return 4
  return 5
}

function severityClass(severity: string) {
  if (severity === 'CRITICAL') return 'border-red-300/30 bg-red-400/10 text-red-100'
  if (severity === 'HIGH') return 'border-amber-300/30 bg-amber-400/10 text-amber-100'
  if (severity === 'MEDIUM') return 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'
  if (severity === 'LOW') return 'border-slate-300/20 bg-white/[0.05] text-slate-200'
  return 'border-white/10 bg-white/[0.04] text-slate-300'
}

function statusClass(status?: string | null) {
  const s = String(status || '').toUpperCase()

  if (s === 'NEW') {
    return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
  }

  if (s === 'SEEN') {
    return 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
  }

  if (s === 'DONE') {
    return 'border-slate-300/20 bg-white/[0.05] text-slate-300'
  }

  if (s === 'DISMISSED' || s === 'EXPIRED') {
    return 'border-red-300/20 bg-red-400/10 text-red-100'
  }

  return 'border-white/10 bg-white/10 text-blue-100'
}

function orderStatusClass(status?: string | null) {
  const s = String(status || '').toUpperCase()

  if (s === 'PROPOSED') return 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'
  if (s === 'PLACED') return 'border-blue-300/30 bg-blue-400/10 text-blue-100'
  if (s === 'TOUCHED' || s === 'EXECUTION_TO_CONFIRM') {
    return 'border-amber-300/30 bg-amber-400/10 text-amber-100'
  }
  if (s === 'CONFIRMED_EXECUTED') return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
  if (s === 'CANCELLED') return 'border-red-300/30 bg-red-400/10 text-red-100'

  return 'border-white/10 bg-white/[0.04] text-slate-300'
}

function typeLabel(type: string) {
  if (type === 'ORDER_READY') return 'Ordre prêt'
  if (type === 'ORDER_PLACED') return 'Ordre placé'
  if (type === 'PRICE_TOUCHED') return 'Prix touché'
  if (type === 'EXECUTION_TO_CONFIRM') return 'À confirmer'
  if (type === 'ORDER_EXECUTED') return 'Exécuté'
  if (type === 'ORDER_CANCELLED') return 'Annulé'
  if (type === 'REBALANCE_SUGGESTION') return 'Rebalance'
  if (type === 'DATA_RISK') return 'Data'
  if (type === 'DCA_DECISION') return 'DCA'
  return type
}

function actionHref(alert: AlertRow) {
  if (alert.action_href) return alert.action_href
  if (alert.order_id) return '/orders'
  return '/alerts'
}

function confidenceLabel(alert: AlertRow) {
  if (alert.alert_type === 'EXECUTION_TO_CONFIRM') return 'Action critique'
  if (alert.alert_type === 'PRICE_TOUCHED') return 'Prix touché'
  if (alert.alert_type === 'ORDER_READY') return 'Action disponible'
  if (alert.alert_type === 'DATA_RISK') return 'Donnée à vérifier'
  if (alert.alert_type === 'REBALANCE_SUGGESTION') return 'Optimisation possible'
  return 'Surveillance'
}

function confidenceClass(alert: AlertRow) {
  if (alert.severity === 'CRITICAL') return 'border-red-300/30 bg-red-400/10 text-red-100'
  if (alert.severity === 'HIGH') return 'border-amber-300/30 bg-amber-400/10 text-amber-100'
  if (alert.severity === 'MEDIUM') return 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'
  return 'border-white/10 bg-white/[0.05] text-slate-200'
}

function scoreClass(score: number) {
  if (score >= 85) return 'text-emerald-300'
  if (score >= 65) return 'text-cyan-300'
  if (score >= 45) return 'text-amber-300'
  return 'text-red-300'
}

function scoreLabel(score: number) {
  if (score >= 85) return 'Prioritaire'
  if (score >= 65) return 'Solide'
  if (score >= 45) return 'À surveiller'
  return 'Faible'
}

function computeNexialScore({
  alert,
  priceNotOkRows,
  staleDataRows,
}: {
  alert: AlertRow
  priceNotOkRows: SystemRow[]
  staleDataRows: SystemRow[]
}) {
  const hasBadPrice = priceNotOkRows.some(
    (r) => normalizeTicker(r.ticker) === normalizeTicker(alert.ticker)
  )

  const hasStaleData = staleDataRows.some(
    (r) => normalizeTicker(r.ticker) === normalizeTicker(alert.ticker)
  )

  const severityScore =
    alert.severity === 'CRITICAL'
      ? 100
      : alert.severity === 'HIGH'
        ? 90
        : alert.severity === 'MEDIUM'
          ? 70
          : alert.severity === 'LOW'
            ? 45
            : 35

  const actionScore =
    alert.alert_type === 'EXECUTION_TO_CONFIRM'
      ? 100
      : alert.alert_type === 'PRICE_TOUCHED'
        ? 95
        : alert.alert_type === 'ORDER_READY'
          ? 80
          : alert.alert_type === 'REBALANCE_SUGGESTION'
            ? 70
            : alert.alert_type === 'DATA_RISK'
              ? 45
              : 50

  const probabilityScore = Number(alert.execution_probability || 0)

  const dataScore = hasBadPrice ? 0 : hasStaleData ? 40 : 100

  const raw =
    severityScore * 0.28 +
    actionScore * 0.32 +
    probabilityScore * 0.2 +
    dataScore * 0.2

  return Math.round(Math.max(0, Math.min(100, raw)))
}

function getOrderMetric(alert: AlertRow, key: string) {
  const payload = alert.payload || {}
  const value = payload[key]
  return typeof value === 'number' ? value : null
}

export default function AlertsPage() {
  const supabase = useMemo(() => createClient(), [])

  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [badge, setBadge] = useState<BadgeRow | null>(null)
  const [systemRows, setSystemRows] = useState<SystemRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [pushRows, setPushRows] = useState<PushRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      setRefreshing(silent)
      setError(null)

      const [alertsResult, badgeResult, systemResult, ordersResult, pushResult] =
        await Promise.all([
          supabase.from(ALERTS_VIEW).select('*'),
          supabase.from(BADGE_VIEW).select('*').limit(1).maybeSingle(),
          supabase.from(SYSTEM_VIEW).select('ticker, price_quality, updated_at'),
          supabase.from(ORDERS_VIEW).select('*').order('created_at', { ascending: false }),
          supabase.from(PUSH_VIEW).select('*').limit(20),
        ])

      if (alertsResult.error) {
        setError(alertsResult.error.message)
        setAlerts([])
      } else {
        setAlerts((alertsResult.data || []) as AlertRow[])
      }

      if (badgeResult.data) {
        setBadge(badgeResult.data as BadgeRow)
      } else {
        setBadge(null)
      }

      if (systemResult.error) {
        setSystemRows([])
      } else {
        setSystemRows((systemResult.data || []) as SystemRow[])
      }

      if (ordersResult.error) {
        setOrders([])
      } else {
        setOrders((ordersResult.data || []) as OrderRow[])
      }

      if (pushResult.error) {
        setPushRows([])
      } else {
        setPushRows((pushResult.data || []) as PushRow[])
      }

      setLastRefresh(new Date())
      setLoading(false)
      setRefreshing(false)
    },
    [supabase]
  )

  async function runAlertEngine() {
    setRefreshing(true)
    setError(null)

    const { error } = await supabase.rpc('fn_run_mobile_notification_engine_v1')

    if (error) setError(error.message)

    await load(true)
    setRefreshing(false)
  }

  async function markSeen(id: string) {
    setBusyId(id)
    setError(null)

    const { error } = await supabase.rpc('fn_mark_alert_seen_v1', {
      p_alert_id: id,
    })

    if (error) setError(error.message)

    await load(true)
    setBusyId(null)
  }

  async function markDone(id: string) {
    setBusyId(id)
    setError(null)

    const { error } = await supabase.rpc('fn_mark_alert_done_v1', {
      p_alert_id: id,
    })

    if (error) setError(error.message)

    await load(true)
    setBusyId(null)
  }

  async function dismiss(id: string) {
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
    load(false)

    const interval = window.setInterval(() => {
      load(true)
    }, AUTO_REFRESH_MS)

    return () => window.clearInterval(interval)
  }, [load])

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

  const scoredAlerts = useMemo<ScoredAlertRow[]>(() => {
    return alerts.map((alert) => {
      const dataBlocked = priceNotOkRows.some(
        (row) => normalizeTicker(row.ticker) === normalizeTicker(alert.ticker)
      )

      const staleBlocked = staleDataRows.some(
        (row) => normalizeTicker(row.ticker) === normalizeTicker(alert.ticker)
      )

      return {
        ...alert,
        nexialScore: computeNexialScore({
          alert,
          priceNotOkRows,
          staleDataRows,
        }),
        accountName: inferAccount(alert.ticker, alert.account_scope),
        dataBlocked,
        staleBlocked,
      }
    })
  }, [alerts, priceNotOkRows, staleDataRows])

  const sortedAlerts = useMemo(() => {
    return [...scoredAlerts].sort((a, b) => {
      const scoreDiff = b.nexialScore - a.nexialScore
      if (scoreDiff !== 0) return scoreDiff

      const severityDiff = severityRank(a.severity) - severityRank(b.severity)
      if (severityDiff !== 0) return severityDiff

      const priorityDiff = Number(b.priority || 0) - Number(a.priority || 0)
      if (priorityDiff !== 0) return priorityDiff

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [scoredAlerts])

  const topRows = useMemo(() => sortedAlerts.slice(0, 3), [sortedAlerts])
  const primaryAlert = topRows[0] ?? null
  const otherTopRows = topRows.slice(1)
  const remainingRows = sortedAlerts.slice(3)

  const activeCount = badge?.active_alerts ?? alerts.length
  const newCount = badge?.new_alerts ?? alerts.filter((a) => a.status === 'NEW').length
  const urgentCount =
    badge?.urgent_execution_alerts ??
    alerts.filter((a) =>
      ['PRICE_TOUCHED', 'EXECUTION_TO_CONFIRM'].includes(a.alert_type)
    ).length

  const activeOrders = useMemo(
    () =>
      orders.filter((order) =>
        ['PROPOSED', 'PLACED', 'TOUCHED', 'EXECUTION_TO_CONFIRM'].includes(
          String(order.status).toUpperCase()
        )
      ),
    [orders]
  )

  const toConfirmOrders = useMemo(
    () =>
      orders.filter((order) =>
        ['TOUCHED', 'EXECUTION_TO_CONFIRM'].includes(String(order.status).toUpperCase())
      ),
    [orders]
  )

  const pendingPushes = useMemo(
    () => pushRows.filter((row) => row.status === 'PENDING'),
    [pushRows]
  )

  const hasSystemAlerts = priceNotOkRows.length > 0 || staleDataRows.length > 0

  const decision = primaryAlert ? 'Agir' : 'Attendre'

  if (loading) {
    return (
      <main className="min-h-screen bg-[#111a33] p-6 text-white">
        <section className="rounded-[2rem] border border-white/10 bg-[#182441] p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
            Nexial Alerts
          </p>

          <h1 className="mt-4 text-4xl font-semibold">Chargement...</h1>

          <p className="mt-2 text-blue-100">Lecture du moteur d’alertes mobile.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#172554_0,#020617_42%,#020617_100%)] px-5 py-5 text-white">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#263b6b] via-[#1d2f59] to-[#152244] p-8 shadow-sm">
          <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
                Nexial Mobile Command Center
              </p>

              <h1 className="mt-10 text-5xl font-semibold tracking-tight lg:text-6xl">
                {primaryAlert ? 'Top alertes à traiter' : 'Aucune alerte actionnable'}
              </h1>

              <p className="mt-6 max-w-4xl text-lg leading-8 text-blue-100">
                Nexial classe les alertes selon urgence, ordre lié, probabilité d’exécution et fiabilité data.
                Le mobile sert à agir vite : placer, confirmer, ignorer ou consulter.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-sm text-blue-200">
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                  Auto-refresh : 60 sec
                </span>

                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                  Dernière MAJ : {lastRefresh ? lastRefresh.toLocaleTimeString('fr-FR') : '—'}
                </span>

                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                  Source : alerts_app_v1
                </span>

                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                  Top affiché : {topRows.length}/3
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => load(true)}
                  disabled={refreshing}
                  className="rounded-xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                >
                  {refreshing ? 'Actualisation...' : 'Actualiser'}
                </button>

                <button
                  onClick={runAlertEngine}
                  disabled={refreshing}
                  className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50"
                >
                  Scanner alertes
                </button>

                <Link
                  href="/orders"
                  className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
                >
                  Ordres
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-8 text-right backdrop-blur">
              <p className="text-sm text-blue-200">Décision mobile</p>

              <p
                className={`mt-3 text-5xl font-semibold ${
                  primaryAlert ? 'text-emerald-300' : 'text-yellow-300'
                }`}
              >
                {decision}
              </p>

              <p className="mt-3 text-blue-100">{activeCount} alerte(s) active(s)</p>
            </div>
          </div>

          <section className="mt-10 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Actives" value={String(activeCount)} positive={activeCount > 0} />
            <Kpi label="Nouvelles" value={String(newCount)} positive={newCount > 0} />
            <Kpi label="Urgentes" value={String(urgentCount)} warning={urgentCount > 0} />
            <Kpi label="Ordres actifs" value={String(activeOrders.length)} positive={activeOrders.length > 0} />
            <Kpi label="À confirmer" value={String(toConfirmOrders.length)} warning={toConfirmOrders.length > 0} />
            <Kpi label="Push pending" value={String(pendingPushes.length)} positive={pendingPushes.length > 0} />
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
                  ⚠️ Contrôle système
                </h2>

                <p className="mt-3 max-w-4xl text-blue-100">
                  Nexial détecte des données non optimales dans le système. Ces alertes n’interdisent pas
                  toute action, mais elles doivent être visibles pour éviter les décisions sur prix douteux.
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
                value={priceNotOkRows.length}
                detail={
                  priceNotOkRows.length > 0
                    ? priceNotOkRows
                        .slice(0, 8)
                        .map((row) => row.ticker)
                        .join(', ')
                    : 'Tous les prix actifs sont exploitables.'
                }
              />

              <SystemAlertCard
                label="Données anciennes"
                value={staleDataRows.length}
                detail={
                  staleDataRows.length > 0
                    ? staleDataRows
                        .slice(0, 8)
                        .map((row) => row.ticker)
                        .join(', ')
                    : 'Toutes les données actives sont fraîches.'
                }
              />
            </div>
          </section>
        )}

        {primaryAlert ? (
          <PrimaryAlertCard
            row={primaryAlert}
            busyId={busyId}
            onSeen={markSeen}
            onDone={markDone}
            onDismiss={dismiss}
          />
        ) : (
          <section className="rounded-[2rem] border border-white/10 bg-[#182441] p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-4xl font-semibold text-yellow-300">🟡 Attendre</h2>

                <p className="mt-5 max-w-4xl text-lg leading-8 text-blue-100">
                  Aucune action à prendre. Nexial surveille les ordres, les prix touchés,
                  les exécutions à confirmer et les opportunités de rotation.
                </p>

                <p className="mt-4 text-blue-100">
                  Le moteur d’alertes est actif. Une alerte sera générée uniquement si une action claire est nécessaire.
                </p>
              </div>

              <button
                onClick={runAlertEngine}
                className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-6 py-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              >
                Scanner maintenant
              </button>
            </div>
          </section>
        )}

        {otherTopRows.length > 0 && (
          <section className="grid gap-5">
            <h2 className="text-2xl font-semibold">Autres alertes du Top 3</h2>

            {otherTopRows.map((row) => (
              <PrimaryAlertCard
                key={row.id}
                row={row}
                compact
                busyId={busyId}
                onSeen={markSeen}
                onDone={markDone}
                onDismiss={dismiss}
              />
            ))}
          </section>
        )}

        {remainingRows.length > 0 && (
          <section className="rounded-[2rem] border border-white/10 bg-[#182441] p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-semibold">File d’alertes secondaire</h2>

                <p className="mt-2 text-blue-100">
                  Les alertes secondaires restent disponibles, mais Nexial limite volontairement l’écran prioritaire au Top 3.
                </p>
              </div>

              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-blue-100">
                {remainingRows.length} alerte(s)
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {remainingRows.map((row) => (
                <AlertLine
                  key={row.id}
                  alert={row}
                  busyId={busyId}
                  onSeen={markSeen}
                  onDone={markDone}
                  onDismiss={dismiss}
                />
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-[2rem] border border-white/10 bg-[#182441] p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-semibold">Ordres liés</h2>
                <p className="mt-2 text-blue-100">
                  Suivi rapide des ordres actifs qui alimentent les alertes.
                </p>
              </div>

              <Link
                href="/orders"
                className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
              >
                Voir orders
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              {activeOrders.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-blue-100">
                  Aucun ordre actif.
                </div>
              ) : (
                activeOrders.slice(0, 6).map((order) => (
                  <OrderLine key={order.id} order={order} />
                ))
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#182441] p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-semibold">Push mobile</h2>
                <p className="mt-2 text-blue-100">
                  File technique des notifications en attente ou envoyées.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {pushRows.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-blue-100">
                  Aucun push en file.
                </div>
              ) : (
                pushRows.slice(0, 6).map((push) => (
                  <PushLine key={push.id} push={push} />
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}

function PrimaryAlertCard({
  row,
  compact = false,
  busyId,
  onSeen,
  onDone,
  onDismiss,
}: {
  row: ScoredAlertRow
  compact?: boolean
  busyId: string | null
  onSeen: (id: string) => Promise<void>
  onDone: (id: string) => Promise<void>
  onDismiss: (id: string) => Promise<void>
}) {
  const limitPrice = row.limit_price ?? getOrderMetric(row, 'limit_price')
  const latestPrice = row.latest_price ?? getOrderMetric(row, 'latest_price')
  const quantity = row.quantity ?? getOrderMetric(row, 'quantity')
  const amount = row.amount_estimated ?? getOrderMetric(row, 'amount_estimated')
  const diff = diffPct(latestPrice, limitPrice)

  const linkedToOrder = Boolean(row.order_id)
  const actionableHref = actionHref(row)

  return (
    <article
      className={`rounded-[2rem] border border-cyan-300/20 bg-[#182441] shadow-sm ${
        compact ? 'p-6' : 'p-8'
      }`}
    >
      <div className="grid gap-8 xl:grid-cols-[1fr_340px] xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${severityClass(
                row.severity
              )}`}
            >
              {row.severity}
            </span>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-blue-100">
              {typeLabel(row.alert_type)}
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
                row.accountName
              )}`}
            >
              {row.accountName}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${confidenceClass(
                row
              )}`}
            >
              {confidenceLabel(row)}
            </span>

            <span
              className={`rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold ${scoreClass(
                row.nexialScore
              )}`}
            >
              Score Nexial : {row.nexialScore}/100 · {scoreLabel(row.nexialScore)}
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
            {row.ticker || typeLabel(row.alert_type)}
          </h2>

          <p className="mt-3 text-lg text-blue-100">{row.asset_name || row.title}</p>

          <p className="mt-5 max-w-4xl text-lg leading-8 text-blue-100">
            {row.message}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-blue-100">
              Créée : {dateTime(row.created_at)}
            </span>

            {row.expires_at && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-blue-100">
                Expire : {dateTime(row.expires_at)}
              </span>
            )}

            {linkedToOrder && (
              <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-sm text-cyan-100">
                Ordre lié
              </span>
            )}

            {row.dataBlocked && (
              <span className="rounded-full border border-red-300/30 bg-red-400/10 px-3 py-1 text-sm text-red-100">
                Prix non fiable
              </span>
            )}

            {row.staleBlocked && (
              <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-sm text-amber-100">
                Donnée ancienne
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:items-end xl:pt-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5 text-right">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              Priorité
            </p>

            <p className="mt-2 text-6xl font-semibold text-emerald-300">
              {row.priority}
            </p>

            <p className="mt-1 text-sm text-blue-100">{typeLabel(row.alert_type)}</p>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href={actionableHref}
              onClick={() => onSeen(row.id)}
              className="rounded-2xl bg-emerald-300 px-8 py-5 text-base font-bold tracking-wide text-[#111a33] shadow-lg shadow-emerald-900/30 transition-all hover:scale-105 hover:bg-emerald-200 active:scale-95"
            >
              {row.action_primary || 'AGIR'}
            </Link>

            <button
              onClick={() => onDone(row.id)}
              disabled={busyId === row.id}
              className="rounded-2xl border border-white/10 bg-white/5 px-8 py-5 text-base font-bold text-blue-100 transition-all hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              DONE
            </button>

            <button
              onClick={() => onDismiss(row.id)}
              disabled={busyId === row.id}
              className="rounded-2xl border border-red-300/30 bg-red-400/10 px-8 py-5 text-base font-bold text-red-100 transition-all hover:bg-red-400/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              IGNORE
            </button>
          </div>
        </div>
      </div>

      <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info label="Prix actuel" value={money(latestPrice, row.currency || 'EUR')} highlight />
        <Info label="Prix limite" value={money(limitPrice, row.currency || 'EUR')} />
        <Info label="Quantité" value={num(quantity, 4)} />
        <Info label="Montant" value={money(amount, row.currency || 'EUR')} />
      </div>

      {(row.dataBlocked || row.staleBlocked) && (
        <div className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          Attention : donnée prix ou fraîcheur à vérifier. Nexial conserve l’alerte visible,
          mais l’exécution doit passer par le contrôle Orders.
        </div>
      )}
    </article>
  )
}

function AlertLine({
  alert,
  busyId,
  onSeen,
  onDone,
  onDismiss,
}: {
  alert: ScoredAlertRow
  busyId: string | null
  onSeen: (id: string) => Promise<void>
  onDone: (id: string) => Promise<void>
  onDismiss: (id: string) => Promise<void>
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:bg-white/[0.06]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${severityClass(
                alert.severity
              )}`}
            >
              {alert.severity}
            </span>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-blue-100">
              {typeLabel(alert.alert_type)}
            </span>

            {alert.ticker && (
              <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                {alert.ticker}
              </span>
            )}

            <span
              className={`rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold ${scoreClass(
                alert.nexialScore
              )}`}
            >
              {alert.nexialScore}/100
            </span>
          </div>

          <h3 className="mt-3 text-xl font-semibold text-white">{alert.title}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-blue-100">{alert.message}</p>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <Link
            href={actionHref(alert)}
            onClick={() => onSeen(alert.id)}
            className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
          >
            {alert.action_primary || 'Agir'}
          </Link>

          <button
            onClick={() => onDone(alert.id)}
            disabled={busyId === alert.id}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-white/10 disabled:opacity-40"
          >
            Fait
          </button>

          <button
            onClick={() => onDismiss(alert.id)}
            disabled={busyId === alert.id}
            className="rounded-full border border-red-300/30 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-400/20 disabled:opacity-40"
          >
            Ignorer
          </button>
        </div>
      </div>
    </article>
  )
}

function OrderLine({ order }: { order: OrderRow }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${orderStatusClass(
                order.status
              )}`}
            >
              {order.status}
            </span>

            {order.is_price_touched && (
              <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100">
                Prix touché
              </span>
            )}
          </div>

          <p className="mt-3 text-xl font-semibold text-white">{order.ticker}</p>
          <p className="mt-1 text-sm text-blue-100">
            {num(order.quantity, 4)} × {money(order.limit_price)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold text-white">{money(order.amount_estimated)}</p>
          <p className="text-sm text-blue-200">
            Proba {num(order.execution_probability, 0)}%
          </p>
        </div>
      </div>
    </div>
  )
}

function PushLine({ push }: { push: PushRow }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                push.status === 'PENDING'
                  ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'
                  : push.status === 'SENT'
                    ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
                    : push.status === 'FAILED'
                      ? 'border-red-300/30 bg-red-400/10 text-red-100'
                      : 'border-white/10 bg-white/[0.04] text-slate-300'
              }`}
            >
              {push.status}
            </span>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-blue-100">
              {push.push_provider}
            </span>
          </div>

          <p className="mt-3 text-lg font-semibold text-white">{push.title}</p>
          <p className="mt-1 text-sm leading-6 text-blue-100">{push.body}</p>

          {push.error_message && (
            <p className="mt-2 text-sm text-red-300">{push.error_message}</p>
          )}
        </div>

        <div className="text-right text-sm text-blue-200">
          <p>{push.device_name || push.platform || 'Device'}</p>
          <p>{dateTime(push.created_at)}</p>
        </div>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  positive,
  warning,
}: {
  label: string
  value: string
  positive?: boolean
  warning?: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
      <p className="text-sm text-blue-200">{label}</p>

      <p
        className={`mt-3 text-3xl font-semibold ${
          positive ? 'text-emerald-300' : warning ? 'text-amber-300' : 'text-white'
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