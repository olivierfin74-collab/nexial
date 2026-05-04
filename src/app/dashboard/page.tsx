'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const INVEST_VIEW = 'vw_invest_ui_v1'
const ORDERS_VIEW = 'vw_execution_orders_ui_v1'
const PATRIMOINE_VIEW = 'vw_patrimoine_total_general_eur_v1'

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

type OrderRow = {
  id: string
  ticker: string
  asset_name: string | null
  source: string | null
  status: string
  status_label: string | null
  account_scope: string | null
  broker: string | null
  order_side: string | null
  order_type: string | null
  limit_price: number | null
  quantity: number | null
  amount_estimated: number | null
  currency: string | null
  execution_probability: number | null
  created_at: string | null
  updated_at: string | null
}

type PatrimoineTotal = {
  total_positions_eur: number | null
  total_cash_eur: number | null
  total_general_eur: number | null
}

type DashboardHealth = {
  totalRows: number
  actionable: number
  blockedNoZone: number
  blockedNoPrice: number
  blockedQuantity: number
  blockedData: number
  staleRows: number
}

type OrdersHealth = {
  total: number
  active: number
  proposed: number
  placed: number
  touched: number
  toConfirm: number
  autoOrders: number
  activeCapital: number
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

function num(value?: number | null, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(Number(value))
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

function isDecisionReady(row: InvestRow) {
  const decision = String(row.decision || '').toUpperCase()
  return decision.includes('READY') || decision.includes('BUY') || decision.includes('ACHAT')
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

function isActionable(row: InvestRow) {
  return (
    isPriceOk(row) &&
    hasValidPrice(row) &&
    hasValidZone(row) &&
    hasValidQuantity(row) &&
    hasValidAmount(row) &&
    isDecisionReady(row)
  )
}

function scoreTotal(row: InvestRow) {
  return Number(row.score || 0) + Number(row.capital_efficiency_score || 0)
}

function blockReason(row: InvestRow) {
  if (!isPriceOk(row)) return 'Donnée prix non fiable'
  if (!hasValidPrice(row)) return 'Prix indisponible'
  if (!hasValidZone(row)) return 'Zone d’achat absente'
  if (!hasValidQuantity(row)) return 'Quantité non exécutable'
  if (!hasValidAmount(row)) return 'Montant non exploitable'
  if (!isDecisionReady(row)) return 'Décision non validée'
  return 'Aucun blocage'
}

function isActiveOrder(order: OrderRow) {
  return ['PROPOSED', 'PLACED', 'TOUCHED', 'EXECUTION_TO_CONFIRM'].includes(String(order.status || '').toUpperCase())
}

function orderSourceLabel(source?: string | null) {
  if (!source) return 'NEXIAL'
  if (source === 'AUTO_EXECUTION_SUGGESTION') return 'AUTO EXECUTION'
  if (source === 'DCA_FINAL_DECISION') return 'DCA DECISION'
  return source.replaceAll('_', ' ')
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), [])

  const [investRows, setInvestRows] = useState<InvestRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [patrimoine, setPatrimoine] = useState<PatrimoineTotal | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError(null)

    const [investRes, patrimoineRes, ordersRes] = await Promise.all([
      supabase.from(INVEST_VIEW).select('*'),
      supabase.from(PATRIMOINE_VIEW).select('*').single(),
      supabase.from(ORDERS_VIEW).select('*').order('created_at', { ascending: false }),
    ])

    if (investRes.error) {
      setError(investRes.error.message)
      setInvestRows([])
    } else {
      setInvestRows((investRes.data || []) as InvestRow[])
    }

    if (patrimoineRes.error && !investRes.error) {
      setError(patrimoineRes.error.message)
    }

    if (patrimoineRes.data) {
      setPatrimoine(patrimoineRes.data as PatrimoineTotal)
    }

    if (ordersRes.error && !investRes.error && !patrimoineRes.error) {
      setError(ordersRes.error.message)
      setOrders([])
    } else {
      setOrders((ordersRes.data || []) as OrderRow[])
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    load(false)
  }, [])

  const sortedRows = useMemo(() => {
    return [...investRows].sort((a, b) => scoreTotal(b) - scoreTotal(a))
  }, [investRows])

  const actionableRows = useMemo(() => {
    return sortedRows.filter(isActionable).slice(0, 3)
  }, [sortedRows])

  const blockedRows = useMemo(() => {
    return sortedRows.filter((row) => !isActionable(row))
  }, [sortedRows])

  const amountNow = useMemo(() => {
    return actionableRows.reduce((sum, row) => sum + Number(row.amount_suggested || 0), 0)
  }, [actionableRows])

  const health = useMemo<DashboardHealth>(() => {
    return {
      totalRows: sortedRows.length,
      actionable: actionableRows.length,
      blockedNoZone: blockedRows.filter((row) => !hasValidZone(row)).length,
      blockedNoPrice: blockedRows.filter((row) => !hasValidPrice(row)).length,
      blockedQuantity: blockedRows.filter((row) => !hasValidQuantity(row)).length,
      blockedData: blockedRows.filter((row) => !isPriceOk(row)).length,
      staleRows: sortedRows.filter((row) => !isFresh(row.updated_at)).length,
    }
  }, [sortedRows, actionableRows, blockedRows])

  const ordersHealth = useMemo<OrdersHealth>(() => {
    const active = orders.filter(isActiveOrder)

    return {
      total: orders.length,
      active: active.length,
      proposed: orders.filter((o) => o.status === 'PROPOSED').length,
      placed: orders.filter((o) => o.status === 'PLACED').length,
      touched: orders.filter((o) => o.status === 'TOUCHED').length,
      toConfirm: orders.filter((o) => ['TOUCHED', 'EXECUTION_TO_CONFIRM'].includes(o.status)).length,
      autoOrders: orders.filter((o) => o.source === 'AUTO_EXECUTION_SUGGESTION').length,
      activeCapital: active.reduce((sum, o) => sum + Number(o.amount_estimated || 0), 0),
    }
  }, [orders])

  const latestUpdate = useMemo(() => {
    const dates = sortedRows
      .map((row) => row.updated_at)
      .filter(Boolean)
      .map((value) => new Date(value as string))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())

    return dates[0]?.toISOString() || null
  }, [sortedRows])

  const topOrder = useMemo(() => {
    return orders
      .filter(isActiveOrder)
      .sort((a, b) => {
        const probaDiff = Number(b.execution_probability || 0) - Number(a.execution_probability || 0)
        if (probaDiff !== 0) return probaDiff
        return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      })[0] || null
  }, [orders])

  const hasAction = actionableRows.length > 0
  const hasActiveOrders = ordersHealth.active > 0
  const dataAlerts = health.blockedData + health.blockedNoPrice + health.staleRows

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col">
      <section className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#07111f]/90 shadow-[0_35px_140px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_45%)]" />

        <div className="relative px-6 py-7 sm:px-8 lg:px-10">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.42em] text-cyan-300">
                Nexial Dashboard
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                Pilotage capital
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Source officielle : {INVEST_VIEW}. Décision, cash, qualité data,
                ordres actifs et workflow d’exécution.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <HeaderTile
                label="Décision"
                value={hasAction ? 'Investir' : hasActiveOrders ? 'Suivre' : 'Attendre'}
                tone={hasAction || hasActiveOrders ? 'positive' : 'warning'}
              />

              <Link
                href="/actions"
                className="rounded-[1.25rem] border border-cyan-300/20 bg-cyan-300/10 px-6 py-4 text-right transition hover:border-cyan-300/35 hover:bg-cyan-300/15"
              >
                <p className="text-xs text-cyan-100/70">Actions</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  Créer ordres
                </p>
              </Link>

              <Link
                href="/orders"
                className="rounded-[1.25rem] border border-emerald-300/20 bg-emerald-400/10 px-6 py-4 text-right transition hover:border-emerald-300/35 hover:bg-emerald-400/15"
              >
                <p className="text-xs text-emerald-100/70">Orders</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  Suivre ordres
                </p>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2 lg:grid-cols-6">
            <Metric label="Patrimoine total" value={eur(patrimoine?.total_general_eur)} />
            <Metric label="Positions" value={eur(patrimoine?.total_positions_eur)} />
            <Metric label="Cash disponible" value={eur(patrimoine?.total_cash_eur)} />
            <Metric label="À investir maintenant" value={eur(amountNow)} />
            <Metric
              label="Ordres actifs"
              value={String(ordersHealth.active)}
              positive={ordersHealth.active > 0}
            />
            <Metric
              label="Qualité data"
              value={dataAlerts === 0 ? 'OK' : `${dataAlerts} alertes`}
              warning={dataAlerts > 0}
            />
          </div>
        </div>
      </section>

      {error && <ErrorBanner message={error} />}

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Hero
          hasAction={hasAction}
          hasActiveOrders={hasActiveOrders}
          actionCount={actionableRows.length}
          amountNow={amountNow}
          cash={patrimoine?.total_cash_eur}
          latestUpdate={latestUpdate}
          dataAlerts={dataAlerts}
          refreshing={refreshing}
          bestIdea={sortedRows[0] || null}
          topOrder={topOrder}
          onRefresh={() => load(true)}
          onOpenDetails={() => setDetailsOpen(true)}
        />

        <SystemControlPanel
          health={health}
          ordersHealth={ordersHealth}
          latestUpdate={latestUpdate}
          dataAlerts={dataAlerts}
          onOpenDetails={() => setDetailsOpen(true)}
        />
      </section>

      {hasActiveOrders && <OrdersPreview topOrder={topOrder} ordersHealth={ordersHealth} />}

      {hasAction ? <ActionPreview rows={actionableRows} /> : <NoActionState hasActiveOrders={hasActiveOrders} />}

      {detailsOpen && (
        <SystemDetailsModal
          health={health}
          ordersHealth={ordersHealth}
          rows={blockedRows.slice(0, 8)}
          onClose={() => setDetailsOpen(false)}
        />
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#07111f]/90 p-8 text-white shadow-[0_35px_140px_rgba(0,0,0,0.42)]">
      <p className="text-sm uppercase tracking-[0.32em] text-cyan-300">
        Nexial Dashboard
      </p>
      <h1 className="mt-4 text-4xl font-semibold">Chargement du dashboard...</h1>
      <p className="mt-3 text-sm text-slate-400">
        Lecture de la décision globale, du capital disponible et des ordres actifs.
      </p>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <section className="mt-5 rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-200">
      Erreur dashboard : {message}
    </section>
  )
}

function HeaderTile({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'positive' | 'warning'
}) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.055] px-6 py-4 text-right">
      <p className="text-xs text-slate-400">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          tone === 'positive' ? 'text-emerald-300' : 'text-amber-300'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function Hero({
  hasAction,
  hasActiveOrders,
  actionCount,
  amountNow,
  cash,
  latestUpdate,
  dataAlerts,
  refreshing,
  bestIdea,
  topOrder,
  onRefresh,
  onOpenDetails,
}: {
  hasAction: boolean
  hasActiveOrders: boolean
  actionCount: number
  amountNow: number
  cash?: number | null
  latestUpdate: string | null
  dataAlerts: number
  refreshing: boolean
  bestIdea: InvestRow | null
  topOrder: OrderRow | null
  onRefresh: () => void
  onOpenDetails: () => void
}) {
  const title = hasAction ? 'Investir' : hasActiveOrders ? 'Suivre' : 'Attendre'

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#07111f]/86 p-7 shadow-[0_30px_120px_rgba(0,0,0,0.28)]">
      <p className="text-sm font-semibold text-cyan-200">Décision</p>

      <h2
        className={`mt-3 text-5xl font-semibold tracking-[-0.04em] sm:text-6xl ${
          hasAction || hasActiveOrders ? 'text-emerald-300' : 'text-amber-300'
        }`}
      >
        {title}
      </h2>

      <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
        {hasAction
          ? `${actionCount} opportunité(s) exploitable(s). Montant à engager maintenant : ${eur(amountNow)}.`
          : hasActiveOrders
            ? `Aucun nouvel ordre à créer. Priorité : suivre les ordres actifs, notamment ${topOrder?.ticker || 'ordre actif'}.`
            : `Aucune idée n’est en zone d’achat. Meilleure idée à surveiller : ${
                bestIdea?.ticker || 'aucune'
              }. Discipline prioritaire : attendre un meilleur point d’entrée.`}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <StatusPill label={`Cash ${eur(cash)}`} />
        <button onClick={onOpenDetails}>
          <StatusPill
            label={
              dataAlerts === 0
                ? `Données à jour · ${formatDate(latestUpdate)}`
                : `Données à jour · ${formatDate(latestUpdate)} · ${dataAlerts} alerte(s)`
            }
            warning={dataAlerts > 0}
          />
        </button>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        {hasAction && (
          <Link
            href="/actions"
            className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-7 py-3 text-sm font-semibold text-emerald-100 shadow-[0_0_40px_rgba(52,211,153,0.16)] transition hover:bg-emerald-400/20"
          >
            Créer les ordres
          </Link>
        )}

        {hasActiveOrders && (
          <Link
            href="/orders"
            className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-7 py-3 text-sm font-semibold text-cyan-100 shadow-[0_0_40px_rgba(34,211,238,0.12)] transition hover:bg-cyan-300/20"
          >
            Suivre les ordres
          </Link>
        )}

        {!hasAction && !hasActiveOrders && (
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-slate-400">
            Surveillance active — aucune action requise
          </div>
        )}

        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
        >
          {refreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>
    </section>
  )
}

function SystemControlPanel({
  health,
  ordersHealth,
  latestUpdate,
  dataAlerts,
  onOpenDetails,
}: {
  health: DashboardHealth
  ordersHealth: OrdersHealth
  latestUpdate: string | null
  dataAlerts: number
  onOpenDetails: () => void
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#07111f]/86 p-7 shadow-[0_30px_120px_rgba(0,0,0,0.28)]">
      <p className="text-sm font-semibold text-cyan-200">Contrôle système</p>
      <h2 className="mt-3 text-3xl font-semibold text-white">
        Données & exécution
      </h2>

      <div className="mt-6 space-y-3">
        <ControlRow label="Source invest" value={INVEST_VIEW} positive />
        <ControlRow label="Source orders" value={ORDERS_VIEW} positive />
        <ControlRow
          label="Ordres actifs"
          value={String(ordersHealth.active)}
          positive={ordersHealth.active > 0}
        />
        <ControlRow
          label="Auto orders"
          value={String(ordersHealth.autoOrders)}
          positive={ordersHealth.autoOrders > 0}
        />
        <ControlRow
          label="À confirmer"
          value={String(ordersHealth.toConfirm)}
          warning={ordersHealth.toConfirm > 0}
        />
        <ControlRow
          label="Prix non OK"
          value={String(health.blockedData)}
          warning={health.blockedData > 0}
        />
        <ControlRow
          label="Données anciennes"
          value={String(health.staleRows)}
          warning={health.staleRows > 0}
        />
        <ControlRow
          label="Dernière MAJ"
          value={formatDate(latestUpdate)}
          warning={dataAlerts > 0}
        />
      </div>

      <button
        onClick={onOpenDetails}
        className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
      >
        Ouvrir audit détaillé
      </button>
    </section>
  )
}

function OrdersPreview({
  topOrder,
  ordersHealth,
}: {
  topOrder: OrderRow | null
  ordersHealth: OrdersHealth
}) {
  return (
    <section className="mt-5 rounded-[2rem] border border-emerald-300/20 bg-emerald-400/[0.07] p-7 shadow-[0_30px_120px_rgba(16,185,129,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-emerald-300">
            Execution pipeline
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white">
            Ordres actifs à suivre
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            {topOrder
              ? `Action prioritaire : ${topOrder.ticker} · ${orderSourceLabel(topOrder.source)} · ${topOrder.status_label || topOrder.status}.`
              : 'Aucun ordre prioritaire détecté.'}
          </p>
        </div>

        <Link
          href="/orders"
          className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-400/10 px-6 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
        >
          Ouvrir Orders
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Capital actif" value={eur(ordersHealth.activeCapital)} />
        <Metric label="Actifs" value={String(ordersHealth.active)} positive={ordersHealth.active > 0} />
        <Metric label="Proposés" value={String(ordersHealth.proposed)} />
        <Metric label="Placés" value={String(ordersHealth.placed)} />
        <Metric label="À confirmer" value={String(ordersHealth.toConfirm)} warning={ordersHealth.toConfirm > 0} />
      </div>
    </section>
  )
}

function ControlRow({
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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
      <span className="text-slate-300">{label}</span>
      <span
        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
          positive
            ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
            : warning
              ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
              : 'border-white/10 bg-white/[0.05] text-slate-300'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function ActionPreview({ rows }: { rows: InvestRow[] }) {
  return (
    <section className="mt-5 pb-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">
            À faire maintenant
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-white">
            Opportunités exploitables
          </h2>
        </div>

        <Link
          href="/actions"
          className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-5 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
        >
          Ouvrir Actions
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {rows.map((item) => (
          <article
            key={`${item.id}-${item.ticker}`}
            className="rounded-[1.75rem] border border-emerald-300/20 bg-emerald-400/[0.08] p-6 shadow-[0_0_60px_rgba(52,211,153,0.08)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-emerald-200">Action</p>
                <h3 className="mt-1 text-3xl font-semibold text-white">
                  {item.ticker}
                </h3>
                <p className="mt-1 text-sm text-slate-300">{item.asset_name}</p>
              </div>

              <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                Achat validé
              </span>
            </div>

            <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm leading-6 text-slate-200">
              {item.reason || 'Opportunité validée par le moteur Nexial.'}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <DecisionMetric label="Montant" value={eur(item.amount_suggested)} />
              <DecisionMetric label="Quantité" value={num(item.suggested_quantity, 4)} />
              <DecisionMetric label="Zone basse" value={money(item.buy_zone_low, item.currency || 'EUR')} />
              <DecisionMetric label="Zone haute" value={money(item.buy_zone_high, item.currency || 'EUR')} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function NoActionState({ hasActiveOrders }: { hasActiveOrders: boolean }) {
  return (
    <section className="mt-5 pb-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-[#07111f]/86 p-8 text-center shadow-[0_30px_120px_rgba(0,0,0,0.25)]">
        <p className="text-sm uppercase tracking-[0.28em] text-slate-500">
          Discipline active
        </p>

        <h2 className="mt-4 text-3xl font-semibold text-white">
          {hasActiveOrders ? 'Ordres à suivre' : 'Aucun ordre à préparer'}
        </h2>

        <p className="mt-4 text-base leading-7 text-slate-300">
          {hasActiveOrders
            ? 'Aucun nouvel achat à créer. La priorité est le suivi des ordres déjà proposés ou placés.'
            : 'Le dashboard ne montre volontairement aucune idée hors zone. Les signaux de surveillance sont traités dans la Watchlist.'}
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {hasActiveOrders && (
            <Link
              href="/orders"
              className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-400/10 px-6 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
            >
              Ouvrir Orders
            </Link>
          )}

          <Link
            href="/watchlist"
            className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Voir la Watchlist
          </Link>
        </div>
      </div>
    </section>
  )
}

function SystemDetailsModal({
  health,
  ordersHealth,
  rows,
  onClose,
}: {
  health: DashboardHealth
  ordersHealth: OrdersHealth
  rows: InvestRow[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#07111f] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-cyan-300">
              Données système
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Fiabilité & discipline
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Résumé technique masqué sur l’interface utilisateur. Les idées
              bloquées ne sont pas présentées comme opportunités.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            Fermer
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Signaux lus" value={String(health.totalRows)} />
          <Metric label="Actionnables" value={String(health.actionable)} positive={health.actionable > 0} />
          <Metric label="Ordres actifs" value={String(ordersHealth.active)} positive={ordersHealth.active > 0} />
          <Metric label="Capital engagé" value={eur(ordersHealth.activeCapital)} />
          <Metric label="Sans zone" value={String(health.blockedNoZone)} warning={health.blockedNoZone > 0} />
          <Metric label="Data prix" value={String(health.blockedData)} warning={health.blockedData > 0} />
          <Metric label="Prix indisponibles" value={String(health.blockedNoPrice)} warning={health.blockedNoPrice > 0} />
          <Metric label="Quantité invalide" value={String(health.blockedQuantity)} warning={health.blockedQuantity > 0} />
          <Metric label="Données anciennes" value={String(health.staleRows)} warning={health.staleRows > 0} />
          <Metric label="Auto orders" value={String(ordersHealth.autoOrders)} positive={ordersHealth.autoOrders > 0} />
          <Metric label="À confirmer" value={String(ordersHealth.toConfirm)} warning={ordersHealth.toConfirm > 0} />
          <Metric label="Ordres total" value={String(ordersHealth.total)} />
        </div>

        <div className="mt-6 space-y-3">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              Aucun blocage à afficher.
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={`${row.id}-${row.ticker}-dashboard-blocked`}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{row.ticker}</p>
                    <p className="text-sm text-slate-400">{row.asset_name}</p>
                  </div>

                  <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100">
                    {blockReason(row)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                  <BlockedMetric label="Prix" value={money(row.latest_close_price, row.currency || 'EUR')} />
                  <BlockedMetric label="Zone basse" value={money(row.buy_zone_low, row.currency || 'EUR')} />
                  <BlockedMetric label="Zone haute" value={money(row.buy_zone_high, row.currency || 'EUR')} />
                  <BlockedMetric label="MAJ" value={formatDate(row.updated_at)} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StatusPill({
  label,
  warning = false,
}: {
  label: string
  warning?: boolean
}) {
  return (
    <span
      className={`rounded-full border px-4 py-2 ${
        warning
          ? 'border-amber-300/30 bg-amber-400/10 text-amber-100'
          : 'border-white/10 bg-white/[0.04] text-slate-300'
      }`}
    >
      {label}
    </span>
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
      <p
        className={`mt-2 text-2xl font-semibold ${
          positive ? 'text-emerald-300' : warning ? 'text-amber-300' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function DecisionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function BlockedMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-slate-200">{value}</p>
    </div>
  )
}