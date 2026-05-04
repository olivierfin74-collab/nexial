'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import FeedbackModal from '@/components/FeedbackModal'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Database,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Wallet,
  X,
} from 'lucide-react'

const INVEST_VIEW = 'vw_invest_ui_v1'
const ADAPTIVE_VIEW = 'vw_actions_adaptive_top3_v1'
const AUTO_EXECUTION_VIEW = 'vw_auto_execution_suggestions_v1'
const CREATE_ORDER_RPC = 'fn_create_execution_order_from_auto_suggestion_v1'

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

  adaptive_nexial_score?: number | null
  learning_signal?: string | null
  adaptive_reason?: string | null
  adaptive_decision?: string | null
  adaptive_rank?: number | null

  auto_is_order_ready?: boolean | null
  auto_limit_price?: number | null
  auto_quantity?: number | null
  auto_amount_estimated?: number | null
  auto_execution_probability?: number | null
  auto_block_reason?: string | null
  auto_source?: string | null
}

type AdaptiveRow = {
  ticker: string
  asset_name: string | null
  account_type: string | null
  latest_price: number | null
  currency: string | null
  price_quality: string | null
  nexial_score: number | null
  adaptive_nexial_score: number | null
  learning_signal: string | null
  adaptive_reason: string | null
  nexial_phase: string | null
  adaptive_decision: string | null
  adaptive_rank: number | null
  calculated_at: string | null
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

type ExecutionHealth = {
  totalRows: number
  actionable: number
  adaptiveBuyReady: number
  adaptiveWatch: number
  adaptiveBlocked: number
  blockedNoZone: number
  blockedNoPrice: number
  blockedQuantity: number
  blockedData: number
  blockedAuto: number
  staleRows: number
  blockedDecision: number
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
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(Number(value))
}

function pct(value?: number | null, digits = 1) {
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

function isDecisionReady(row: InvestRow) {
  const adaptiveDecision = String(row.adaptive_decision || '').toUpperCase()
  const decision = String(row.decision || '').toUpperCase()

  return (
    adaptiveDecision === 'BUY_READY' ||
    decision.includes('READY') ||
    decision.includes('BUY') ||
    decision.includes('ACHAT')
  )
}

function isPriceOk(row: InvestRow) {
  return String(row.price_quality || '').toUpperCase() === 'OK'
}

function hasValidPrice(row: InvestRow) {
  return row.latest_close_price != null && Number(row.latest_close_price) > 0
}

function hasValidZone(row: InvestRow) {
  return row.buy_zone_low != null && row.buy_zone_high != null
}

function hasValidQuantity(row: InvestRow) {
  return row.suggested_quantity != null && Number(row.suggested_quantity) > 0
}

function hasValidAmount(row: InvestRow) {
  return row.amount_suggested != null && Number(row.amount_suggested) > 0
}

function hasAutoSuggestion(row: InvestRow) {
  return row.auto_is_order_ready != null
}

function isAutoOrderReady(row: InvestRow) {
  return (
    row.auto_is_order_ready === true &&
    Number(row.auto_quantity || 0) > 0 &&
    Number(row.auto_amount_estimated || 0) > 0 &&
    Number(row.auto_limit_price || 0) > 0
  )
}

function isActionable(row: InvestRow) {
  return (
    isPriceOk(row) &&
    hasValidPrice(row) &&
    hasValidZone(row) &&
    hasValidQuantity(row) &&
    hasValidAmount(row) &&
    isDecisionReady(row) &&
    isAutoOrderReady(row)
  )
}

function zoneLabel(row: InvestRow) {
  if (!hasValidZone(row)) return 'Zone non définie'

  return `${money(row.buy_zone_low, row.currency || 'EUR')} – ${money(
    row.buy_zone_high,
    row.currency || 'EUR'
  )}`
}

function executionBlockReason(row: InvestRow) {
  if (!isPriceOk(row)) return 'Donnée prix non fiable'
  if (!hasValidPrice(row)) return 'Prix indisponible'
  if (!hasValidZone(row)) return 'Zone d’achat absente'
  if (!hasValidQuantity(row)) return 'Quantité non exécutable côté Invest'
  if (!hasValidAmount(row)) return 'Montant non exploitable côté Invest'
  if (!isDecisionReady(row)) return 'Décision non validée'
  if (!hasAutoSuggestion(row)) return 'Suggestion auto absente'
  if (!isAutoOrderReady(row)) return row.auto_block_reason || 'Auto execution non validée'
  return 'Aucun blocage'
}

function baseScore(row: InvestRow) {
  return Number(row.score || 0) + Number(row.capital_efficiency_score || 0)
}

function adaptiveScore(row: InvestRow) {
  return Number(row.adaptive_nexial_score ?? baseScore(row))
}

function scoreDelta(row: InvestRow) {
  if (row.adaptive_nexial_score == null || row.score == null) return null
  return Number(row.adaptive_nexial_score) - Number(row.score)
}

function orderRank(row: InvestRow) {
  return (
    adaptiveScore(row) * 2 +
    Number(row.expected_return_pct || 0) +
    Number(row.amount_suggested || 0) / 1000 +
    Number(row.auto_execution_probability || 0) +
    (String(row.adaptive_decision || '').toUpperCase() === 'BUY_READY' ? 30 : 0) +
    (isAutoOrderReady(row) ? 40 : 0)
  )
}

function distanceToZone(row: InvestRow) {
  const price = Number(row.latest_close_price)
  const high = Number(row.buy_zone_high)

  if (!price || !high) return null
  return ((price - high) / high) * 100
}

function orderLimitPrice(row: InvestRow) {
  if (row.auto_limit_price != null && Number(row.auto_limit_price) > 0) return Number(row.auto_limit_price)
  if (row.buy_zone_high != null) return Number(row.buy_zone_high)
  return row.latest_close_price
}

function executionQuantity(row: InvestRow) {
  if (row.auto_quantity != null && Number(row.auto_quantity) > 0) return Number(row.auto_quantity)
  return Number(row.suggested_quantity || 0)
}

function executionAmount(row: InvestRow) {
  if (row.auto_amount_estimated != null && Number(row.auto_amount_estimated) > 0) return Number(row.auto_amount_estimated)
  return Number(row.amount_suggested || 0)
}

function executionAccount(row: InvestRow) {
  const subtitle = String(row.display_subtitle || '').toUpperCase()
  const currency = String(row.currency || '').toUpperCase()

  if (subtitle.includes('PEA')) return 'PEA'
  if (subtitle.includes('IBKR')) return 'CTO IBKR'
  if (currency === 'USD') return 'CTO IBKR'
  return 'Compte à confirmer'
}

function orderType(row: InvestRow) {
  const currency = String(row.currency || '').toUpperCase()
  if (currency === 'USD') return 'Limit GTC'
  return 'Limit jour'
}

function learningClass(signal?: string | null) {
  const s = String(signal || '').toUpperCase()

  if (s.includes('POSITIVE')) return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
  if (s.includes('NEGATIVE')) return 'border-red-300/30 bg-red-400/10 text-red-200'
  if (s.includes('LOW')) return 'border-amber-300/30 bg-amber-400/10 text-amber-200'
  if (s.includes('NO')) return 'border-white/10 bg-white/5 text-slate-300'

  return 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
}

function adaptiveDecisionClass(decision?: string | null) {
  const d = String(decision || '').toUpperCase()

  if (d === 'BUY_READY') return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
  if (d === 'WATCH') return 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
  if (d === 'BLOCKED_DATA') return 'border-red-300/30 bg-red-400/10 text-red-200'

  return 'border-amber-300/30 bg-amber-400/10 text-amber-200'
}

function adaptiveDecisionLabel(decision?: string | null) {
  const d = String(decision || '').toUpperCase()

  if (d === 'BUY_READY') return 'BUY READY'
  if (d === 'WATCH') return 'WATCH'
  if (d === 'BLOCKED_DATA') return 'DATA BLOCK'
  return 'WAIT'
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

  const [rows, setRows] = useState<InvestRow[]>([])
  const [adaptiveRows, setAdaptiveRows] = useState<AdaptiveRow[]>([])
  const [autoRows, setAutoRows] = useState<AutoExecutionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [creatingAll, setCreatingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<InvestRow | null>(null)
  const [creatingTicker, setCreatingTicker] = useState<string | null>(null)
  const [orderCreation, setOrderCreation] = useState<OrderCreationState | null>(null)

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError(null)

    const [investResult, adaptiveResult, autoResult] = await Promise.all([
      supabase.from(INVEST_VIEW).select('*'),
      supabase.from(ADAPTIVE_VIEW).select('*'),
      supabase.from(AUTO_EXECUTION_VIEW).select('*'),
    ])

    if (investResult.error) {
      setError(investResult.error.message)
      setRows([])
    } else {
      const baseRows = (investResult.data || []) as InvestRow[]
      const adaptive = (adaptiveResult.data || []) as AdaptiveRow[]
      const auto = (autoResult.data || []) as AutoExecutionRow[]

      setAdaptiveRows(adaptive)
      setAutoRows(auto)

      const adaptiveMap = new Map<string, AdaptiveRow>()
      adaptive.forEach((row) => {
        adaptiveMap.set(normalizeTicker(row.ticker), row)
      })

      const autoMap = new Map<string, AutoExecutionRow>()
      auto.forEach((row) => {
        autoMap.set(normalizeTicker(row.ticker), row)
      })

      const mergedRows = baseRows.map((row) => {
        const adaptiveRow = adaptiveMap.get(normalizeTicker(row.ticker))
        const autoRow = autoMap.get(normalizeTicker(row.ticker))

        return {
          ...row,
          adaptive_nexial_score: adaptiveRow?.adaptive_nexial_score ?? null,
          learning_signal: adaptiveRow?.learning_signal ?? null,
          adaptive_reason: adaptiveRow?.adaptive_reason ?? null,
          adaptive_decision: adaptiveRow?.adaptive_decision ?? null,
          adaptive_rank: adaptiveRow?.adaptive_rank ?? null,

          auto_is_order_ready: autoRow?.is_order_ready ?? null,
          auto_limit_price: autoRow ? extractAutoLimit(autoRow) : null,
          auto_quantity: autoRow ? extractAutoQuantity(autoRow) : null,
          auto_amount_estimated: autoRow ? extractAutoAmount(autoRow) : null,
          auto_execution_probability: autoRow?.execution_probability ?? null,
          auto_block_reason: autoRow ? extractAutoBlockReason(autoRow) : null,
          auto_source: 'AUTO_EXECUTION_SUGGESTION',
        }
      })

      setRows(mergedRows)
    }

    if (adaptiveResult.error && !investResult.error) {
      setError(adaptiveResult.error.message)
    }

    if (autoResult.error && !investResult.error && !adaptiveResult.error) {
      setError(autoResult.error.message)
    }

    setLoading(false)
    setRefreshing(false)
  }

  async function createOrder(row: InvestRow) {
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

  async function createAllOrders(items: InvestRow[]) {
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
  }, [])

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => orderRank(b) - orderRank(a))
  }, [rows])

  const actionableRows = useMemo(() => {
    return sortedRows.filter(isActionable).slice(0, 3)
  }, [sortedRows])

  const blockedRows = useMemo(() => {
    return sortedRows.filter((row) => !isActionable(row))
  }, [sortedRows])

  const executionHealth = useMemo<ExecutionHealth>(() => {
    return {
      totalRows: sortedRows.length,
      actionable: actionableRows.length,
      adaptiveBuyReady: adaptiveRows.filter((row) => row.adaptive_decision === 'BUY_READY').length,
      adaptiveWatch: adaptiveRows.filter((row) => row.adaptive_decision === 'WATCH').length,
      adaptiveBlocked: adaptiveRows.filter((row) => row.adaptive_decision === 'BLOCKED_DATA').length,
      blockedNoZone: blockedRows.filter((row) => !hasValidZone(row)).length,
      blockedNoPrice: blockedRows.filter((row) => !hasValidPrice(row)).length,
      blockedQuantity: blockedRows.filter((row) => !hasValidQuantity(row) || !isAutoOrderReady(row)).length,
      blockedData: blockedRows.filter((row) => !isPriceOk(row)).length,
      blockedAuto: blockedRows.filter((row) => !isAutoOrderReady(row)).length,
      staleRows: sortedRows.filter((row) => !isFresh(row.updated_at)).length,
      blockedDecision: blockedRows.filter((row) => !isDecisionReady(row)).length,
    }
  }, [sortedRows, actionableRows, blockedRows, adaptiveRows])

  const latestUpdate = useMemo(() => {
    const dates = sortedRows
      .map((row) => row.updated_at)
      .filter(Boolean)
      .map((value) => new Date(value as string))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())

    return dates[0]?.toISOString() || null
  }, [sortedRows])

  const totalAmount = useMemo(() => {
    return actionableRows.reduce((sum, row) => sum + Number(executionAmount(row) || 0), 0)
  }, [actionableRows])

  const avgAdaptiveScore = useMemo(() => {
    if (adaptiveRows.length === 0) return 0

    return Math.round(
      adaptiveRows.reduce((sum, row) => sum + Number(row.adaptive_nexial_score || 0), 0) /
        adaptiveRows.length
    )
  }, [adaptiveRows])

  const bestOrder = actionableRows[0] || null
  const hasAction = actionableRows.length > 0
  const dataAlerts =
    executionHealth.blockedData +
    executionHealth.blockedNoPrice +
    executionHealth.staleRows

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
          avgAdaptiveScore={avgAdaptiveScore}
          autoSuggestions={autoRows.length}
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
            onOpenDetails={() => setDetailsOpen(true)}
          />
        )}

        <ExecutionControlPanel health={executionHealth} onOpenDetails={() => setDetailsOpen(true)} />
      </div>

      {detailsOpen && (
        <SystemDetailsModal
          health={executionHealth}
          rows={blockedRows.slice(0, 10)}
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
              Lecture de <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-200">{INVEST_VIEW}</code> +{' '}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-200">{ADAPTIVE_VIEW}</code> +{' '}
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
  avgAdaptiveScore,
  autoSuggestions,
  onRefresh,
  onCreateAll,
  onOpenDetails,
}: {
  hasAction: boolean
  actionCount: number
  totalAmount: number
  bestOrder: InvestRow | null
  latestUpdate: string | null
  dataAlerts: number
  refreshing: boolean
  creatingAll: boolean
  avgAdaptiveScore: number
  autoSuggestions: number
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
            Décision Nexial
          </div>

          <h1
            className={`max-w-5xl text-5xl font-semibold tracking-[-0.055em] md:text-7xl ${
              hasAction ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {hasAction ? 'Acheter maintenant' : 'Attendre'}
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            {hasAction
              ? `${actionCount} ordre(s) prêt(s), validé(s) par le moteur d’exécution. Aucun ordre marché. Prix limite uniquement.`
              : 'Aucune opportunité ne respecte toutes les règles. Le meilleur ordre aujourd’hui est de ne rien faire.'}
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
              helper="top 3 maximum"
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
              <PriorityLine label="Nom" value={bestOrder.asset_name} />
              <PriorityLine label="Compte" value={executionAccount(bestOrder)} />
              <PriorityLine label="Prix limite" value={money(orderLimitPrice(bestOrder), bestOrder.currency || 'EUR')} />
              <PriorityLine label="Quantité" value={num(executionQuantity(bestOrder), 0)} />
              <PriorityLine label="Montant" value={money(executionAmount(bestOrder), bestOrder.currency || 'EUR')} />
              <PriorityLine label="Score" value={`${num(adaptiveScore(bestOrder), 0)}/100`} />
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm leading-6 text-slate-300">
              Nexial ne propose aucun ordre lorsque le prix, la zone, la quantité ou la décision ne sont pas alignés.
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <CompactMetric label="Score moyen" value={`${avgAdaptiveScore}/100`} />
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
  rows: InvestRow[]
  creatingTicker: string | null
  creatingAll: boolean
  onOpen: (row: InvestRow) => void
  onCreateOrder: (row: InvestRow) => void
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
            Le système affiche uniquement les actions réellement exécutables.
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
  item: InvestRow
  index: number
  creating: boolean
  onOpen: () => void
  onCreateOrder: () => void
}) {
  const delta = scoreDelta(item)

  return (
    <article className="rounded-[1.5rem] border border-emerald-300/20 bg-emerald-400/[0.08] p-5 shadow-[0_0_70px_rgba(16,185,129,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs text-emerald-100">#{index + 1}</span>
            <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-100">BUY</span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${adaptiveDecisionClass(item.adaptive_decision)}`}>
              {adaptiveDecisionLabel(item.adaptive_decision)}
            </span>
            <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">
              AUTO READY
            </span>
          </div>
          <h3 className="mt-3 truncate text-3xl font-semibold text-white">{item.ticker}</h3>
          <p className="mt-1 truncate text-sm text-slate-300">{item.asset_name}</p>
        </div>

        <ScoreBadge value={adaptiveScore(item)} label="Score" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${learningClass(item.learning_signal)}`}>
          {item.learning_signal || 'NO_LEARNING'}
        </span>

        {delta != null && (
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              delta >= 0
                ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
                : 'border-red-300/30 bg-red-400/10 text-red-200'
            }`}
          >
            Delta {delta >= 0 ? '+' : ''}
            {delta.toFixed(1)}
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <OrderMetric label="Montant" value={money(executionAmount(item), item.currency || 'EUR')} />
        <OrderMetric label="Quantité" value={num(executionQuantity(item), 0)} />
        <OrderMetric label="Limite" value={money(orderLimitPrice(item), item.currency || 'EUR')} />
        <OrderMetric label="Compte" value={executionAccount(item)} />
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
        <div className="grid gap-3 text-sm">
          <Line label="Prix actuel" value={money(item.latest_close_price, item.currency || 'EUR')} />
          <Line label="Zone validée" value={zoneLabel(item)} />
          <Line label="Type ordre" value={orderType(item)} />
          <Line label="Distance zone" value={pct(distanceToZone(item))} />
          <Line label="Probabilité" value={`${num(item.auto_execution_probability, 0)}/100`} />
        </div>
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
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
        >
          Audit
        </button>
      </div>
    </article>
  )
}

function NoActionState({
  blockedCount,
  dataAlerts,
  onOpenDetails,
}: {
  blockedCount: number
  dataAlerts: number
  onOpenDetails: () => void
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[#101827]/95 p-8 text-center shadow-[0_24px_90px_rgba(0,0,0,0.25)]">
      <div className="mx-auto max-w-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-300">
          <TimerReset size={26} />
        </div>

        <p className="mt-6 text-sm uppercase tracking-[0.28em] text-slate-500">Discipline active</p>
        <h2 className="mt-3 text-4xl font-semibold text-white">Aucun ordre à placer</h2>

        <p className="mt-4 text-base leading-7 text-slate-300">
          {blockedCount > 0
            ? `${blockedCount} idée(s) sont suivies mais bloquées par les règles Nexial.`
            : 'Aucune idée exploitable n’est disponible actuellement.'}
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-300">
          Nexial protège le capital : pas de breakout, pas de marché, pas d’ordre sans zone, pas d’achat si la donnée prix est douteuse.
        </div>

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

          <Link href="/watchlist" className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15">
            Voir Watchlist
          </Link>
        </div>
      </div>
    </section>
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
          <p className="mt-1 text-sm text-slate-400">Panneau secondaire. Les signaux bloqués ne deviennent jamais des ordres utilisateur.</p>
        </div>

        <button onClick={onOpenDetails} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10">
          Voir détails
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-10">
        <Metric label="Signaux" value={String(health.totalRows)} />
        <Metric label="Prêts" value={String(health.actionable)} positive={health.actionable > 0} />
        <Metric label="BUY" value={String(health.adaptiveBuyReady)} positive={health.adaptiveBuyReady > 0} />
        <Metric label="WATCH" value={String(health.adaptiveWatch)} />
        <Metric label="DATA" value={String(health.adaptiveBlocked)} warning={health.adaptiveBlocked > 0} />
        <Metric label="Auto" value={String(health.blockedAuto)} warning={health.blockedAuto > 0} />
        <Metric label="Zone" value={String(health.blockedNoZone)} warning={health.blockedNoZone > 0} />
        <Metric label="Prix" value={String(health.blockedNoPrice)} warning={health.blockedNoPrice > 0} />
        <Metric label="Qté" value={String(health.blockedQuantity)} warning={health.blockedQuantity > 0} />
        <Metric label="Fresh" value={String(health.blockedData + health.staleRows)} warning={health.blockedData + health.staleRows > 0} />
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
  rows: InvestRow[]
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

          <button onClick={onClose} className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-slate-200 transition hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Signaux lus" value={String(health.totalRows)} />
          <Metric label="Actionnables" value={String(health.actionable)} positive={health.actionable > 0} />
          <Metric label="Adaptive BUY" value={String(health.adaptiveBuyReady)} positive={health.adaptiveBuyReady > 0} />
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
                    <p className="text-sm text-slate-400">{row.asset_name}</p>
                  </div>

                  <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100">
                    {executionBlockReason(row)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-5">
                  <BlockedMetric label="Prix" value={money(row.latest_close_price, row.currency || 'EUR')} />
                  <BlockedMetric label="Zone" value={zoneLabel(row)} />
                  <BlockedMetric label="Quantité Invest" value={num(row.suggested_quantity)} />
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
  item: InvestRow
  creating: boolean
  onClose: () => void
  onCreateOrder: () => void
}) {
  const delta = scoreDelta(item)

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <button aria-label="Fermer" className="absolute inset-0 cursor-default" onClick={onClose} />

      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#07111f] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Ordre prêt à créer</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight">{item.ticker}</h2>
            <p className="mt-1 text-slate-400">{item.asset_name}</p>
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
            <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">Auto ready</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-200">{item.reason || 'Ordre validé par le moteur Nexial.'}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <DrawerMetric label="Compte" value={executionAccount(item)} />
          <DrawerMetric label="Type" value={orderType(item)} />
          <DrawerMetric label="Quantité" value={num(executionQuantity(item), 0)} />
          <DrawerMetric label="Prix limite" value={money(orderLimitPrice(item), item.currency || 'EUR')} />
          <DrawerMetric label="Montant" value={money(executionAmount(item), item.currency || 'EUR')} />
          <DrawerMetric label="Devise" value={item.currency || 'EUR'} />
          <DrawerMetric label="Prix actuel" value={money(item.latest_close_price, item.currency || 'EUR')} />
          <DrawerMetric label="Zone" value={zoneLabel(item)} />
          <DrawerMetric label="Score base" value={num(item.score, 0)} />
          <DrawerMetric label="Score adaptatif" value={num(item.adaptive_nexial_score, 0)} />
          <DrawerMetric label="Delta learning" value={delta == null ? '—' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`} />
          <DrawerMetric label="Learning" value={item.learning_signal || 'NO_LEARNING'} />
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm font-semibold text-white">Contrôles avant création ordre</p>
          <div className="mt-4 space-y-3">
            <CheckLine label="Prix fiable" ok={isPriceOk(item)} />
            <CheckLine label="Prix disponible" ok={hasValidPrice(item)} />
            <CheckLine label="Zone valide" ok={hasValidZone(item)} />
            <CheckLine label="Quantité entière exécutable" ok={executionQuantity(item) > 0} />
            <CheckLine label="Montant exploitable" ok={executionAmount(item) > 0} />
            <CheckLine label="Décision BUY validée" ok={isDecisionReady(item)} />
            <CheckLine label="Auto execution ready" ok={isAutoOrderReady(item)} />
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/10 p-5">
          <p className="text-sm font-semibold text-cyan-100">Lecture adaptive</p>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            {item.adaptive_reason || 'Historique insuffisant : moteur standard conservé.'}
          </p>
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

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-semibold text-white">{value}</span>
    </div>
  )
}

function Metric({ label, value, positive = false, warning = false }: { label: string; value: string; positive?: boolean; warning?: boolean }) {
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
  const score = Number(value || 0)
  const className =
    score >= 90
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : score >= 75
        ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
        : 'border-amber-300/30 bg-amber-400/10 text-amber-200'

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{label} {num(score, 0)}</span>
}