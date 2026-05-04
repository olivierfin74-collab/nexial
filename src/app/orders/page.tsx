'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import FeedbackModal from '@/components/FeedbackModal'
import {
  AlertTriangle,
  ArrowRight,
  BadgeEuro,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Database,
  Eye,
  Filter,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'

const ORDERS_VIEW = 'vw_execution_orders_ui_v1'
const ORDERS_TABLE = 'execution_orders_v1'
const AUTO_REFRESH_MS = 60000

type OrderRow = {
  id: string
  user_id: string | null
  config_id: string | null
  source: string | null
  source_ref_id: string | null
  ticker: string
  asset_name: string | null
  account_scope: string | null
  broker: string | null
  order_side: string | null
  order_type: string | null
  limit_price: number | null
  quantity: number | null
  amount_estimated: number | null
  currency: string | null
  execution_probability: number | null
  execution_probability_label: string | null
  status: string | null
  status_label: string | null
  reason: string | null
  user_note: string | null
  created_at: string | null
  placed_at: string | null
  touched_at: string | null
  execution_to_confirm_at: string | null
  confirmed_at: string | null
  cancelled_at: string | null
  replaced_at: string | null
  updated_at: string | null
  latest_price: number | null
  latest_price_timestamp: string | null
  is_price_touched: boolean | null
  distance_to_limit_pct: number | null
}

type StatusFilter =
  | 'ALL'
  | 'READY'
  | 'PLACED'
  | 'TO_CONFIRM'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'REPLACED'
  | 'TOUCHED'

type ScopeFilter = 'ALL' | 'PEA' | 'CTO' | 'UNKNOWN'
type SortMode = 'PRIORITY' | 'CREATED_DESC' | 'AMOUNT_DESC' | 'DISTANCE_ASC' | 'PROBABILITY_DESC'

type OrderActionState = {
  status: 'success' | 'error'
  title: string
  message: string
}

type OrdersStats = {
  total: number
  ready: number
  placed: number
  touched: number
  toConfirm: number
  confirmed: number
  cancelled: number
  replaced: number
  totalAmount: number
  avgProbability: number
  dataAlerts: number
}

function money(value?: number | null, currency = 'EUR') {
  if (value == null || Number.isNaN(Number(value))) return '—'

  const safeCurrency = currency && currency.length === 3 ? currency : 'EUR'

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function eur(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function num(value?: number | null, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
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

function normalizeStatus(value?: string | null) {
  return String(value || '').trim().toUpperCase()
}

function normalizeScope(value?: string | null): ScopeFilter {
  const scope = String(value || '').toUpperCase()

  if (scope.includes('PEA')) return 'PEA'
  if (scope.includes('CTO')) return 'CTO'

  return 'UNKNOWN'
}

function normalizeTicker(value?: string | null) {
  return String(value || '').trim().toUpperCase()
}

function isReady(row: OrderRow) {
  const status = normalizeStatus(row.status)

  return (
    status === 'READY' ||
    status === 'ORDER_READY' ||
    status === 'PENDING' ||
    status === 'CREATED' ||
    status === 'TO_PLACE'
  )
}

function isPlaced(row: OrderRow) {
  const status = normalizeStatus(row.status)

  return (
    status === 'PLACED' ||
    status === 'ACTIVE' ||
    status === 'OPEN' ||
    row.placed_at != null
  )
}

function isTouched(row: OrderRow) {
  return row.is_price_touched === true || normalizeStatus(row.status) === 'TOUCHED'
}

function isToConfirm(row: OrderRow) {
  const status = normalizeStatus(row.status)

  return (
    status === 'TO_CONFIRM' ||
    status === 'FILLED_OR_TRIGGERED' ||
    row.execution_to_confirm_at != null
  )
}

function isConfirmed(row: OrderRow) {
  const status = normalizeStatus(row.status)

  return (
    status === 'CONFIRMED' ||
    status === 'FILLED' ||
    row.confirmed_at != null
  )
}

function isCancelled(row: OrderRow) {
  const status = normalizeStatus(row.status)

  return (
    status === 'CANCELLED' ||
    status === 'CANCELED' ||
    row.cancelled_at != null
  )
}

function isReplaced(row: OrderRow) {
  const status = normalizeStatus(row.status)

  return (
    status === 'REPLACED' ||
    row.replaced_at != null
  )
}

function isClosed(row: OrderRow) {
  return isConfirmed(row) || isCancelled(row) || isReplaced(row)
}

function orderLifecycle(row: OrderRow): StatusFilter {
  if (row.confirmed_at) return 'CONFIRMED'
  if (row.cancelled_at) return 'CANCELLED'
  if (row.replaced_at) return 'REPLACED'
  if (row.execution_to_confirm_at) return 'TO_CONFIRM'
  if (row.touched_at || row.is_price_touched) return 'TOUCHED'
  if (row.placed_at) return 'PLACED'

  return 'READY'

}

function lifecycleLabel(row: OrderRow) {
  const lifecycle = orderLifecycle(row)

  if (lifecycle === 'CONFIRMED') return 'Confirmé'
  if (lifecycle === 'CANCELLED') return 'Annulé'
  if (lifecycle === 'REPLACED') return 'Remplacé'
  if (lifecycle === 'TO_CONFIRM') return 'À confirmer'
  if (lifecycle === 'TOUCHED') return 'Touché'
  if (lifecycle === 'PLACED') return 'Placé'

  return 'Prêt'
}

function lifecycleRank(row: OrderRow) {
  const lifecycle = orderLifecycle(row)

  if (lifecycle === 'TO_CONFIRM') return 100
  if (lifecycle === 'TOUCHED') return 90
  if (lifecycle === 'READY') return 80
  if (lifecycle === 'PLACED') return 70
  if (lifecycle === 'CONFIRMED') return 30
  if (lifecycle === 'REPLACED') return 20
  if (lifecycle === 'CANCELLED') return 10

  return 0
}

function orderPriority(row: OrderRow) {
  return (
    lifecycleRank(row) * 10 +
    Number(row.execution_probability || 0) +
    Math.max(0, 20 - Math.abs(Number(row.distance_to_limit_pct || 0))) +
    Number(row.amount_estimated || 0) / 1000
  )
}

function hasReliablePrice(row: OrderRow) {
  return row.latest_price != null && Number(row.latest_price) > 0 && isFresh(row.latest_price_timestamp)
}

function distanceText(row: OrderRow) {
  if (row.distance_to_limit_pct == null) return '—'

  const value = Number(row.distance_to_limit_pct)

  if (value > 0) return `${pct(value)} au-dessus limite`
  if (value < 0) return `${pct(value)} sous limite`

  return 'Prix sur limite'
}

function executionRisk(row: OrderRow): 'low' | 'medium' | 'high' {
  if (!hasReliablePrice(row)) return 'high'
  if (isClosed(row)) return 'low'
  if (isTouched(row) || isToConfirm(row)) return 'medium'

  const distance = Number(row.distance_to_limit_pct || 0)

  if (distance <= 0) return 'medium'
  if (distance <= 2) return 'low'
  if (distance <= 5) return 'medium'

  return 'high'
}

function scopeLabel(row: OrderRow) {
  const scope = normalizeScope(row.account_scope)

  if (scope === 'PEA') return 'PEA'
  if (scope === 'CTO') return row.broker ? `CTO ${row.broker}` : 'CTO'

  return row.account_scope || 'Compte'
}

function canPlace(row: OrderRow) {
  return !isClosed(row) && !isPlaced(row) && !isToConfirm(row)
}

function canCancel(row: OrderRow) {
  return !isClosed(row)
}

function canConfirm(row: OrderRow) {
  return !isClosed(row) && (isToConfirm(row) || isTouched(row) || isPlaced(row))
}

export default function OrdersPage() {
  const supabase = useMemo(() => createClient(), [])

  const [rows, setRows] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionState, setActionState] = useState<OrderActionState | null>(null)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL')
  const [sortMode, setSortMode] = useState<SortMode>('PRIORITY')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError(null)

    const { data, error } = await supabase
      .from(ORDERS_VIEW)
      .select('*')

    if (error) {
      setRows([])
      setError(error.message)
    } else {
      setRows((data || []) as OrderRow[])
    }

    setLoading(false)
    setRefreshing(false)
  }

  async function updateOrderStatus(
    row: OrderRow,
    nextStatus: string,
    extra: Partial<OrderRow> = {}
  ) {
    setProcessingId(row.id)
    setActionState(null)

    const payload: Record<string, unknown> = {
      status: nextStatus,
      touched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...extra,
    }

    const { error } = await supabase
      .from(ORDERS_TABLE)
      .update(payload)
      .eq('id', row.id)

    if (error) {
      setActionState({
        status: 'error',
        title: 'Action impossible',
        message: error.message,
      })
      setProcessingId(null)
      return false
    }

    setActionState({
      status: 'success',
      title: 'Ordre mis à jour',
      message: `${row.ticker} → ${nextStatus}`,
    })

    await load(true)
    setProcessingId(null)
    return true
  }

  async function markPlaced(row: OrderRow) {
    return updateOrderStatus(row, 'PLACED', {
      placed_at: new Date().toISOString(),
    })
  }

  async function markConfirmed(row: OrderRow) {
    return updateOrderStatus(row, 'CONFIRMED', {
      confirmed_at: new Date().toISOString(),
    })
  }

  async function cancelOrder(row: OrderRow) {
    return updateOrderStatus(row, 'CANCELLED', {
      cancelled_at: new Date().toISOString(),
    })
  }

  useEffect(() => {
    load(false)

    const interval = setInterval(() => {
      load(true)
    }, AUTO_REFRESH_MS)

    return () => clearInterval(interval)
}, [supabase])
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rows.filter((row) => {
      const lifecycle = orderLifecycle(row)
      const scope = normalizeScope(row.account_scope)

      if (statusFilter !== 'ALL' && lifecycle !== statusFilter) return false
      if (scopeFilter !== 'ALL' && scope !== scopeFilter) return false

      if (query) {
        const haystack = [
          row.ticker,
          row.asset_name,
          row.account_scope,
          row.broker,
          row.order_side,
          row.order_type,
          row.status,
          row.status_label,
          row.reason,
          row.user_note,
          row.source,
        ]
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(query)) return false
      }

      return true
    })
  }, [rows, statusFilter, scopeFilter, search])

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      if (sortMode === 'CREATED_DESC') {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      }

      if (sortMode === 'AMOUNT_DESC') {
        return Number(b.amount_estimated || 0) - Number(a.amount_estimated || 0)
      }

      if (sortMode === 'DISTANCE_ASC') {
        return Math.abs(Number(a.distance_to_limit_pct || 999)) - Math.abs(Number(b.distance_to_limit_pct || 999))
      }

      if (sortMode === 'PROBABILITY_DESC') {
        return Number(b.execution_probability || 0) - Number(a.execution_probability || 0)
      }

      return orderPriority(b) - orderPriority(a)
    })
  }, [filteredRows, sortMode])

  const stats = useMemo<OrdersStats>(() => {
    const total = filteredRows.length
    const ready = filteredRows.filter((row) => orderLifecycle(row) === 'READY').length
    const placed = filteredRows.filter((row) => orderLifecycle(row) === 'PLACED').length
    const touched = filteredRows.filter((row) => orderLifecycle(row) === 'TOUCHED').length
    const toConfirm = filteredRows.filter((row) => orderLifecycle(row) === 'TO_CONFIRM').length
    const confirmed = filteredRows.filter((row) => orderLifecycle(row) === 'CONFIRMED').length
    const cancelled = filteredRows.filter((row) => orderLifecycle(row) === 'CANCELLED').length
    const replaced = filteredRows.filter((row) => orderLifecycle(row) === 'REPLACED').length
    const totalAmount = filteredRows
      .filter((row) => !isClosed(row))
      .reduce((sum, row) => sum + Number(row.amount_estimated || 0), 0)

    const probabilityRows = filteredRows.filter((row) => row.execution_probability != null)
    const avgProbability =
      probabilityRows.length > 0
        ? Math.round(
            probabilityRows.reduce((sum, row) => sum + Number(row.execution_probability || 0), 0) /
              probabilityRows.length
          )
        : 0

    const dataAlerts = filteredRows.filter((row) => !hasReliablePrice(row) && !isClosed(row)).length

    return {
      total,
      ready,
      placed,
      touched,
      toConfirm,
      confirmed,
      cancelled,
      replaced,
      totalAmount,
      avgProbability,
      dataAlerts,
    }
  }, [filteredRows])

  const priorityOrder = useMemo(() => {
    return sortedRows.find((row) => !isClosed(row)) || sortedRows[0] || null
  }, [sortedRows])

  const activeRows = useMemo(() => {
  return sortedRows.filter((row) => {
    const lifecycle = orderLifecycle(row)

    return (
      lifecycle === 'READY' ||
      lifecycle === 'PLACED' ||
      lifecycle === 'TOUCHED' ||
      lifecycle === 'TO_CONFIRM'
    )
  })
}, [sortedRows])

const closedRows = useMemo(() => {
  return sortedRows.filter((row) => {
    const lifecycle = orderLifecycle(row)

    return (
      lifecycle === 'CONFIRMED' ||
      lifecycle === 'CANCELLED' ||
      lifecycle === 'REPLACED'
    )
  })
}, [sortedRows])

  if (loading) {
    return <LoadingState />
  }

  return (
    <main className="min-h-screen bg-[#08111f] px-4 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-[1720px] space-y-5">
        {error && <ErrorBanner message={error} />}
        {actionState && <ActionBanner state={actionState} onClose={() => setActionState(null)} />}

        <OrdersHero
          stats={stats}
          priorityOrder={priorityOrder}
          refreshing={refreshing}
          onRefresh={() => load(true)}
        />

        <OrdersFilters
          statusFilter={statusFilter}
          scopeFilter={scopeFilter}
          sortMode={sortMode}
          search={search}
          onStatus={setStatusFilter}
          onScope={setScopeFilter}
          onSort={setSortMode}
          onSearch={setSearch}
          onReset={() => {
            setStatusFilter('ALL')
            setScopeFilter('ALL')
            setSortMode('PRIORITY')
            setSearch('')
          }}
        />

        <OrdersBoard
          activeRows={activeRows}
          closedRows={closedRows}
          processingId={processingId}
          onOpen={setSelectedOrder}
          onPlace={markPlaced}
          onConfirm={markConfirmed}
          onCancel={cancelOrder}
        />
      </div>

      {selectedOrder && (
        <OrderDrawer
          row={selectedOrder}
          processing={processingId === selectedOrder.id}
          onClose={() => setSelectedOrder(null)}
          onPlace={() => markPlaced(selectedOrder)}
          onConfirm={() => markConfirmed(selectedOrder)}
          onCancel={() => cancelOrder(selectedOrder)}
        />
      )}

      <FeedbackModal page="orders" />
    </main>
  )
}

function LoadingState() {
  return (
    <main className="min-h-screen bg-[#08111f] p-6 text-white">
      <div className="mx-auto max-w-[1600px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#101827] shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
        <div className="relative p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_36%),radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_32%)]" />
          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
              <Database size={14} /> Nexial Orders
            </div>
            <h1 className="text-4xl font-semibold tracking-tight">Chargement du carnet d’ordres...</h1>
            <p className="mt-3 text-sm text-slate-400">
              Lecture de <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-200">{ORDERS_VIEW}</code>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <section className="rounded-[1.5rem] border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-200">
      Erreur Orders : {message}
    </section>
  )
}

function ActionBanner({
  state,
  onClose,
}: {
  state: OrderActionState
  onClose: () => void
}) {
  const success = state.status === 'success'

  return (
    <section
      className={`rounded-[1.5rem] border p-5 ${
        success
          ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
          : 'border-red-300/30 bg-red-400/10 text-red-100'
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold">{state.title}</p>
          <p className="mt-1 text-sm opacity-90">{state.message}</p>
        </div>

        <button
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
        >
          Fermer
        </button>
      </div>
    </section>
  )
}

function OrdersHero({
  stats,
  priorityOrder,
  refreshing,
  onRefresh,
}: {
  stats: OrdersStats
  priorityOrder: OrderRow | null
  refreshing: boolean
  onRefresh: () => void
}) {
  const hasUrgent = stats.toConfirm > 0 || stats.touched > 0
  const hasActive = stats.ready + stats.placed + stats.touched + stats.toConfirm > 0

  return (
    <header className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#101827] shadow-[0_30px_120px_rgba(0,0,0,0.38)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.22),transparent_34%),radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.07),transparent_42%)]" />

      <div className="relative grid gap-8 p-6 lg:grid-cols-[1.25fr_0.75fr] lg:p-8">
        <div>
          <div
            className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${
              hasUrgent
                ? 'border-amber-300/20 bg-amber-300/10 text-amber-200'
                : hasActive
                  ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
                  : 'border-cyan-300/20 bg-cyan-300/10 text-cyan-200'
            }`}
          >
            {hasUrgent ? <AlertTriangle size={14} /> : hasActive ? <Sparkles size={14} /> : <ShieldCheck size={14} />}
            Orders Engine
          </div>

          <h1
            className={`max-w-5xl text-5xl font-semibold tracking-[-0.055em] md:text-7xl ${
              hasUrgent ? 'text-amber-300' : hasActive ? 'text-emerald-300' : 'text-cyan-300'
            }`}
          >
            {hasUrgent ? 'Ordres à traiter' : hasActive ? 'Ordres actifs' : 'Aucun ordre actif'}
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            {hasUrgent
              ? `${stats.toConfirm + stats.touched} ordre(s) nécessitent une validation ou une action.`
              : hasActive
                ? `${stats.ready + stats.placed} ordre(s) sont prêts ou placés. Suivi prix limite vs marché activé.`
                : 'Aucun ordre ouvert. Le capital reste protégé tant qu’aucune opportunité n’est validée.'}
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <HeroMetric
              label="Montant actif"
              value={eur(stats.totalAmount)}
              helper="ordres non clôturés"
              icon={<Wallet size={18} />}
              tone={hasActive ? 'positive' : 'neutral'}
            />
            <HeroMetric
              label="À confirmer"
              value={String(stats.toConfirm + stats.touched)}
              helper="priorité exécution"
              icon={hasUrgent ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              tone={hasUrgent ? 'warning' : 'positive'}
            />
            <HeroMetric
              label="Data"
              value={stats.dataAlerts === 0 ? 'OK' : 'À vérifier'}
              helper={stats.dataAlerts === 0 ? `proba moy. ${stats.avgProbability}/100` : `${stats.dataAlerts} alerte(s)`}
              icon={stats.dataAlerts === 0 ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              tone={stats.dataAlerts === 0 ? 'positive' : 'warning'}
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Actualisation...' : 'Actualiser'}
            </button>

            <Link
              href="/actions"
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
            >
              Retour Actions <ArrowRight size={15} />
            </Link>

            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-400">
              Source : {ORDERS_VIEW}
            </span>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Priorité</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">
                {priorityOrder ? priorityOrder.ticker : 'No order'}
              </h2>
            </div>
            <div
              className={`rounded-2xl border p-3 ${
                priorityOrder
                  ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-300'
                  : 'border-cyan-300/20 bg-cyan-300/10 text-cyan-300'
              }`}
            >
              {priorityOrder ? <Target size={22} /> : <ShieldCheck size={22} />}
            </div>
          </div>

          {priorityOrder ? (
            <div className="space-y-3">
              <PriorityLine label="Nom" value={priorityOrder.asset_name || priorityOrder.ticker} />
              <PriorityLine label="Statut" value={lifecycleLabel(priorityOrder)} />
              <PriorityLine label="Compte" value={scopeLabel(priorityOrder)} />
              <PriorityLine label="Prix limite" value={money(priorityOrder.limit_price, priorityOrder.currency || 'EUR')} />
              <PriorityLine label="Prix actuel" value={money(priorityOrder.latest_price, priorityOrder.currency || 'EUR')} />
              <PriorityLine label="Distance" value={distanceText(priorityOrder)} />
              <PriorityLine label="Montant" value={money(priorityOrder.amount_estimated, priorityOrder.currency || 'EUR')} />
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm leading-6 text-slate-300">
              Aucun ordre ouvert. La page restera en surveillance et se mettra à jour automatiquement.
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <CompactMetric label="Total" value={String(stats.total)} />
            <CompactMetric label="Confirmés" value={String(stats.confirmed)} />
          </div>
        </aside>
      </div>
    </header>
  )
}

function OrdersFilters({
  statusFilter,
  scopeFilter,
  sortMode,
  search,
  onStatus,
  onScope,
  onSort,
  onSearch,
  onReset,
}: {
  statusFilter: StatusFilter
  scopeFilter: ScopeFilter
  sortMode: SortMode
  search: string
  onStatus: (value: StatusFilter) => void
  onScope: (value: ScopeFilter) => void
  onSort: (value: SortMode) => void
  onSearch: (value: string) => void
  onReset: () => void
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[#101827]/95 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)]">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Filter size={18} className="text-cyan-300" /> Filtres ordres
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Statut, enveloppe, tri, ticker et broker.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <PillButton label="Tous" active={statusFilter === 'ALL'} onClick={() => onStatus('ALL')} />
          <PillButton label="Prêts" active={statusFilter === 'READY'} onClick={() => onStatus('READY')} positive />
          <PillButton label="Placés" active={statusFilter === 'PLACED'} onClick={() => onStatus('PLACED')} />
          <PillButton label="À confirmer" active={statusFilter === 'TO_CONFIRM'} onClick={() => onStatus('TO_CONFIRM')} warning />
          <PillButton label="Touchés" active={statusFilter === 'TOUCHED'} onClick={() => onStatus('TOUCHED')} warning />
          <PillButton label="Confirmés" active={statusFilter === 'CONFIRMED'} onClick={() => onStatus('CONFIRMED')} positive />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Select
          label="Enveloppe"
          value={scopeFilter}
          onChange={(value) => onScope(value as ScopeFilter)}
          options={['ALL', 'PEA', 'CTO', 'UNKNOWN']}
        />

        <Select
          label="Statut"
          value={statusFilter}
          onChange={(value) => onStatus(value as StatusFilter)}
          options={['ALL', 'READY', 'PLACED', 'TO_CONFIRM', 'TOUCHED', 'CONFIRMED', 'CANCELLED', 'REPLACED']}
        />

        <Select
          label="Tri"
          value={sortMode}
          onChange={(value) => onSort(value as SortMode)}
          options={['PRIORITY', 'CREATED_DESC', 'AMOUNT_DESC', 'DISTANCE_ASC', 'PROBABILITY_DESC']}
        />

        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Recherche</span>
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Ticker, actif, broker..."
            className="h-[46px] w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
          />
        </label>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onReset}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.07]"
        >
          Réinitialiser
        </button>
      </div>
    </section>
  )
}
function OrdersBoard({
  activeRows,
  closedRows,
  processingId,
  onOpen,
  onPlace,
  onConfirm,
  onCancel,
}: {
  activeRows: OrderRow[]
  closedRows: OrderRow[]
  processingId: string | null
  onOpen: (row: OrderRow) => void
  onPlace: (row: OrderRow) => void
  onConfirm: (row: OrderRow) => void
  onCancel: (row: OrderRow) => void
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-[1.75rem] border border-white/10 bg-[#101827]/95 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles size={18} className="text-emerald-300" /> Ordres actifs
            </div>
            <p className="mt-1 text-sm text-slate-400">À placer, suivre, confirmer ou annuler.</p>
          </div>

          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
            {activeRows.length} actif(s)
          </span>
        </div>

        {activeRows.length === 0 ? (
          <EmptyOrders />
        ) : (
          <div className="space-y-4">
            {activeRows.map((row) => (
              <OrderCard
                key={row.id}
                row={row}
                processing={processingId === row.id}
                onOpen={() => onOpen(row)}
                onPlace={() => onPlace(row)}
                onConfirm={() => onConfirm(row)}
                onCancel={() => onCancel(row)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[1.75rem] border border-white/10 bg-[#101827]/95 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck size={18} className="text-cyan-300" /> Historique
            </div>
            <p className="mt-1 text-sm text-slate-400">Ordres confirmés, annulés ou remplacés.</p>
          </div>

          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
            {closedRows.length} clôturé(s)
          </span>
        </div>

        {closedRows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-400">
            Aucun ordre clôturé pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {closedRows.slice(0, 12).map((row) => (
              <HistoryRow key={row.id} row={row} onOpen={() => onOpen(row)} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function EmptyOrders() {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300">
        <TimerReset size={26} />
      </div>

      <h2 className="mt-5 text-2xl font-semibold text-white">Aucun ordre actif</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
        Les ordres apparaîtront ici après création depuis la page Actions. Nexial ne place aucun ordre sans validation utilisateur.
      </p>

      <div className="mt-6">
        <Link
          href="/actions"
          className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
        >
          Aller vers Actions <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )
}

function OrderCard({
  row,
  processing,
  onOpen,
  onPlace,
  onConfirm,
  onCancel,
}: {
  row: OrderRow
  processing: boolean
  onOpen: () => void
  onPlace: () => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const lifecycle = orderLifecycle(row)
  const risk = executionRisk(row)

  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/20 hover:bg-white/[0.055]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <LifecycleBadge lifecycle={lifecycle} />
            <ScopeBadge value={normalizeScope(row.account_scope)} />
            <RiskBadge risk={risk} />
            {row.is_price_touched && (
              <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
                LIMIT TOUCH
              </span>
            )}
          </div>

          <h3 className="mt-3 truncate text-3xl font-semibold text-white">{row.ticker}</h3>
          <p className="mt-1 truncate text-sm text-slate-400">{row.asset_name || row.ticker}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
          <OrderMetric label="Montant" value={money(row.amount_estimated, row.currency || 'EUR')} />
          <OrderMetric label="Quantité" value={num(row.quantity, 2)} />
          <OrderMetric label="Limite" value={money(row.limit_price, row.currency || 'EUR')} />
          <OrderMetric label="Actuel" value={money(row.latest_price, row.currency || 'EUR')} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <InfoLine label="Compte" value={scopeLabel(row)} />
        <InfoLine label="Type" value={row.order_type || 'LIMIT'} />
        <InfoLine label="Distance" value={distanceText(row)} />
        <InfoLine label="Probabilité" value={row.execution_probability_label || `${num(row.execution_probability, 0)}/100`} />
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4 text-sm leading-6 text-slate-300">
        {row.reason || row.user_note || 'Ordre créé par Nexial. À exécuter uniquement chez le broker au prix limite prévu.'}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {canPlace(row) && (
          <button
            onClick={onPlace}
            disabled={processing}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? 'Mise à jour...' : 'Marquer placé'}
          </button>
        )}

        {canConfirm(row) && (
          <button
            onClick={onConfirm}
            disabled={processing}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? 'Mise à jour...' : 'Confirmer exécuté'}
          </button>
        )}

        {canCancel(row) && (
          <button
            onClick={onCancel}
            disabled={processing}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-red-300/30 bg-red-400/10 px-5 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? 'Mise à jour...' : 'Annuler'}
          </button>
        )}

        <button
          onClick={onOpen}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
        >
          <Eye size={15} />
          Détail
        </button>
      </div>
    </article>
  )
}

function HistoryRow({ row, onOpen }: { row: OrderRow; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="block w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <LifecycleBadge lifecycle={orderLifecycle(row)} />
            <ScopeBadge value={normalizeScope(row.account_scope)} />
          </div>
          <p className="mt-3 text-lg font-semibold text-white">{row.ticker}</p>
          <p className="mt-1 truncate text-sm text-slate-400">{row.asset_name || row.ticker}</p>
        </div>

        <div className="text-right">
          <p className="text-sm font-semibold text-white">{money(row.amount_estimated, row.currency || 'EUR')}</p>
          <p className="mt-1 text-xs text-slate-500">{formatDate(row.updated_at)}</p>
        </div>
      </div>
    </button>
  )
}

function OrderDrawer({
  row,
  processing,
  onClose,
  onPlace,
  onConfirm,
  onCancel,
}: {
  row: OrderRow
  processing: boolean
  onClose: () => void
  onPlace: () => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const lifecycle = orderLifecycle(row)
  const risk = executionRisk(row)

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <button aria-label="Fermer" className="absolute inset-0 cursor-default" onClick={onClose} />

      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#07111f] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Détail ordre</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight">{row.ticker}</h2>
            <p className="mt-1 text-slate-400">{row.asset_name || row.ticker}</p>
          </div>

          <button onClick={onClose} className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-slate-300 transition hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Statut</p>
              <p className="mt-1 text-3xl font-semibold text-white">{lifecycleLabel(row)}</p>
            </div>

            <LifecycleBadge lifecycle={lifecycle} />
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-300">
            {row.reason || row.user_note || 'Ordre créé par Nexial. À suivre manuellement jusqu’à confirmation broker.'}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <DrawerMetric label="Compte" value={scopeLabel(row)} />
          <DrawerMetric label="Broker" value={row.broker || '—'} />
          <DrawerMetric label="Sens" value={row.order_side || 'BUY'} />
          <DrawerMetric label="Type" value={row.order_type || 'LIMIT'} />
          <DrawerMetric label="Quantité" value={num(row.quantity, 2)} />
          <DrawerMetric label="Prix limite" value={money(row.limit_price, row.currency || 'EUR')} />
          <DrawerMetric label="Montant" value={money(row.amount_estimated, row.currency || 'EUR')} />
          <DrawerMetric label="Devise" value={row.currency || 'EUR'} />
          <DrawerMetric label="Prix actuel" value={money(row.latest_price, row.currency || 'EUR')} />
          <DrawerMetric label="Distance" value={distanceText(row)} />
          <DrawerMetric label="Probabilité" value={row.execution_probability_label || `${num(row.execution_probability, 0)}/100`} />
          <DrawerMetric label="Risque" value={risk.toUpperCase()} />
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm font-semibold text-white">Timeline</p>

          <div className="mt-4 space-y-3">
            <TimelineLine label="Créé" value={formatDate(row.created_at)} />
            <TimelineLine label="Placé" value={formatDate(row.placed_at)} />
            <TimelineLine label="Touché" value={formatDate(row.touched_at)} />
            <TimelineLine label="À confirmer" value={formatDate(row.execution_to_confirm_at)} />
            <TimelineLine label="Confirmé" value={formatDate(row.confirmed_at)} />
            <TimelineLine label="Annulé" value={formatDate(row.cancelled_at)} />
            <TimelineLine label="Remplacé" value={formatDate(row.replaced_at)} />
            <TimelineLine label="MAJ prix" value={formatDate(row.latest_price_timestamp)} />
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/10 p-5">
          <p className="text-sm font-semibold text-cyan-100">Contrôle pré-exécution</p>
          <div className="mt-4 space-y-3">
            <CheckLine label="Prix disponible et récent" ok={hasReliablePrice(row)} />
            <CheckLine label="Ordre non clôturé" ok={!isClosed(row)} />
            <CheckLine label="Prix limite défini" ok={row.limit_price != null && Number(row.limit_price) > 0} />
            <CheckLine label="Quantité définie" ok={row.quantity != null && Number(row.quantity) > 0} />
            <CheckLine label="Montant estimé défini" ok={row.amount_estimated != null && Number(row.amount_estimated) > 0} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {canPlace(row) && (
            <button
              onClick={onPlace}
              disabled={processing}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? 'Mise à jour...' : 'Marquer placé'}
            </button>
          )}

          {canConfirm(row) && (
            <button
              onClick={onConfirm}
              disabled={processing}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? 'Mise à jour...' : 'Confirmer exécuté'}
            </button>
          )}

          {canCancel(row) && (
            <button
              onClick={onCancel}
              disabled={processing}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-red-300/30 bg-red-400/10 px-5 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? 'Mise à jour...' : 'Annuler'}
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}

function HeroMetric({
  label,
  value,
  helper,
  icon,
  tone = 'neutral',
}: {
  label: string
  value: string
  helper: string
  icon: ReactNode
  tone?: 'neutral' | 'positive' | 'warning'
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-300 border-emerald-300/20 bg-emerald-400/10'
      : tone === 'warning'
        ? 'text-amber-300 border-amber-300/20 bg-amber-400/10'
        : 'text-cyan-200 border-white/10 bg-white/[0.05]'

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

function PriorityLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="truncate text-right text-sm font-semibold text-white">{value}</span>
    </div>
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

function OrderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function DrawerMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function TimelineLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  )
}

function CheckLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${ok ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200' : 'border-red-300/30 bg-red-400/10 text-red-200'}`}>
        {ok ? 'OK' : 'BLOQUÉ'}
      </span>
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-[46px] w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 pr-9 text-sm text-white outline-none transition hover:border-white/20 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
        >
          {options.map((option) => (
            <option key={option} value={option} className="bg-[#101827] text-white">
              {option}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
      </div>
    </label>
  )
}

function PillButton({
  label,
  active,
  onClick,
  positive,
  warning,
}: {
  label: string
  active: boolean
  onClick: () => void
  positive?: boolean
  warning?: boolean
}) {
  const activeClass = positive
    ? 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100'
    : warning
      ? 'border-amber-300/40 bg-amber-400/20 text-amber-100'
      : 'border-cyan-300/40 bg-cyan-300/20 text-cyan-100'

  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? activeClass
          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.07]'
      }`}
    >
      {label}
    </button>
  )
}

function LifecycleBadge({ lifecycle }: { lifecycle: StatusFilter }) {
  const className =
    lifecycle === 'CONFIRMED'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : lifecycle === 'TO_CONFIRM' || lifecycle === 'TOUCHED'
        ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
        : lifecycle === 'PLACED'
          ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
          : lifecycle === 'CANCELLED' || lifecycle === 'REPLACED'
            ? 'border-slate-300/20 bg-slate-400/10 text-slate-300'
            : 'border-white/10 bg-white/10 text-slate-300'

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {lifecycle === 'TO_CONFIRM'
        ? 'À CONFIRMER'
        : lifecycle === 'TOUCHED'
          ? 'TOUCHÉ'
          : lifecycle}
    </span>
  )
}

function ScopeBadge({ value }: { value: ScopeFilter }) {
  const className =
    value === 'PEA'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : value === 'CTO'
        ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
        : 'border-white/10 bg-white/10 text-slate-300'

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{value}</span>
}

function RiskBadge({ risk }: { risk: 'low' | 'medium' | 'high' }) {
  const className =
    risk === 'low'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : risk === 'medium'
        ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
        : 'border-red-300/30 bg-red-400/10 text-red-200'

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {risk === 'low' ? 'RISK LOW' : risk === 'medium' ? 'RISK MID' : 'RISK HIGH'}
    </span>
  )
}