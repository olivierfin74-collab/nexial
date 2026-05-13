'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const PATRIMOINE_VIEW = 'vw_patrimoine_global_v2'
const ALERT_VIEW = 'vw_mobile_top_alert_v1'
const ALERTS_VIEW = 'vw_alerts_active_v1'
const ORDERS_VIEW = 'vw_execution_orders_ui_v1'
const AUTO_REFRESH_MS = 60000
const VALID_DASHBOARD_ROUTES = new Set([
  '/aide',
  '/aujourdhui',
  '/cio-brief',
  '/desktop',
  '/login',
  '/mobile',
  '/onboarding',
  '/performance',
  '/preferences',
  '/reset-password',
  '/settings',
  '/update-password',
])
const LEGACY_DASHBOARD_ROUTES: Record<string, string> = {
  '/alerts': '/aujourdhui',
  '/orders': '/aujourdhui',
  '/patrimoine': '/performance',
  '/dashboard': '/aujourdhui',
}

type Patrimoine = {
  patrimoine_total_eur: number
  invested_value_eur: number
  invested_pnl_eur: number
  performance_pct: number
  total_cash_eur: number
  engaged_capital_eur: number
  available_cash_after_orders_eur: number
  active_orders_count: number
  orders_to_confirm_count: number
  active_alerts: number
  urgent_alerts: number
  nexial_global_status: string
  nexial_global_message: string
  calculated_at: string
}

type Alert = {
  id: string
  alert_type: string
  severity: string
  priority: number
  title: string
  message: string
  ticker: string | null
  asset_name: string | null
  account_scope: string | null
  order_id: string | null
  action_primary: string | null
  action_href: string | null
  created_at: string
}

type Order = {
  id: string
  ticker: string
  asset_name: string | null
  account_scope: string | null
  status: string
  status_label: string
  limit_price: number
  quantity: number
  amount_estimated: number
  currency: string | null
  execution_probability: number
  latest_price: number | null
  distance_to_limit_pct: number | null
  is_price_touched: boolean | null
  created_at: string
}

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
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function pct(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)} %`
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

function globalStatusLabel(status?: string | null) {
  if (status === 'ACTION_REQUIRED') return 'Action requise'
  if (status === 'CONFIRM_EXECUTION') return 'Confirmation requise'
  if (status === 'ORDERS_ACTIVE') return 'Ordres actifs'
  if (status === 'CAPITAL_AVAILABLE') return 'Capital disponible'
  if (status === 'HOLD') return 'Attendre'
  return 'Surveillance'
}

function globalStatusClass(status?: string | null) {
  if (status === 'ACTION_REQUIRED') return 'text-red-300'
  if (status === 'CONFIRM_EXECUTION') return 'text-amber-300'
  if (status === 'ORDERS_ACTIVE') return 'text-cyan-300'
  if (status === 'CAPITAL_AVAILABLE') return 'text-emerald-300'
  return 'text-slate-300'
}

function alertRank(alert?: Alert | null) {
  if (!alert) return 0

  const typeBoost =
    alert.alert_type === 'EXECUTION_TO_CONFIRM'
      ? 1000
      : alert.alert_type === 'PRICE_TOUCHED'
        ? 900
        : alert.alert_type === 'ORDER_READY'
          ? 700
          : alert.alert_type === 'REBALANCE_SUGGESTION'
            ? 600
            : alert.alert_type === 'DATA_RISK'
              ? 300
              : 100

  const severityBoost =
    alert.severity === 'CRITICAL'
      ? 500
      : alert.severity === 'HIGH'
        ? 400
        : alert.severity === 'MEDIUM'
          ? 250
          : alert.severity === 'LOW'
            ? 100
            : 50

  return typeBoost + severityBoost + Number(alert.priority || 0)
}

function orderRank(order?: Order | null) {
  if (!order) return 0

  const statusBoost =
    order.status === 'EXECUTION_TO_CONFIRM'
      ? 1000
      : order.status === 'TOUCHED'
        ? 900
        : order.status === 'PROPOSED'
          ? 700
          : order.status === 'PLACED'
            ? 500
            : 0

  const touchedBoost = order.is_price_touched ? 200 : 0

  return statusBoost + touchedBoost + Number(order.execution_probability || 0)
}

function actionTitle(alert: Alert | null, order: Order | null) {
  if (alert?.alert_type === 'EXECUTION_TO_CONFIRM') return 'Confirmer une exécution'
  if (alert?.alert_type === 'PRICE_TOUCHED') return 'Prix limite touché'
  if (alert?.alert_type === 'ORDER_READY') return 'Ordre prêt à placer'
  if (alert?.alert_type === 'REBALANCE_SUGGESTION') return 'Optimisation proposée'
  if (alert?.alert_type === 'DATA_RISK') return 'Donnée à vérifier'

  if (order?.status === 'EXECUTION_TO_CONFIRM') return 'Confirmer une exécution'
  if (order?.status === 'TOUCHED') return 'Prix limite touché'
  if (order?.status === 'PROPOSED') return 'Ordre prêt à placer'
  if (order?.status === 'PLACED') return 'Ordre sous surveillance'

  return 'Aucune action prioritaire'
}

function actionReason(alert: Alert | null, order: Order | null) {
  if (alert) return alert.message

  if (order?.status === 'PROPOSED') {
    return `${order.ticker} est prêt à être placé chez le broker. Nexial attend votre validation avant toute exécution.`
  }

  if (order?.status === 'PLACED') {
    return `${order.ticker} est placé et surveillé. Nexial vous alertera si le prix limite est touché.`
  }

  if (order?.status === 'TOUCHED' || order?.status === 'EXECUTION_TO_CONFIRM') {
    return `${order.ticker} semble avoir touché son prix limite. Vérifiez le broker puis confirmez l’exécution.`
  }

  return 'Nexial surveille les prix, les ordres et les alertes. Aucune intervention immédiate.'
}

function actionHref(alert: Alert | null, order: Order | null) {
  if (alert?.action_href) return safeDashboardHref(alert.action_href)
  if (alert?.order_id) return safeDashboardHref('/orders')
  if (order) return safeDashboardHref('/orders')
  return safeDashboardHref('/patrimoine')
}

function safeDashboardHref(href: string) {
  const [pathname, suffix = ''] = href.split(/(?=[?#])/)
  const normalized = LEGACY_DASHBOARD_ROUTES[pathname] || pathname

  if (VALID_DASHBOARD_ROUTES.has(normalized)) {
    return `${normalized}${suffix}`
  }

  return '/aujourdhui'
}

function actionLabel(alert: Alert | null, order: Order | null) {
  if (alert?.action_primary) return alert.action_primary

  if (alert?.alert_type === 'EXECUTION_TO_CONFIRM') return 'Confirmer'
  if (alert?.alert_type === 'PRICE_TOUCHED') return 'Vérifier'
  if (alert?.alert_type === 'ORDER_READY') return 'Placer'

  if (order?.status === 'PROPOSED') return 'Placer'
  if (order?.status === 'TOUCHED' || order?.status === 'EXECUTION_TO_CONFIRM') return 'Confirmer'
  if (order?.status === 'PLACED') return 'Voir ordre'

  return 'Voir patrimoine'
}

function actionAccent(alert: Alert | null, order: Order | null) {
  if (alert?.alert_type === 'EXECUTION_TO_CONFIRM') return 'amber'
  if (alert?.alert_type === 'PRICE_TOUCHED') return 'amber'
  if (alert?.alert_type === 'ORDER_READY') return 'emerald'
  if (alert?.alert_type === 'DATA_RISK') return 'red'

  if (order?.status === 'TOUCHED' || order?.status === 'EXECUTION_TO_CONFIRM') return 'amber'
  if (order?.status === 'PROPOSED') return 'emerald'
  return 'cyan'
}

function buttonClass(accent: string) {
  if (accent === 'amber') {
    return 'bg-amber-300 text-[#07111f] hover:bg-amber-200 shadow-[0_0_40px_rgba(251,191,36,0.20)]'
  }

  if (accent === 'red') {
    return 'bg-red-300 text-[#07111f] hover:bg-red-200 shadow-[0_0_40px_rgba(248,113,113,0.20)]'
  }

  if (accent === 'cyan') {
    return 'bg-cyan-300 text-[#07111f] hover:bg-cyan-200 shadow-[0_0_40px_rgba(103,232,249,0.20)]'
  }

  return 'bg-emerald-300 text-[#07111f] hover:bg-emerald-200 shadow-[0_0_40px_rgba(52,211,153,0.20)]'
}

export default function MobileHomePage() {
  const supabase = useMemo(() => createClient(), [])

  const [patrimoine, setPatrimoine] = useState<Patrimoine | null>(null)
  const [topAlert, setTopAlert] = useState<Alert | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [engineRunning, setEngineRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true)
      else setLoading(true)

      setError(null)

      const [p, a, allA, o] = await Promise.all([
        supabase.from(PATRIMOINE_VIEW).select('*').limit(1).maybeSingle(),
        supabase.from(ALERT_VIEW).select('*').limit(1).maybeSingle(),
        supabase.from(ALERTS_VIEW).select('*'),
        supabase.from(ORDERS_VIEW).select('*').order('created_at', { ascending: false }),
      ])

      if (p.error) setError(p.error.message)
      else setPatrimoine(p.data as Patrimoine | null)

      if (a.error) setTopAlert(null)
      else setTopAlert(a.data as Alert | null)

      if (allA.data) setAlerts(allA.data as Alert[])
      else setAlerts([])

      if (o.data) setOrders(o.data as Order[])
      else setOrders([])

      setLastRefresh(new Date())
      setLoading(false)
      setRefreshing(false)
    },
    [supabase]
  )

  async function runEngine() {
    setEngineRunning(true)
    setError(null)

    const { error } = await supabase.rpc('fn_run_mobile_notification_engine_v1')

    if (error) setError(error.message)

    await load(true)
    setEngineRunning(false)
  }

  async function markTopAlertSeen() {
    if (!topAlert?.id) return

    await supabase.rpc('fn_mark_alert_seen_v1', {
      p_alert_id: topAlert.id,
    })
  }

  useEffect(() => {
    load(false)

    const interval = window.setInterval(() => {
      load(true)
    }, AUTO_REFRESH_MS)

    return () => window.clearInterval(interval)
  }, [load])

  const activeOrders = useMemo(() => {
    return orders.filter((order) =>
      ['PROPOSED', 'PLACED', 'TOUCHED', 'EXECUTION_TO_CONFIRM'].includes(order.status)
    )
  }, [orders])

  const bestOrder = useMemo(() => {
    return [...activeOrders].sort((a, b) => orderRank(b) - orderRank(a))[0] || null
  }, [activeOrders])

  const useAlert = alertRank(topAlert) >= orderRank(bestOrder)
  const primaryAlert = useAlert ? topAlert : null
  const primaryOrder = useAlert ? null : bestOrder

  const accent = actionAccent(primaryAlert, primaryOrder)
  const href = actionHref(primaryAlert, primaryOrder)
  const label = actionLabel(primaryAlert, primaryOrder)

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] p-5 text-white">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7">
          <p className="text-sm uppercase tracking-[0.32em] text-cyan-300">
            Nexial Mobile
          </p>
          <h1 className="mt-4 text-4xl font-semibold">Chargement...</h1>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#123c4a_0,#07111f_42%,#020617_100%)] px-4 py-5 text-white">
      <div className="mx-auto max-w-md space-y-5">
        <header className="rounded-[2rem] border border-white/10 bg-[#0c1628] p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Nexial
            </p>

            <button
              onClick={runEngine}
              disabled={engineRunning}
              className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50"
            >
              {engineRunning ? 'Scan...' : 'Scanner'}
            </button>
          </div>

          <div className="mt-5">
            <p className="text-sm text-slate-400">Patrimoine total</p>
            <h1 className="mt-1 text-5xl font-semibold tracking-tight">
              {eur(patrimoine?.patrimoine_total_eur)}
            </h1>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Mini label="Performance" value={pct(patrimoine?.performance_pct)} positive />
            <Mini label="P&L" value={eur(patrimoine?.invested_pnl_eur)} positive />
          </div>

          <p className="mt-4 text-xs text-slate-500">
            MAJ {lastRefresh ? formatDate(lastRefresh.toISOString()) : formatDate(patrimoine?.calculated_at)}
          </p>
        </header>

        {error && (
          <section className="rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-200">
            {error}
          </section>
        )}

        <section className="rounded-[2rem] border border-white/10 bg-[#0c1628] p-6 shadow-xl">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">
            Statut
          </p>

          <h2 className={`mt-4 text-4xl font-semibold ${globalStatusClass(patrimoine?.nexial_global_status)}`}>
            {globalStatusLabel(patrimoine?.nexial_global_status)}
          </h2>

          <p className="mt-4 text-sm leading-6 text-slate-300">
            {patrimoine?.nexial_global_message || 'Aucune donnée disponible.'}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <Mini label="Alertes" value={String(patrimoine?.active_alerts ?? alerts.length)} />
            <Mini label="Urgentes" value={String(patrimoine?.urgent_alerts ?? 0)} warning={(patrimoine?.urgent_alerts ?? 0) > 0} />
            <Mini label="Ordres" value={String(patrimoine?.active_orders_count ?? activeOrders.length)} />
          </div>
        </section>

        <section className={`rounded-[2rem] border p-6 shadow-xl ${
          accent === 'amber'
            ? 'border-amber-300/20 bg-amber-400/[0.08]'
            : accent === 'red'
              ? 'border-red-300/20 bg-red-400/[0.08]'
              : accent === 'cyan'
                ? 'border-cyan-300/20 bg-cyan-300/[0.08]'
                : 'border-emerald-300/20 bg-emerald-400/[0.08]'
        }`}>
          <p className={`text-sm uppercase tracking-[0.24em] ${
            accent === 'amber'
              ? 'text-amber-300'
              : accent === 'red'
                ? 'text-red-300'
                : accent === 'cyan'
                  ? 'text-cyan-300'
                  : 'text-emerald-300'
          }`}>
            Action prioritaire
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {primaryAlert?.severity && (
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-slate-200">
                {primaryAlert.severity}
              </span>
            )}

            {primaryAlert?.alert_type && (
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-slate-200">
                {primaryAlert.alert_type}
              </span>
            )}

            {(primaryAlert?.ticker || primaryOrder?.ticker) && (
              <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
                {primaryAlert?.ticker || primaryOrder?.ticker}
              </span>
            )}
          </div>

          <h2 className="mt-4 text-3xl font-semibold">
            {actionTitle(primaryAlert, primaryOrder)}
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-200">
            {actionReason(primaryAlert, primaryOrder)}
          </p>

          {primaryOrder && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Mini label="Quantité" value={String(primaryOrder.quantity)} />
              <Mini label="Prix limite" value={money(primaryOrder.limit_price, primaryOrder.currency || 'EUR')} />
              <Mini label="Montant" value={money(primaryOrder.amount_estimated, primaryOrder.currency || 'EUR')} />
              <Mini label="Proba" value={`${primaryOrder.execution_probability}%`} />
            </div>
          )}

          <Link
            href={href}
            onClick={markTopAlertSeen}
            className={`mt-6 flex w-full items-center justify-center rounded-2xl px-5 py-4 text-sm font-bold uppercase tracking-[0.16em] transition ${buttonClass(accent)}`}
          >
            {label}
          </Link>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Kpi label="Cash" value={eur(patrimoine?.total_cash_eur)} />
          <Kpi label="Cash net" value={eur(patrimoine?.available_cash_after_orders_eur)} />
          <Kpi label="Engagé" value={eur(patrimoine?.engaged_capital_eur)} />
          <Kpi label="À confirmer" value={String(patrimoine?.orders_to_confirm_count ?? 0)} />
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#0c1628] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Ordres actifs</p>
              <p className="mt-1 text-xs text-slate-400">
                {activeOrders.length} ordre(s) en suivi
              </p>
            </div>

            <Link
              href={safeDashboardHref('/orders')}
              className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-slate-200"
            >
              Voir
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {activeOrders.slice(0, 3).map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{order.ticker}</p>
                    <p className="mt-1 text-xs text-slate-400">{order.status_label}</p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold">{money(order.amount_estimated, order.currency || 'EUR')}</p>
                    <p className="mt-1 text-xs text-slate-400">{order.execution_probability}%</p>
                  </div>
                </div>
              </div>
            ))}

            {activeOrders.length === 0 && (
              <p className="text-sm text-slate-400">Aucun ordre actif.</p>
            )}
          </div>
        </section>

        <nav className="grid grid-cols-2 gap-3">
          <NavCard href={safeDashboardHref('/alerts')} label="Alertes" count={alerts.length} />
          <NavCard href={safeDashboardHref('/orders')} label="Ordres" count={activeOrders.length} />
          <NavCard href={safeDashboardHref('/patrimoine')} label="Patrimoine" />
          <NavCard href={safeDashboardHref('/dashboard')} label="Tableau de bord" />
        </nav>

        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
        >
          {refreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>
    </main>
  )
}

function Mini({
  label,
  value,
  positive = false,
  warning = false,
}: {
  label: string
  value: string
  positive?: boolean
  warning?: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p
        className={`mt-2 text-lg font-semibold ${
          positive ? 'text-emerald-300' : warning ? 'text-amber-300' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1628] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  )
}

function NavCard({
  href,
  label,
  count,
}: {
  href: string
  label: string
  count?: number
}) {
  return (
    <Link
      href={href}
      className="relative rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-center text-sm font-semibold text-slate-200 transition hover:bg-white/10"
    >
      {label}

      {count != null && count > 0 && (
        <span className="absolute right-3 top-3 rounded-full bg-cyan-300 px-2 py-0.5 text-[10px] font-bold text-[#07111f]">
          {count}
        </span>
      )}
    </Link>
  )
}
