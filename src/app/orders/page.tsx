'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ORDERS_VIEW = 'vw_execution_orders_ui_v1'
const SURVEILLANCE_VIEW = 'vw_execution_order_surveillance_v1'
const CREATE_AUTO_ORDER_RPC = 'fn_create_execution_order_from_auto_suggestion_v1'
const PLACE_ORDER_RPC = 'fn_place_execution_order_v1'
const CANCEL_ORDER_RPC = 'fn_cancel_execution_order_v1'
const CONFIRM_ORDER_RPC = 'fn_confirm_execution_order_v1'
const SURVEILLANCE_ENGINE_RPC = 'fn_run_execution_surveillance_engine_v1'

type OrderStatus =
  | 'PROPOSED'
  | 'PLACED'
  | 'TOUCHED'
  | 'EXECUTION_TO_CONFIRM'
  | 'CONFIRMED_EXECUTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REPLACED'

type SurveillanceStatus =
  | 'INACTIVE'
  | 'NO_PRICE'
  | 'WAIT'
  | 'MONITOR'
  | 'WATCH_CLOSE'
  | 'HIGH_PRIORITY'
  | 'TOUCHED'

type OrderRow = {
  id: string
  ticker: string
  asset_name: string | null
  account_scope: string | null
  broker: string | null
  source?: string | null
  order_side: string
  order_type: string
  limit_price: number
  quantity: number
  amount_estimated: number
  currency: string | null
  execution_probability: number
  execution_probability_label: string
  status: OrderStatus
  status_label: string
  reason: string | null
  latest_price: number | null
  latest_price_timestamp: string | null
  distance_to_limit_pct: number | null
  is_price_touched: boolean | null
  created_at: string
  placed_at: string | null
  touched_at: string | null
  execution_to_confirm_at: string | null
  confirmed_at: string | null
  cancelled_at: string | null
  updated_at: string
  surveillance_status?: SurveillanceStatus | null
  surveillance_message?: string | null
}

type SurveillanceRow = {
  id: string
  surveillance_status: SurveillanceStatus | null
  surveillance_message: string | null
}

type ConfirmState = {
  orderId: string
  ticker: string
  price: string
  quantity: string
  fees: string
} | null

type UiNotice = {
  type: 'success' | 'error' | 'warning'
  title: string
  message: string
} | null

function money(value?: number | null, currency = 'EUR') {
  if (value == null || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function num(value?: number | null, digits = 4) {
  if (value == null || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: digits,
  }).format(Number(value))
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

function normalizeTicker(ticker?: string | null) {
  return String(ticker || '').trim().toUpperCase()
}

function isActiveStatus(status: OrderStatus) {
  return ['PROPOSED', 'PLACED', 'TOUCHED', 'EXECUTION_TO_CONFIRM'].includes(status)
}

function statusClass(status: OrderStatus) {
  if (status === 'PROPOSED') return 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'
  if (status === 'PLACED') return 'border-blue-300/30 bg-blue-400/10 text-blue-100'
  if (status === 'TOUCHED') return 'border-amber-300/30 bg-amber-400/10 text-amber-100'
  if (status === 'EXECUTION_TO_CONFIRM') return 'border-amber-300/30 bg-amber-400/10 text-amber-100'
  if (status === 'CONFIRMED_EXECUTED') return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
  if (status === 'CANCELLED') return 'border-red-300/30 bg-red-400/10 text-red-100'
  if (status === 'REPLACED') return 'border-purple-300/30 bg-purple-400/10 text-purple-100'
  return 'border-white/10 bg-white/[0.05] text-slate-200'
}

function surveillanceClass(status?: SurveillanceStatus | null) {
  if (status === 'TOUCHED') return 'border-amber-300/40 bg-amber-400/15 text-amber-100'
  if (status === 'HIGH_PRIORITY') return 'border-orange-300/40 bg-orange-400/15 text-orange-100'
  if (status === 'WATCH_CLOSE') return 'border-cyan-300/35 bg-cyan-300/12 text-cyan-100'
  if (status === 'MONITOR') return 'border-blue-300/30 bg-blue-400/10 text-blue-100'
  if (status === 'WAIT') return 'border-white/10 bg-white/[0.05] text-slate-300'
  if (status === 'NO_PRICE') return 'border-red-300/30 bg-red-400/10 text-red-100'
  return 'border-white/10 bg-white/[0.05] text-slate-400'
}

function probabilityClass(value: number) {
  if (value >= 80) return 'text-emerald-300'
  if (value >= 60) return 'text-cyan-300'
  if (value >= 40) return 'text-amber-300'
  return 'text-red-300'
}

function priorityScore(order: OrderRow) {
  const surveillanceBoost =
    order.surveillance_status === 'TOUCHED'
      ? 1200
      : order.surveillance_status === 'HIGH_PRIORITY'
        ? 1050
        : order.surveillance_status === 'WATCH_CLOSE'
          ? 950
          : 0

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

  return surveillanceBoost + statusBoost + Number(order.execution_probability || 0)
}

function getActionLabel(order: OrderRow) {
  if (order.status === 'EXECUTION_TO_CONFIRM' || order.status === 'TOUCHED') {
    return 'CONFIRMER EXÉCUTION'
  }

  if (order.status === 'PROPOSED') return 'PLACER L’ORDRE'
  if (order.status === 'PLACED') return 'SURVEILLANCE ACTIVE'
  if (order.status === 'CONFIRMED_EXECUTED') return 'EXÉCUTÉ'

  return order.status_label
}

function sourceLabel(source?: string | null) {
  if (!source) return 'NEXIAL'
  if (source === 'AUTO_EXECUTION_SUGGESTION') return 'AUTO EXECUTION'
  if (source === 'DCA_FINAL_DECISION') return 'DCA DECISION'
  return source.replaceAll('_', ' ')
}

function canReplaceWithAuto(order: OrderRow) {
  return ['PROPOSED', 'PLACED'].includes(order.status) && order.source !== 'AUTO_EXECUTION_SUGGESTION'
}

function distanceLabel(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const number = Number(value)
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`
}

function nowIso() {
  return new Date().toISOString()
}

export default function OrdersPage() {
  const supabase = useMemo(() => createClient(), [])

  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [notice, setNotice] = useState<UiNotice>(null)
  const [error, setError] = useState<string | null>(null)

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    const [ordersResult, surveillanceResult] = await Promise.all([
      supabase.from(ORDERS_VIEW).select('*').order('created_at', { ascending: false }),
      supabase.from(SURVEILLANCE_VIEW).select('id, surveillance_status, surveillance_message'),
    ])

    if (ordersResult.error) {
      setError(ordersResult.error.message)
      setOrders([])
    } else {
      const baseOrders = (ordersResult.data || []) as OrderRow[]
      const surveillanceRows = (surveillanceResult.data || []) as SurveillanceRow[]

      const surveillanceMap = new Map<string, SurveillanceRow>()
      surveillanceRows.forEach((row) => {
        surveillanceMap.set(row.id, row)
      })

      const mergedOrders = baseOrders.map((order) => {
        const surveillance = surveillanceMap.get(order.id)

        return {
          ...order,
          surveillance_status: surveillance?.surveillance_status ?? null,
          surveillance_message: surveillance?.surveillance_message ?? null,
        }
      })

      setOrders(mergedOrders)
    }

    if (surveillanceResult.error && !ordersResult.error) {
      setError(surveillanceResult.error.message)
    }

    setLoading(false)
    setRefreshing(false)
  }

  async function createAutoOrderFromSuggestion(ticker: string) {
    const firstAttempt = await supabase.rpc(CREATE_AUTO_ORDER_RPC, { ticker })

    if (!firstAttempt.error) return firstAttempt

    return await supabase.rpc(CREATE_AUTO_ORDER_RPC, { p_ticker: ticker })
  }

  async function placeOrder(order: OrderRow) {
    setWorkingId(order.id)
    setError(null)
    setNotice({
      type: 'warning',
      title: `Placement ${order.ticker}`,
      message: 'Action reçue. Envoi au moteur SQL...',
    })

    try {
      const result = await supabase.rpc(PLACE_ORDER_RPC, {
        p_order_id: order.id,
      })

      if (result.error) {
        setError(`Placement bloqué : ${result.error.message}`)
        setNotice({
          type: 'error',
          title: `Placement ${order.ticker} bloqué`,
          message: result.error.message,
        })
        return
      }

      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? {
                ...item,
                status: 'PLACED',
                status_label: 'Ordre placé chez le broker',
                placed_at: nowIso(),
                updated_at: nowIso(),
              }
            : item
        )
      )

      setNotice({
        type: 'success',
        title: `${order.ticker} placé`,
        message: 'Ordre passé en PLACED. La surveillance Nexial suit maintenant le prix limite.',
      })

      await load(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue pendant le placement.'
      setError(message)
      setNotice({
        type: 'error',
        title: `Erreur placement ${order.ticker}`,
        message,
      })
    } finally {
      setWorkingId(null)
    }
  }

  async function cancelOrder(order: OrderRow) {
    setWorkingId(order.id)
    setError(null)
    setNotice({
      type: 'warning',
      title: `Annulation ${order.ticker}`,
      message: 'Action reçue. Envoi au moteur SQL...',
    })

    try {
      const result = await supabase.rpc(CANCEL_ORDER_RPC, {
        p_order_id: order.id,
      })

      if (result.error) {
        setError(`Annulation bloquée : ${result.error.message}`)
        setNotice({
          type: 'error',
          title: `Annulation ${order.ticker} bloquée`,
          message: result.error.message,
        })
        return
      }

      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? {
                ...item,
                status: 'CANCELLED',
                status_label: 'Ordre annulé',
                cancelled_at: nowIso(),
                updated_at: nowIso(),
              }
            : item
        )
      )

      setNotice({
        type: 'success',
        title: `${order.ticker} annulé`,
        message: 'Ordre passé en CANCELLED.',
      })

      await load(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue pendant l’annulation.'
      setError(message)
      setNotice({
        type: 'error',
        title: `Erreur annulation ${order.ticker}`,
        message,
      })
    } finally {
      setWorkingId(null)
    }
  }

  async function replaceWithAutoSuggestion(order: OrderRow) {
    const ticker = normalizeTicker(order.ticker)

    setWorkingId(order.id)
    setError(null)
    setNotice({
      type: 'warning',
      title: `Remplacement ${ticker}`,
      message: 'Action reçue. Annulation ancien ordre puis création Auto Execution...',
    })

    try {
      const cancelResult = await supabase.rpc(CANCEL_ORDER_RPC, {
        p_order_id: order.id,
      })

      if (cancelResult.error) {
        setError(`Remplacement bloqué : ${cancelResult.error.message}`)
        setNotice({
          type: 'error',
          title: `Remplacement ${ticker} bloqué`,
          message: cancelResult.error.message,
        })
        await load(true)
        return
      }

      const createResult = await createAutoOrderFromSuggestion(ticker)

      if (createResult.error) {
        setError(`Création auto bloquée : ${createResult.error.message}`)
        setNotice({
          type: 'error',
          title: `Création auto ${ticker} bloquée`,
          message: createResult.error.message,
        })
        await load(true)
        return
      }

      setNotice({
        type: 'success',
        title: `${ticker} remplacé`,
        message: 'Ancien ordre annulé et nouvel ordre créé via Auto Execution Suggestion.',
      })

      await load(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue pendant le remplacement.'
      setError(message)
      setNotice({
        type: 'error',
        title: `Erreur remplacement ${ticker}`,
        message,
      })
    } finally {
      setWorkingId(null)
    }
  }

  async function scanTouchedOrders() {
    setRefreshing(true)
    setError(null)
    setNotice({
      type: 'warning',
      title: 'Scan surveillance',
      message: 'Recalcul des ordres touchés et proches...',
    })

    try {
      const result = await supabase.rpc(SURVEILLANCE_ENGINE_RPC)

      if (result.error) {
        setError(`Scan bloqué : ${result.error.message}`)
        setNotice({
          type: 'error',
          title: 'Scan bloqué',
          message: result.error.message,
        })
        return
      }

      setNotice({
        type: 'success',
        title: 'Surveillance recalculée',
        message: 'Les ordres proches, prioritaires ou touchés ont été recalculés.',
      })

      await load(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue pendant le scan.'
      setError(message)
      setNotice({
        type: 'error',
        title: 'Erreur scan',
        message,
      })
    } finally {
      setRefreshing(false)
    }
  }

  async function confirmExecution() {
    if (!confirmState) return

    const price = Number(confirmState.price)
    const quantity = Number(confirmState.quantity)
    const fees = Number(confirmState.fees || 0)

    if (!Number.isFinite(price) || price <= 0) {
      setError('Prix exécuté invalide.')
      return
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Quantité exécutée invalide.')
      return
    }

    setWorkingId(confirmState.orderId)
    setError(null)
    setNotice({
      type: 'warning',
      title: `Confirmation ${confirmState.ticker}`,
      message: 'Action reçue. Envoi de la confirmation au moteur SQL...',
    })

    try {
      const result = await supabase.rpc(CONFIRM_ORDER_RPC, {
        p_order_id: confirmState.orderId,
        p_executed_price: price,
        p_executed_quantity: quantity,
        p_fees: Number.isFinite(fees) ? fees : 0,
      })

      if (result.error) {
        setError(`Confirmation bloquée : ${result.error.message}`)
        setNotice({
          type: 'error',
          title: 'Confirmation bloquée',
          message: result.error.message,
        })
        return
      }

      setNotice({
        type: 'success',
        title: 'Exécution confirmée',
        message: 'Le portefeuille peut maintenant être mis à jour avec l’ordre confirmé.',
      })

      setConfirmState(null)
      await load(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue pendant la confirmation.'
      setError(message)
      setNotice({
        type: 'error',
        title: 'Erreur confirmation',
        message,
      })
    } finally {
      setWorkingId(null)
    }
  }

  useEffect(() => {
    load(false)
  }, [])

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const scoreDiff = priorityScore(b) - priorityScore(a)
      if (scoreDiff !== 0) return scoreDiff
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [orders])

  const activeOrders = useMemo(() => sortedOrders.filter((order) => isActiveStatus(order.status)), [sortedOrders])
  const historicalOrders = useMemo(() => sortedOrders.filter((order) => !isActiveStatus(order.status)), [sortedOrders])

  const topOrder = activeOrders[0]
  const secondaryOrders = sortedOrders.filter((order) => order.id !== topOrder?.id)

  const stats = useMemo(() => {
    return {
      total: orders.length,
      proposed: orders.filter((o) => o.status === 'PROPOSED').length,
      placed: orders.filter((o) => o.status === 'PLACED').length,
      watchClose: orders.filter((o) => o.surveillance_status === 'WATCH_CLOSE').length,
      highPriority: orders.filter((o) => o.surveillance_status === 'HIGH_PRIORITY').length,
      touched: orders.filter((o) => o.surveillance_status === 'TOUCHED' || o.status === 'TOUCHED').length,
      toConfirm: orders.filter((o) => ['TOUCHED', 'EXECUTION_TO_CONFIRM'].includes(o.status)).length,
      executed: orders.filter((o) => o.status === 'CONFIRMED_EXECUTED').length,
      activeCapital: orders
        .filter((o) => isActiveStatus(o.status))
        .reduce((sum, o) => sum + Number(o.amount_estimated || 0), 0),
      autoOrders: orders.filter((o) => o.source === 'AUTO_EXECUTION_SUGGESTION').length,
      replaceable: orders.filter(canReplaceWithAuto).length,
    }
  }, [orders])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] p-6 text-white">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm uppercase tracking-[0.32em] text-cyan-300">Nexial Execution</p>
          <h1 className="mt-4 text-4xl font-semibold">Chargement des ordres...</h1>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#123c4a_0,#07111f_42%,#020617_100%)] px-5 py-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c1628] shadow-2xl">
          <div className="grid gap-6 p-7 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
                Execution Center · Orders Master
              </p>

              <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">
                Placer. Surveiller. Confirmer.
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">
                Les ordres restent sous contrôle utilisateur : placement manuel chez le broker,
                surveillance automatique, remplacement discipliné et confirmation obligatoire avant mise à jour portefeuille.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => load(true)}
                  disabled={refreshing}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                >
                  {refreshing ? 'Actualisation...' : 'Actualiser'}
                </button>

                <button
                  onClick={scanTouchedOrders}
                  disabled={refreshing}
                  className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50"
                >
                  Scanner surveillance
                </button>

                <Link
                  href="/actions"
                  className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
                >
                  Retour Actions
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Kpi label="Capital actif" value={money(stats.activeCapital, 'EUR')} />
              <Kpi label="Ordres actifs" value={String(stats.proposed + stats.placed + stats.toConfirm)} />
              <Kpi label="Watch close" value={String(stats.watchClose)} warning={stats.watchClose > 0} />
              <Kpi label="High priority" value={String(stats.highPriority)} warning={stats.highPriority > 0} />
              <Kpi label="Touched" value={String(stats.touched)} warning={stats.touched > 0} />
              <Kpi label="Auto orders" value={String(stats.autoOrders)} positive={stats.autoOrders > 0} />
            </div>
          </div>
        </header>

        {error && (
          <section className="rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-200">
            Erreur : {error}
          </section>
        )}

        {notice && <NoticeBox notice={notice} onClose={() => setNotice(null)} />}

        {topOrder && (
          <section className="rounded-[2rem] border border-emerald-300/20 bg-emerald-400/[0.08] p-6 shadow-[0_0_80px_rgba(16,185,129,0.12)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">
                    Action prioritaire
                  </p>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-300">
                    {sourceLabel(topOrder.source)}
                  </span>
                  {topOrder.surveillance_status && (
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${surveillanceClass(topOrder.surveillance_status)}`}>
                      {topOrder.surveillance_status}
                    </span>
                  )}
                </div>

                <h2 className="mt-4 text-6xl font-semibold tracking-tight">{topOrder.ticker}</h2>

                <p className="mt-2 text-lg text-emerald-100">{getActionLabel(topOrder)}</p>

                <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200">
                  {topOrder.surveillance_message || topOrder.reason || 'Ordre prioritaire issu du moteur Nexial.'}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5 text-right">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Probabilité</p>
                <p className={`mt-2 text-6xl font-semibold ${probabilityClass(topOrder.execution_probability)}`}>
                  {topOrder.execution_probability}%
                </p>
                <p className="mt-1 text-sm text-slate-400">{topOrder.execution_probability_label}</p>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Compte" value={topOrder.account_scope || '—'} />
              <Info label="Broker" value={topOrder.broker || '—'} />
              <Info label="Type" value={`${topOrder.order_side} ${topOrder.order_type}`} />
              <Info label="Quantité" value={num(topOrder.quantity)} />
              <Info label="Prix limite" value={money(topOrder.limit_price, topOrder.currency || 'EUR')} />
              <Info label="Montant" value={money(topOrder.amount_estimated, topOrder.currency || 'EUR')} />
              <Info label="Prix actuel" value={money(topOrder.latest_price, topOrder.currency || 'EUR')} />
              <Info label="Écart limite" value={distanceLabel(topOrder.distance_to_limit_pct)} />
              <Info label="Statut" value={topOrder.status_label} />
              <Info label="Surveillance" value={topOrder.surveillance_status || '—'} />
              <Info label="Placé" value={formatDate(topOrder.placed_at)} />
              <Info label="Mis à jour" value={formatDate(topOrder.updated_at)} />
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {topOrder.status === 'PROPOSED' && (
                <button
                  type="button"
                  onClick={() => placeOrder(topOrder)}
                  disabled={workingId === topOrder.id}
                  className="rounded-full border border-emerald-300/40 bg-emerald-400/20 px-7 py-4 text-sm font-bold uppercase tracking-[0.16em] text-emerald-50 shadow-[0_0_40px_rgba(52,211,153,0.20)] transition hover:bg-emerald-400/30 disabled:opacity-50"
                >
                  {workingId === topOrder.id ? 'Placement...' : 'Placer l’ordre maintenant'}
                </button>
              )}

              {['TOUCHED', 'EXECUTION_TO_CONFIRM'].includes(topOrder.status) && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmState({
                      orderId: topOrder.id,
                      ticker: topOrder.ticker,
                      price: String(topOrder.latest_price || topOrder.limit_price),
                      quantity: String(topOrder.quantity),
                      fees: '0',
                    })
                  }
                  className="rounded-full border border-amber-300/40 bg-amber-400/20 px-7 py-4 text-sm font-bold uppercase tracking-[0.16em] text-amber-50 transition hover:bg-amber-400/30"
                >
                  Confirmer exécution
                </button>
              )}

              {canReplaceWithAuto(topOrder) && (
                <button
                  type="button"
                  onClick={() => replaceWithAutoSuggestion(topOrder)}
                  disabled={workingId === topOrder.id}
                  className="rounded-full border border-purple-300/30 bg-purple-400/10 px-6 py-4 text-sm font-semibold text-purple-100 transition hover:bg-purple-400/20 disabled:opacity-50"
                >
                  {workingId === topOrder.id ? 'Remplacement...' : 'Remplacer par Auto'}
                </button>
              )}

              {['PROPOSED', 'PLACED'].includes(topOrder.status) && (
                <button
                  type="button"
                  onClick={() => cancelOrder(topOrder)}
                  disabled={workingId === topOrder.id}
                  className="rounded-full border border-red-300/30 bg-red-400/10 px-6 py-4 text-sm font-semibold text-red-100 transition hover:bg-red-400/20 disabled:opacity-50"
                >
                  Annuler
                </button>
              )}
            </div>
          </section>
        )}

        <section className="rounded-[2rem] border border-white/10 bg-[#0c1628] p-6 shadow-xl">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-cyan-300">
                Ordres en cours
              </p>
              <h2 className="mt-2 text-3xl font-semibold">Pipeline d’exécution</h2>
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-300">
              {activeOrders.length} actif(s) · {historicalOrders.length} historique(s)
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-10 text-center text-slate-300">
              Aucun ordre disponible.
            </div>
          ) : (
            <div className="space-y-3">
              {secondaryOrders.map((order) => (
                <OrderLine
                  key={order.id}
                  order={order}
                  workingId={workingId}
                  onPlace={placeOrder}
                  onCancel={cancelOrder}
                  onReplace={replaceWithAutoSuggestion}
                  onConfirm={(item) =>
                    setConfirmState({
                      orderId: item.id,
                      ticker: item.ticker,
                      price: String(item.latest_price || item.limit_price),
                      quantity: String(item.quantity),
                      fees: '0',
                    })
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {confirmState && (
        <ConfirmModal
          state={confirmState}
          setState={setConfirmState}
          onClose={() => setConfirmState(null)}
          onConfirm={confirmExecution}
          working={workingId === confirmState.orderId}
        />
      )}
    </main>
  )
}

function OrderLine({
  order,
  workingId,
  onPlace,
  onCancel,
  onReplace,
  onConfirm,
}: {
  order: OrderRow
  workingId: string | null
  onPlace: (order: OrderRow) => void
  onCancel: (order: OrderRow) => void
  onReplace: (order: OrderRow) => void
  onConfirm: (order: OrderRow) => void
}) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 transition hover:bg-white/[0.055]">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
              {order.status_label}
            </span>

            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-slate-300">
              {order.account_scope || 'GLOBAL'}
            </span>

            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
              {sourceLabel(order.source)}
            </span>

            {order.surveillance_status && (
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${surveillanceClass(order.surveillance_status)}`}>
                {order.surveillance_status}
              </span>
            )}
          </div>

          <h3 className="mt-3 text-3xl font-semibold">{order.ticker}</h3>
          <p className="text-sm text-slate-400">{order.asset_name || '—'}</p>
          <p className="mt-2 line-clamp-2 text-sm text-slate-500">
            {order.surveillance_message || order.reason || '—'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Mini label="Qté" value={num(order.quantity)} />
          <Mini label="Limite" value={money(order.limit_price, order.currency || 'EUR')} />
          <Mini label="Écart" value={distanceLabel(order.distance_to_limit_pct)} />
          <Mini
            label="Proba"
            value={`${order.execution_probability}%`}
            strongClass={probabilityClass(order.execution_probability)}
          />
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {order.status === 'PROPOSED' && (
            <button
              type="button"
              onClick={() => onPlace(order)}
              disabled={workingId === order.id}
              className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20 disabled:opacity-50"
            >
              {workingId === order.id ? 'Placement...' : 'Placer'}
            </button>
          )}

          {['TOUCHED', 'EXECUTION_TO_CONFIRM'].includes(order.status) && (
            <button
              type="button"
              onClick={() => onConfirm(order)}
              className="rounded-full border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/20"
            >
              Confirmer
            </button>
          )}

          {canReplaceWithAuto(order) && (
            <button
              type="button"
              onClick={() => onReplace(order)}
              disabled={workingId === order.id}
              className="rounded-full border border-purple-300/30 bg-purple-400/10 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-400/20 disabled:opacity-50"
            >
              {workingId === order.id ? 'Remplacement...' : 'Remplacer'}
            </button>
          )}

          {['PROPOSED', 'PLACED'].includes(order.status) && (
            <button
              type="button"
              onClick={() => onCancel(order)}
              disabled={workingId === order.id}
              className="rounded-full border border-red-300/30 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-400/20 disabled:opacity-50"
            >
              Annuler
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function ConfirmModal({
  state,
  setState,
  onClose,
  onConfirm,
  working,
}: {
  state: NonNullable<ConfirmState>
  setState: (state: ConfirmState) => void
  onClose: () => void
  onConfirm: () => void
  working: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#0c1628] p-6 text-white shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-300">
          Confirmation exécution
        </p>

        <h2 className="mt-4 text-4xl font-semibold">{state.ticker}</h2>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Confirme uniquement si l’ordre est réellement exécuté chez le broker.
          Cette action alimente le portefeuille et recalcule le PRU.
        </p>

        <div className="mt-6 grid gap-4">
          <Input
            label="Prix exécuté"
            value={state.price}
            onChange={(value) => setState({ ...state, price: value })}
          />
          <Input
            label="Quantité exécutée"
            value={state.quantity}
            onChange={(value) => setState({ ...state, quantity: value })}
          />
          <Input
            label="Frais"
            value={state.fees}
            onChange={(value) => setState({ ...state, fees: value })}
          />
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={working}
            className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-6 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20 disabled:opacity-50"
          >
            {working ? 'Validation...' : 'Valider exécution'}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={working}
            className="rounded-full border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

function NoticeBox({ notice, onClose }: { notice: NonNullable<UiNotice>; onClose: () => void }) {
  const className =
    notice.type === 'success'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
      : notice.type === 'warning'
        ? 'border-amber-300/30 bg-amber-400/10 text-amber-100'
        : 'border-red-300/30 bg-red-400/10 text-red-100'

  return (
    <section className={`rounded-2xl border p-4 ${className}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold">{notice.title}</p>
          <p className="mt-1 text-sm opacity-90">{notice.message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
        >
          Fermer
        </button>
      </div>
    </section>
  )
}

function Kpi({
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
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${positive ? 'text-emerald-300' : warning ? 'text-amber-300' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function Mini({
  label,
  value,
  strongClass = 'text-white',
}: {
  label: string
  value: string
  strongClass?: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${strongClass}`}>{value}</p>
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
      />
    </label>
  )
}