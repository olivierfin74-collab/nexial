'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import FeedbackModal from '@/components/FeedbackModal'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  BadgeEuro,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Database,
  Eye,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'

const SIGNAL_VIEW = 'vw_nexial_signal_v1'
const AUTO_EXECUTION_VIEW = 'vw_auto_execution_suggestions_v1'
const CREATE_ORDER_RPC = 'fn_create_execution_order_from_auto_suggestion_v1'
const AUTO_REFRESH_MS = 60000

type OpportunityStatus =
  | 'EXECUTABLE'
  | 'HOT_PULLBACK'
  | 'WATCH_PULLBACK'
  | 'TOO_EARLY'
  | 'DEEP_PULLBACK'
  | 'BLOCKED_DATA'

type SignalRow = {
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

type AutoExecutionRow = {
  invest_row_id?: string | null
  ticker: string
  asset_name?: string | null
  account_scope?: string | null
  broker?: string | null
  latest_price?: number | null
  currency?: string | null
  price_quality?: string | null
  buy_zone_low?: number | null
  buy_zone_high?: number | null
  suggested_limit_price?: number | null
  suggested_quantity?: number | null
  suggested_amount?: number | null
  amount_unused?: number | null
  suggested_order_type?: string | null
  execution_probability?: number | null
  execution_status?: string | null
  is_order_ready?: boolean | null
  nexial_score?: number | null
  adaptive_nexial_score?: number | null
  learning_signal?: string | null
  adaptive_reason?: string | null
  adaptive_decision?: string | null
  adaptive_rank?: number | null
  expected_return_pct?: number | null
  capital_efficiency_score?: number | null
  execution_reason?: string | null
  order_message?: string | null
  calculated_at?: string | null
}

type ActionRow = SignalRow & {
  auto_is_order_ready?: boolean | null
  auto_limit_price?: number | null
  auto_quantity?: number | null
  auto_amount_estimated?: number | null
  auto_execution_probability?: number | null
  auto_block_reason?: string | null
  auto_source?: string | null
  auto_order_type?: string | null
  auto_broker?: string | null
  auto_account_scope?: string | null
}

type ExecutionHealth = {
  totalRows: number
  executableSignals: number
  actionable: number
  hot: number
  watch: number
  tooEarly: number
  deepPullback: number
  blockedData: number
  blockedNoZone: number
  blockedNoPrice: number
  blockedAuto: number
  blockedQuantity: number
  blockedDecision: number
  staleRows: number
}

type OrderCreationState = {
  ticker: string
  status: 'success' | 'error'
  message: string
  payload?: unknown
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

  const safeCurrency = currency && currency.length === 3 ? currency : 'EUR'

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function num(value?: number | null, digits = 4) {
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
  if (!value) return 'date inconnue'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'date inconnue'

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

function normalizeTicker(ticker?: string | null) {
  return String(ticker || '')
    .replace(/\..*$/, '')
    .trim()
    .toUpperCase()
}

function normalizeScope(scope?: string | null) {
  const value = String(scope || '').toUpperCase()

  if (value.includes('PEA')) return 'PEA'
  if (value.includes('CTO')) return 'CTO'

  return 'UNKNOWN'
}

function priceIsOk(row: ActionRow) {
  return String(row.price_quality || '').toUpperCase() === 'OK'
}

function hasValidPrice(row: ActionRow) {
  return row.latest_price != null && Number(row.latest_price) > 0
}

function hasValidZone(row: ActionRow) {
  return (
    row.buy_zone_low != null &&
    row.buy_zone_high != null &&
    Number(row.buy_zone_low) > 0 &&
    Number(row.buy_zone_high) > 0 &&
    Number(row.buy_zone_low) <= Number(row.buy_zone_high)
  )
}

function hasValidQuantity(row: ActionRow) {
  return row.auto_quantity != null && Number(row.auto_quantity) > 0
}

function hasValidAmount(row: ActionRow) {
  return row.auto_amount_estimated != null && Number(row.auto_amount_estimated) > 0
}

function phase(row: ActionRow) {
  return String(row.nexial_phase || '').toUpperCase()
}

function isPhaseBuyCompatible(row: ActionRow) {
  const value = phase(row)
  return value === 'BUY' || value === 'WATCH'
}

function opportunityStatus(row: ActionRow): OpportunityStatus {
  if (!priceIsOk(row) || !hasValidPrice(row) || !hasValidZone(row)) {
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

function isAutoOrderReady(row: ActionRow) {
  return (
    row.auto_is_order_ready === true &&
    Number(row.auto_quantity || 0) > 0 &&
    Number(row.auto_amount_estimated || 0) > 0 &&
    Number(row.auto_limit_price || 0) > 0
  )
}

function isActionable(row: ActionRow) {
  return (
    opportunityStatus(row) === 'EXECUTABLE' &&
    isPhaseBuyCompatible(row) &&
    priceIsOk(row) &&
    hasValidPrice(row) &&
    hasValidZone(row) &&
    hasValidQuantity(row) &&
    hasValidAmount(row) &&
    isAutoOrderReady(row)
  )
}

function zoneLabel(row: ActionRow) {
  if (!hasValidZone(row)) return 'Zone non définie'

  return `${money(row.buy_zone_low, row.currency || 'EUR')} – ${money(
    row.buy_zone_high,
    row.currency || 'EUR'
  )}`
}

function actionLabel(row: ActionRow) {
  const status = opportunityStatus(row)

  if (status === 'EXECUTABLE') return 'Achat possible'
  if (status === 'HOT_PULLBACK') return 'Attendre entrée zone'
  if (status === 'WATCH_PULLBACK') return 'Surveiller pullback'
  if (status === 'DEEP_PULLBACK') return 'Audit pullback fort'
  if (status === 'TOO_EARLY') return 'Trop tôt'
  return 'Data bloquée'
}

function executionBlockReason(row: ActionRow) {
  const status = opportunityStatus(row)

  if (!priceIsOk(row)) return 'Donnée prix non fiable'
  if (!hasValidPrice(row)) return 'Prix indisponible'
  if (!hasValidZone(row)) return 'Zone d’achat absente'
  if (status !== 'EXECUTABLE') return actionLabel(row)
  if (!isPhaseBuyCompatible(row)) return 'Phase Nexial non compatible achat'
  if (!hasValidQuantity(row)) return 'Quantité non exécutable'
  if (!hasValidAmount(row)) return 'Montant non exploitable'
  if (!isAutoOrderReady(row)) return row.auto_block_reason || 'Auto execution non validée'

  return 'Aucun blocage'
}

function statusTone(status: OpportunityStatus): 'positive' | 'warning' | 'negative' | 'neutral' | 'risk' {
  if (status === 'EXECUTABLE') return 'positive'
  if (status === 'HOT_PULLBACK') return 'warning'
  if (status === 'WATCH_PULLBACK') return 'neutral'
  if (status === 'TOO_EARLY') return 'negative'
  if (status === 'DEEP_PULLBACK') return 'warning'
  return 'risk'
}

function score(row: ActionRow) {
  return Number(row.nexial_score || row.score || 0)
}

function orderRank(row: ActionRow) {
  const status = opportunityStatus(row)

  const statusBoost =
    status === 'EXECUTABLE'
      ? 200
      : status === 'HOT_PULLBACK'
        ? 80
        : status === 'WATCH_PULLBACK'
          ? 35
          : status === 'DEEP_PULLBACK'
            ? 10
            : status === 'TOO_EARLY'
              ? -30
              : -120

  return (
    score(row) * 2 +
    Number(row.priority_score || 0) +
    Number(row.capital_efficiency_score || 0) +
    Number(row.auto_execution_probability || 0) +
    statusBoost +
    (isAutoOrderReady(row) ? 60 : 0)
  )
}

function distanceToZone(row: ActionRow) {
  return row.distance_to_buy_zone_pct ?? null
}

function orderLimitPrice(row: ActionRow) {
  if (row.auto_limit_price != null && Number(row.auto_limit_price) > 0) return Number(row.auto_limit_price)
  if (row.buy_zone_high != null) return Number(row.buy_zone_high)
  return row.latest_price
}

function executionQuantity(row: ActionRow) {
  return Number(row.auto_quantity || 0)
}

function executionAmount(row: ActionRow) {
  return Number(row.auto_amount_estimated || 0)
}

function executionAccount(row: ActionRow) {
  const autoScope = normalizeScope(row.auto_account_scope)
  const signalScope = normalizeScope(row.account_type)
  const currency = String(row.currency || '').toUpperCase()

  if (autoScope === 'PEA' || signalScope === 'PEA') return 'PEA'
  if (row.auto_broker) return `${signalScope} ${row.auto_broker}`
  if (currency === 'USD') return 'CTO IBKR'

  return signalScope === 'UNKNOWN' ? 'Compte à confirmer' : signalScope
}

function orderType(row: ActionRow) {
  if (row.auto_order_type) return row.auto_order_type
  const currency = String(row.currency || '').toUpperCase()
  if (currency === 'USD') return 'Limit GTC'
  return 'Limit jour'
}

function extractAutoLimit(row: AutoExecutionRow) {
  return Number(row.suggested_limit_price ?? 0) || null
}

function extractAutoQuantity(row: AutoExecutionRow) {
  return Number(row.suggested_quantity ?? 0) || null
}

function extractAutoAmount(row: AutoExecutionRow) {
  return Number(row.suggested_amount ?? 0) || null
}

function extractAutoBlockReason(row: AutoExecutionRow) {
  return row.execution_status || row.execution_reason || row.order_message || null
}

export default function ActionsPage() {
  const supabase = useMemo(() => createClient(), [])

  const [rows, setRows] = useState<ActionRow[]>([])
  const [autoRows, setAutoRows] = useState<AutoExecutionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [creatingAll, setCreatingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<ActionRow | null>(null)
  const [creatingTicker, setCreatingTicker] = useState<string | null>(null)
  const [orderCreation, setOrderCreation] = useState<OrderCreationState | null>(null)

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError(null)

    const [signalResult, autoResult] = await Promise.all([
      supabase.from(SIGNAL_VIEW).select('*'),
      supabase.from(AUTO_EXECUTION_VIEW).select('*'),
    ])

    if (signalResult.error) {
      setError(signalResult.error.message)
      setRows([])
      setAutoRows([])
      setLoading(false)
      setRefreshing(false)
      return
    }

    const signals = (signalResult.data || []) as SignalRow[]
    const auto = (autoResult.data || []) as AutoExecutionRow[]

    if (autoResult.error) {
      setError(autoResult.error.message)
    }

    setAutoRows(auto)

    const autoMap = new Map<string, AutoExecutionRow>()
    auto.forEach((row) => {
      autoMap.set(normalizeTicker(row.ticker), row)
    })

    const mergedRows: ActionRow[] = signals.map((row) => {
      const autoRow = autoMap.get(normalizeTicker(row.ticker))

      return {
        ...row,
        auto_is_order_ready: autoRow?.is_order_ready ?? null,
        auto_limit_price: autoRow ? extractAutoLimit(autoRow) : null,
        auto_quantity: autoRow ? extractAutoQuantity(autoRow) : null,
        auto_amount_estimated: autoRow ? extractAutoAmount(autoRow) : null,
        auto_execution_probability: autoRow?.execution_probability ?? null,
        auto_block_reason: autoRow ? extractAutoBlockReason(autoRow) : null,
        auto_source: autoRow ? AUTO_EXECUTION_VIEW : null,
        auto_order_type: autoRow?.suggested_order_type ?? null,
        auto_broker: autoRow?.broker ?? null,
        auto_account_scope: autoRow?.account_scope ?? null,
      }
    })

    setRows(mergedRows)
    setLoading(false)
    setRefreshing(false)
  }

  async function createOrder(row: ActionRow) {
    const ticker = normalizeTicker(row.ticker)

    setOrderCreation(null)

    if (!isActionable(row)) {
      setOrderCreation({
        ticker,
        status: 'error',
        message: executionBlockReason(row),
      })
      return false
    }

    setCreatingTicker(ticker)

    const firstAttempt = await supabase.rpc(CREATE_ORDER_RPC, { ticker })

    if (firstAttempt.error) {
      const secondAttempt = await supabase.rpc(CREATE_ORDER_RPC, { p_ticker: ticker })

      if (secondAttempt.error) {
        setCreatingTicker(null)
        setOrderCreation({
          ticker,
          status: 'error',
          message: secondAttempt.error.message || firstAttempt.error.message,
        })
        return false
      }

      setCreatingTicker(null)
      setOrderCreation({
        ticker,
        status: 'success',
        message: 'Ordre créé ou déjà actif. Disponible dans /orders.',
        payload: secondAttempt.data,
      })
      return true
    }

    setCreatingTicker(null)
    setOrderCreation({
      ticker,
      status: 'success',
      message: 'Ordre créé ou déjà actif. Disponible dans /orders.',
      payload: firstAttempt.data,
    })

    return true
  }

  async function createAllOrders(items: ActionRow[]) {
    if (items.length === 0) return

    setCreatingAll(true)

    setOrderCreation({
      ticker: 'SYSTEM',
      status: 'success',
      message: 'Traitement des ordres en cours. Nexial vérifie chaque ordre avant création.',
    })

    let successCount = 0
    let lastError: string | null = null

    for (const item of items) {
      const ok = await createOrder(item)
      if (ok) successCount += 1
      if (!ok) lastError = `${normalizeTicker(item.ticker)} : ${executionBlockReason(item)}`
    }

    setCreatingAll(false)

    if (successCount === items.length) {
      setOrderCreation({
        ticker: 'TOP 3',
        status: 'success',
        message: `${successCount} ordre(s) créé(s) ou déjà actif(s). Disponible(s) dans /orders.`,
      })
      return
    }

    setOrderCreation({
      ticker: 'TOP 3',
      status: successCount > 0 ? 'success' : 'error',
      message:
        successCount > 0
          ? `${successCount} ordre(s) créé(s). Certains ordres sont bloqués : ${lastError || 'blocage inconnu'}.`
          : lastError || 'Aucun ordre créé.',
    })
  }

  useEffect(() => {
    load(false)

    const interval = setInterval(() => {
      load(true)
    }, AUTO_REFRESH_MS)

    return () => clearInterval(interval)
}, [supabase])
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => orderRank(b) - orderRank(a))
  }, [rows])

  const actionableRows = useMemo(() => {
    return sortedRows.filter(isActionable).slice(0, 3)
  }, [sortedRows])

  const blockedRows = useMemo(() => {
    return sortedRows.filter((row) => !isActionable(row))
  }, [sortedRows])

  const hotRows = useMemo(() => {
    return sortedRows
      .filter((row) => opportunityStatus(row) === 'HOT_PULLBACK')
      .slice(0, 3)
  }, [sortedRows])

  const watchRows = useMemo(() => {
    return sortedRows
      .filter((row) => opportunityStatus(row) === 'WATCH_PULLBACK')
      .slice(0, 6)
  }, [sortedRows])

  const executionHealth = useMemo<ExecutionHealth>(() => {
    return {
      totalRows: sortedRows.length,
      executableSignals: sortedRows.filter((row) => opportunityStatus(row) === 'EXECUTABLE').length,
      actionable: actionableRows.length,
      hot: sortedRows.filter((row) => opportunityStatus(row) === 'HOT_PULLBACK').length,
      watch: sortedRows.filter((row) => opportunityStatus(row) === 'WATCH_PULLBACK').length,
      tooEarly: sortedRows.filter((row) => opportunityStatus(row) === 'TOO_EARLY').length,
      deepPullback: sortedRows.filter((row) => opportunityStatus(row) === 'DEEP_PULLBACK').length,
      blockedData: sortedRows.filter((row) => opportunityStatus(row) === 'BLOCKED_DATA').length,
      blockedNoZone: blockedRows.filter((row) => !hasValidZone(row)).length,
      blockedNoPrice: blockedRows.filter((row) => !hasValidPrice(row)).length,
      blockedQuantity: blockedRows.filter((row) => !hasValidQuantity(row)).length,
      blockedAuto: blockedRows.filter((row) => !isAutoOrderReady(row)).length,
      blockedDecision: blockedRows.filter((row) => !isPhaseBuyCompatible(row)).length,
      staleRows: sortedRows.filter((row) => !isFresh(row.price_timestamp)).length,
    }
  }, [sortedRows, actionableRows, blockedRows])

  const latestUpdate = useMemo(() => {
    const dates = sortedRows
      .map((row) => row.price_timestamp)
      .filter(Boolean)
      .map((value) => new Date(value as string))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())

    return dates[0]?.toISOString() || null
  }, [sortedRows])

  const totalAmount = useMemo(() => {
    return actionableRows.reduce((sum, row) => sum + Number(executionAmount(row) || 0), 0)
  }, [actionableRows])

  const avgScore = useMemo(() => {
    if (sortedRows.length === 0) return 0

    return Math.round(
      sortedRows.reduce((sum, row) => sum + Number(score(row) || 0), 0) / sortedRows.length
    )
  }, [sortedRows])

  const bestOrder = actionableRows[0] || null
  const hasAction = actionableRows.length > 0
  const dataAlerts =
    executionHealth.blockedData +
    executionHealth.blockedNoPrice

  if (loading) {
    return <LoadingState />
  }

  return (
    <main className="min-h-screen bg-[#08111f] px-4 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-[1720px] space-y-5">
        {error && <ErrorBanner message={error} />}
        {orderCreation && <OrderCreationBanner state={orderCreation} onClose={() => setOrderCreation(null)} />}

        <PremiumDecisionHero
          hasAction={hasAction}
          actionCount={actionableRows.length}
          totalAmount={totalAmount}
          bestOrder={bestOrder}
          latestUpdate={latestUpdate}
          dataAlerts={dataAlerts}
          refreshing={refreshing}
          creatingAll={creatingAll}
          avgScore={avgScore}
          autoSuggestions={autoRows.length}
          hotCount={executionHealth.hot}
          watchCount={executionHealth.watch}
          onRefresh={() => load(true)}
          onCreateAll={() => createAllOrders(actionableRows)}
          onOpenDetails={() => setDetailsOpen(true)}
        />

        {hasAction ? (
          <ExecutableOrders
            rows={actionableRows}
            creatingTicker={creatingTicker}
            creatingAll={creatingAll}
            onOpen={setSelectedOrder}
            onCreateOrder={createOrder}
            onCreateAll={() => createAllOrders(actionableRows)}
          />
        ) : (
          <NoActionState
            blockedCount={blockedRows.length}
            dataAlerts={dataAlerts}
            hotRows={hotRows}
            watchRows={watchRows}
            onOpenDetails={() => setDetailsOpen(true)}
          />
        )}

        <ExecutionControlPanel health={executionHealth} onOpenDetails={() => setDetailsOpen(true)} />
      </div>

      {detailsOpen && (
        <SystemDetailsModal
          health={executionHealth}
          rows={blockedRows.slice(0, 12)}
          onClose={() => setDetailsOpen(false)}
        />
      )}

      {selectedOrder && (
        <OrderDrawer
          item={selectedOrder}
          creating={creatingTicker === normalizeTicker(selectedOrder.ticker)}
          onClose={() => setSelectedOrder(null)}
          onCreateOrder={() => createOrder(selectedOrder)}
        />
      )}

      <FeedbackModal page="actions" />
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
              <Database size={14} /> Nexial Actions
            </div>
            <h1 className="text-4xl font-semibold tracking-tight">Chargement du cockpit d’exécution...</h1>
            <p className="mt-3 text-sm text-slate-400">
              Lecture de <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-200">{SIGNAL_VIEW}</code> +{' '}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-200">{AUTO_EXECUTION_VIEW}</code>
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
      Erreur de lecture : {message}
    </section>
  )
}

function OrderCreationBanner({
  state,
  onClose,
}: {
  state: OrderCreationState
  onClose: () => void
}) {
  const isSuccess = state.status === 'success'
  const isProcessing = state.ticker === 'SYSTEM'

  return (
    <section
      className={`rounded-[1.5rem] border p-5 ${
        isSuccess
          ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
          : 'border-red-300/30 bg-red-400/10 text-red-100'
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold">
            {isProcessing ? 'Vérification en cours' : isSuccess ? 'Exécution préparée' : 'Exécution bloquée'}
          </p>

          <p className="mt-1 text-sm opacity-90">{state.message}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSuccess && !isProcessing && (
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
            >
              Voir mes ordres <ArrowRight size={15} />
            </Link>
          )}

          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
          >
            Fermer
          </button>
        </div>
      </div>
    </section>
  )
}

function PremiumDecisionHero({
  hasAction,
  actionCount,
  totalAmount,
  bestOrder,
  latestUpdate,
  dataAlerts,
  refreshing,
  creatingAll,
  avgScore,
  autoSuggestions,
  hotCount,
  watchCount,
  onRefresh,
  onCreateAll,
  onOpenDetails,
}: {
  hasAction: boolean
  actionCount: number
  totalAmount: number
  bestOrder: ActionRow | null
  latestUpdate: string | null
  dataAlerts: number
  refreshing: boolean
  creatingAll: boolean
  avgScore: number
  autoSuggestions: number
  hotCount: number
  watchCount: number
  onRefresh: () => void
  onCreateAll: () => void
  onOpenDetails: () => void
}) {
  return (
    <header className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#101827] shadow-[0_30px_120px_rgba(0,0,0,0.38)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.22),transparent_34%),radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.07),transparent_42%)]" />

      <div className="relative grid gap-8 p-6 lg:grid-cols-[1.25fr_0.75fr] lg:p-8">
        <div>
          <div
            className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${
              hasAction
                ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
                : 'border-amber-300/20 bg-amber-300/10 text-amber-200'
            }`}
          >
            {hasAction ? <Sparkles size={14} /> : <TimerReset size={14} />}
            Actions Engine
          </div>

          <h1
            className={`max-w-5xl text-5xl font-semibold tracking-[-0.055em] md:text-7xl ${
              hasAction ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {hasAction ? 'Créer les ordres' : 'Attendre'}
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            {hasAction
              ? `${actionCount} ordre(s) prêt(s), validé(s) par le moteur. Prix limite uniquement, aucun achat marché.`
              : 'Aucune opportunité n’est dans sa zone d’achat. Les signaux proches restent en surveillance, sans création d’ordre.'}
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <DecisionMetric
              label={hasAction ? 'Montant à engager' : 'Capital protégé'}
              value={hasAction ? eur(totalAmount) : '100 %'}
              helper={hasAction ? 'ordres limités' : 'aucun achat forcé'}
              icon={<Wallet size={18} />}
              tone={hasAction ? 'positive' : 'warning'}
            />
            <DecisionMetric
              label="Ordres prêts"
              value={String(actionCount)}
              helper={`Hot ${hotCount} · Watch ${watchCount}`}
              icon={<ClipboardCheck size={18} />}
              tone={hasAction ? 'positive' : 'neutral'}
            />
            <DecisionMetric
              label="Qualité"
              value={dataAlerts === 0 ? 'OK' : 'À vérifier'}
              helper={dataAlerts === 0 ? `maj ${formatDate(latestUpdate)}` : `${dataAlerts} alerte(s) data`}
              icon={dataAlerts === 0 ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              tone={dataAlerts === 0 ? 'positive' : 'warning'}
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {hasAction && (
              <button
                onClick={onCreateAll}
                disabled={creatingAll}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/15 px-6 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingAll ? 'Création des ordres...' : 'Créer les ordres prêts'} <ArrowRight size={16} />
              </button>
            )}

            <button
              onClick={onRefresh}
              disabled={refreshing || creatingAll}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Actualisation...' : 'Actualiser'}
            </button>

            <button
              onClick={onOpenDetails}
              className={`inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition ${
                dataAlerts > 0
                  ? 'border-amber-300/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15'
                  : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10'
              }`}
            >
              Audit système
            </button>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Priorité</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">
                {bestOrder ? bestOrder.ticker : 'No action'}
              </h2>
            </div>
            <div
              className={`rounded-2xl border p-3 ${
                hasAction
                  ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-300'
                  : 'border-amber-300/20 bg-amber-400/10 text-amber-300'
              }`}
            >
              {hasAction ? <Sparkles size={22} /> : <ShieldCheck size={22} />}
            </div>
          </div>

          {bestOrder ? (
            <div className="space-y-3">
              <PriorityLine label="Nom" value={bestOrder.asset_name || bestOrder.ticker} />
              <PriorityLine label="Compte" value={executionAccount(bestOrder)} />
              <PriorityLine label="Prix limite" value={money(orderLimitPrice(bestOrder), bestOrder.currency || 'EUR')} />
              <PriorityLine label="Quantité" value={num(executionQuantity(bestOrder), 0)} />
              <PriorityLine label="Montant" value={money(executionAmount(bestOrder), bestOrder.currency || 'EUR')} />
              <PriorityLine label="Score" value={`${num(score(bestOrder), 0)}/100`} />
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm leading-6 text-slate-300">
              Nexial ne crée aucun ordre hors zone. Les opportunités proches sont surveillées dans Watchlist.
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <CompactMetric label="Score moyen" value={`${avgScore}/100`} />
            <CompactMetric label="Suggestions" value={String(autoSuggestions)} />
          </div>
        </aside>
      </div>
    </header>
  )
}

function ExecutableOrders({
  rows,
  creatingTicker,
  creatingAll,
  onOpen,
  onCreateOrder,
  onCreateAll,
}: {
  rows: ActionRow[]
  creatingTicker: string | null
  creatingAll: boolean
  onOpen: (row: ActionRow) => void
  onCreateOrder: (row: ActionRow) => void
  onCreateAll: () => void
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[#101827]/95 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)]">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles size={18} className="text-emerald-300" /> Ordres validés
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Uniquement les signaux EXECUTABLE : prix dans zone, data OK, ordre auto prêt.
          </p>
        </div>

        <button
          onClick={onCreateAll}
          disabled={creatingAll}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creatingAll ? 'Création...' : `Créer ${rows.length} ordre(s)`}
          <ArrowRight size={15} />
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {rows.map((item, index) => (
          <OrderCard
            key={`${item.id}-${item.ticker}`}
            item={item}
            index={index}
            creating={creatingTicker === normalizeTicker(item.ticker) || creatingAll}
            onOpen={() => onOpen(item)}
            onCreateOrder={() => onCreateOrder(item)}
          />
        ))}
      </div>
    </section>
  )
}
function OrderCard({
  item,
  index,
  creating,
  onOpen,
  onCreateOrder,
}: {
  item: ActionRow
  index: number
  creating: boolean
  onOpen: () => void
  onCreateOrder: () => void
}) {
  const status = opportunityStatus(item)

  return (
    <article className="rounded-[1.5rem] border border-emerald-300/20 bg-emerald-400/[0.08] p-5 shadow-[0_0_70px_rgba(16,185,129,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs text-emerald-100">
              #{index + 1}
            </span>
            <StatusBadge status={status} />
            <ScopeBadge value={normalizeScope(item.account_type)} />
            <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">
              AUTO READY
            </span>
          </div>

          <h3 className="mt-3 truncate text-3xl font-semibold text-white">{item.ticker}</h3>
          <p className="mt-1 truncate text-sm text-slate-300">{item.asset_name || item.ticker}</p>
        </div>

        <ScoreBadge value={score(item)} label="Score" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <OrderMetric label="Montant" value={money(executionAmount(item), item.currency || 'EUR')} />
        <OrderMetric label="Quantité" value={num(executionQuantity(item), 0)} />
        <OrderMetric label="Limite" value={money(orderLimitPrice(item), item.currency || 'EUR')} />
        <OrderMetric label="Compte" value={executionAccount(item)} />
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
        <div className="grid gap-3 text-sm">
          <Line label="Prix actuel" value={money(item.latest_price, item.currency || 'EUR')} />
          <Line label="Zone validée" value={zoneLabel(item)} />
          <Line label="Type ordre" value={orderType(item)} />
          <Line label="Distance zone" value={pct(distanceToZone(item))} />
          <Line label="Probabilité" value={`${num(item.auto_execution_probability, 0)}/100`} />
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
        {item.nexial_reason || item.thesis || 'Prix en zone validée. Création possible uniquement en ordre limite.'}
      </div>

      <div className="mt-5 flex gap-3">
        <button
          onClick={onCreateOrder}
          disabled={creating}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creating ? 'Création...' : 'Créer l’ordre'} <ArrowRight size={16} />
        </button>

        <button
          onClick={onOpen}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
        >
          <Eye size={15} />
          Audit
        </button>
      </div>
    </article>
  )
}

function NoActionState({
  blockedCount,
  dataAlerts,
  hotRows,
  watchRows,
  onOpenDetails,
}: {
  blockedCount: number
  dataAlerts: number
  hotRows: ActionRow[]
  watchRows: ActionRow[]
  onOpenDetails: () => void
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[#101827]/95 p-8 shadow-[0_24px_90px_rgba(0,0,0,0.25)]">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-300">
          <TimerReset size={26} />
        </div>

        <p className="mt-6 text-center text-sm uppercase tracking-[0.28em] text-slate-500">
          Discipline active
        </p>

        <h2 className="mt-3 text-center text-4xl font-semibold text-white">
          Aucun ordre à placer
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-7 text-slate-300">
          {blockedCount > 0
            ? `${blockedCount} idée(s) sont suivies mais bloquées par les règles Nexial.`
            : 'Aucune idée exploitable n’est disponible actuellement.'}
        </p>

        <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-sm leading-6 text-slate-300">
          Nexial protège le capital : pas de breakout, pas de marché, pas d’ordre sans zone, pas d’achat si la donnée prix est douteuse.
        </div>

        {(hotRows.length > 0 || watchRows.length > 0) && (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <NearSignalPanel title="Hot pullback" rows={hotRows} tone="warning" />
            <NearSignalPanel title="Watch pullback" rows={watchRows.slice(0, 3)} tone="neutral" />
          </div>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onOpenDetails}
            className={`inline-flex rounded-full border px-6 py-3 text-sm font-semibold transition ${
              dataAlerts > 0
                ? 'border-amber-300/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15'
                : 'border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/10'
            }`}
          >
            Voir pourquoi
          </button>

          <Link
            href="/watchlist"
            className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
          >
            Voir Watchlist
          </Link>
        </div>
      </div>
    </section>
  )
}

function NearSignalPanel({
  title,
  rows,
  tone,
}: {
  title: string
  rows: ActionRow[]
  tone: 'warning' | 'neutral'
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className={`text-sm font-semibold ${tone === 'warning' ? 'text-amber-300' : 'text-cyan-300'}`}>
          {title}
        </p>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
          {rows.length} actif(s)
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun signal proche dans cette catégorie.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={`${row.id}-${row.ticker}-near`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">{row.ticker}</p>
                  <p className="text-sm text-slate-400">{row.asset_name || row.ticker}</p>
                </div>
                <StatusBadge status={opportunityStatus(row)} />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <SmallInfo label="Prix" value={money(row.latest_price, row.currency || 'EUR')} />
                <SmallInfo label="Zone" value={zoneLabel(row)} />
                <SmallInfo label="Distance" value={pct(distanceToZone(row))} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ExecutionControlPanel({ health, onOpenDetails }: { health: ExecutionHealth; onOpenDetails: () => void }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[#101827]/95 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)]">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldCheck size={18} className="text-cyan-300" /> Audit exécution
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Panneau secondaire. Les signaux bloqués ne deviennent jamais des ordres utilisateur.
          </p>
        </div>

        <button
          onClick={onOpenDetails}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
        >
          Voir détails
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-10">
        <Metric label="Signaux" value={String(health.totalRows)} />
        <Metric label="Prêts" value={String(health.actionable)} positive={health.actionable > 0} />
        <Metric label="En zone" value={String(health.executableSignals)} positive={health.executableSignals > 0} />
        <Metric label="Hot" value={String(health.hot)} warning={health.hot > 0} />
        <Metric label="Watch" value={String(health.watch)} />
        <Metric label="Trop tôt" value={String(health.tooEarly)} />
        <Metric label="Sous zone" value={String(health.deepPullback)} warning={health.deepPullback > 0} />
        <Metric label="Data" value={String(health.blockedData)} warning={health.blockedData > 0} />
        <Metric label="Auto" value={String(health.blockedAuto)} warning={health.blockedAuto > 0} />
        <Metric label="Fresh" value={String(health.staleRows)} warning={health.staleRows > 0} />
      </div>
    </section>
  )
}

function SystemDetailsModal({
  health,
  rows,
  onClose,
}: {
  health: ExecutionHealth
  rows: ActionRow[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#07111f] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Données système</p>
            <h2 className="mt-3 text-3xl font-semibold">Contrôle exécution</h2>
            <p className="mt-2 text-sm text-slate-400">
              Les idées bloquées ne sont pas affichées comme actions. Ce panneau sert uniquement à l’audit.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-slate-200 transition hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Signaux lus" value={String(health.totalRows)} />
          <Metric label="Actionnables" value={String(health.actionable)} positive={health.actionable > 0} />
          <Metric label="En zone" value={String(health.executableSignals)} positive={health.executableSignals > 0} />
          <Metric label="Auto bloqués" value={String(health.blockedAuto)} warning={health.blockedAuto > 0} />
          <Metric label="Data prix" value={String(health.blockedData + health.staleRows)} warning={health.blockedData + health.staleRows > 0} />
        </div>

        <div className="mt-6 space-y-3">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              Aucun blocage à afficher.
            </div>
          ) : (
            rows.map((row) => (
              <div key={`${row.id}-${row.ticker}-blocked`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{row.ticker}</p>
                    <p className="text-sm text-slate-400">{row.asset_name || row.ticker}</p>
                  </div>

                  <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100">
                    {executionBlockReason(row)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-5">
                  <BlockedMetric label="Prix" value={money(row.latest_price, row.currency || 'EUR')} />
                  <BlockedMetric label="Zone" value={zoneLabel(row)} />
                  <BlockedMetric label="Distance" value={pct(distanceToZone(row))} />
                  <BlockedMetric label="Quantité Auto" value={num(row.auto_quantity, 0)} />
                  <BlockedMetric label="Auto statut" value={row.auto_block_reason || '—'} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function OrderDrawer({
  item,
  creating,
  onClose,
  onCreateOrder,
}: {
  item: ActionRow
  creating: boolean
  onClose: () => void
  onCreateOrder: () => void
}) {
  const status = opportunityStatus(item)

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <button aria-label="Fermer" className="absolute inset-0 cursor-default" onClick={onClose} />

      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#07111f] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">
              Ordre prêt à créer
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight">{item.ticker}</h2>
            <p className="mt-1 text-slate-400">{item.asset_name || item.ticker}</p>
          </div>

          <button onClick={onClose} className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-slate-300 transition hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-emerald-300/20 bg-emerald-400/10 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-emerald-200">Action</p>
              <p className="mt-1 text-3xl font-semibold text-white">BUY LIMIT</p>
            </div>
            <StatusBadge status={status} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-200">
            {item.nexial_reason || item.thesis || 'Ordre validé par le moteur Nexial.'}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <DrawerMetric label="Compte" value={executionAccount(item)} />
          <DrawerMetric label="Type" value={orderType(item)} />
          <DrawerMetric label="Quantité" value={num(executionQuantity(item), 0)} />
          <DrawerMetric label="Prix limite" value={money(orderLimitPrice(item), item.currency || 'EUR')} />
          <DrawerMetric label="Montant" value={money(executionAmount(item), item.currency || 'EUR')} />
          <DrawerMetric label="Devise" value={item.currency || 'EUR'} />
          <DrawerMetric label="Prix actuel" value={money(item.latest_price, item.currency || 'EUR')} />
          <DrawerMetric label="Zone" value={zoneLabel(item)} />
          <DrawerMetric label="Score" value={num(score(item), 0)} />
          <DrawerMetric label="Probabilité" value={`${num(item.auto_execution_probability, 0)}/100`} />
          <DrawerMetric label="Source" value={item.auto_source || '—'} />
          <DrawerMetric label="Maj" value={formatDate(item.price_timestamp)} />
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm font-semibold text-white">Contrôles avant création ordre</p>
          <div className="mt-4 space-y-3">
            <CheckLine label="Signal en zone EXECUTABLE" ok={opportunityStatus(item) === 'EXECUTABLE'} />
            <CheckLine label="Prix fiable" ok={priceIsOk(item)} />
            <CheckLine label="Prix disponible" ok={hasValidPrice(item)} />
            <CheckLine label="Zone valide" ok={hasValidZone(item)} />
            <CheckLine label="Quantité entière exécutable" ok={executionQuantity(item) > 0} />
            <CheckLine label="Montant exploitable" ok={executionAmount(item) > 0} />
            <CheckLine label="Phase compatible achat" ok={isPhaseBuyCompatible(item)} />
            <CheckLine label="Auto execution ready" ok={isAutoOrderReady(item)} />
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCreateOrder}
            disabled={creating || !isActionable(item)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'Création...' : 'Créer l’ordre'} <ArrowRight size={16} />
          </button>

          <Link
            href="/orders"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            /orders
          </Link>
        </div>
      </aside>
    </div>
  )
}

function DecisionMetric({
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

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xs font-semibold text-white">{value}</p>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-semibold text-white">{value}</span>
    </div>
  )
}

function Metric({
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${positive ? 'text-emerald-300' : warning ? 'text-amber-300' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

function BlockedMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-slate-200">{value}</p>
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

function ScoreBadge({ value, label = 'Score' }: { value?: number | null; label?: string }) {
  const currentScore = Number(value || 0)
  const className =
    currentScore >= 90
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : currentScore >= 75
        ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
        : 'border-amber-300/30 bg-amber-400/10 text-amber-200'

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>
      {label} {num(currentScore, 0)}
    </span>
  )
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

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function ScopeBadge({ value }: { value: string }) {
  const className =
    value === 'PEA'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : value === 'CTO'
        ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
        : 'border-white/10 bg-white/10 text-slate-300'

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{value}</span>
}