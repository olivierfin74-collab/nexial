'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeEuro,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Command,
  Database,
  Eye,
  Filter,
  Gauge,
  Grid3X3,
  LineChart,
  List,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'

const PORTFOLIO_VIEW = 'vw_portfolio_positions_ui_v2'
const EXECUTION_PORTFOLIO_VIEW = 'vw_portfolio_positions_execution_v1'

const PORTFOLIO_SELECT = `
  position_id,
  account_id,
  account_name,
  account_type,
  broker_code,
  ticker,
  asset_name,
  asset_type,
  asset_bucket,
  sector,
  country,
  pea_eligible,
  quantity,
  pru,
  currency,
  broker_price,
  live_price,
  price_source,
  value_native,
  value_eur,
  pnl_native,
  pnl_eur,
  pnl_pct,
  portfolio_weight_pct,
  account_weight_pct,
  data_quality,
  updated_at
`

const EXECUTION_PORTFOLIO_SELECT = `
  id,
  ticker,
  asset_name,
  account_scope,
  broker,
  quantity,
  avg_price,
  currency,
  latest_price,
  latest_price_timestamp,
  price_is_reliable,
  price_status,
  invested_amount,
  current_value,
  pnl_amount,
  pnl_pct,
  last_execution_source,
  last_limit_price,
  last_confirmed_at,
  updated_at
`

type Position = {
  position_id: string
  account_id: string
  account_name: string | null
  account_type: string | null
  broker_code: string | null
  ticker: string
  asset_name: string | null
  asset_type: string | null
  asset_bucket: string | null
  sector: string | null
  country: string | null
  pea_eligible: boolean | null
  quantity: number | null
  pru: number | null
  currency: string | null
  broker_price: number | null
  live_price: number | null
  price_source: string | null
  value_native: number | null
  value_eur: number | null
  pnl_native: number | null
  pnl_eur: number | null
  pnl_pct: number | null
  portfolio_weight_pct: number | null
  account_weight_pct: number | null
  data_quality: string | null
  updated_at: string | null

  execution_source?: string | null
  execution_last_limit_price?: number | null
  execution_last_confirmed_at?: string | null
  execution_position?: boolean
}

type ExecutionPosition = {
  id: string
  ticker: string
  asset_name: string | null
  account_scope: string | null
  broker: string | null
  quantity: number | null
  avg_price: number | null
  currency: string | null
  latest_price: number | null
  latest_price_timestamp: string | null
  price_is_reliable: boolean | null
  price_status: string | null
  invested_amount: number | null
  current_value: number | null
  pnl_amount: number | null
  pnl_pct: number | null
  last_execution_source: string | null
  last_limit_price: number | null
  last_confirmed_at: string | null
  updated_at: string | null
}

type QuickFilter =
  | 'ALL'
  | 'PEA'
  | 'CTO'
  | 'IBKR'
  | 'BOURSORAMA'
  | 'TRADE_REPUBLIC'
  | 'DATA_ALERTS'
  | 'REINFORCE'
  | 'REDUCE'

type SortKey =
  | 'account_name'
  | 'account_type'
  | 'broker_code'
  | 'ticker'
  | 'asset_name'
  | 'asset_bucket'
  | 'sector'
  | 'country'
  | 'value_eur'
  | 'pnl_eur'
  | 'pnl_pct'
  | 'portfolio_weight_pct'
  | 'account_weight_pct'
  | 'data_quality'
  | 'updated_at'

type SortDirection = 'asc' | 'desc'
type NexialTone = 'hold' | 'watch' | 'buy' | 'reduce'
type ViewMode = 'LIST' | 'CARDS'

type NexialAction = {
  label: 'HOLD' | 'SURVEILLER' | 'RENFORCER' | 'ALLÉGER'
  tone: NexialTone
  reason: string
  priority: number
}

type AccountGroup = {
  key: string
  positions: Position[]
  value: number
  pnl: number
  pnlPct: number | null
  type: string
  broker: string
  accountName: string
  sort: number
}

const euroFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const compactEuroFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
})

function eur(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return euroFormatter.format(Number(value))
}

function compactEur(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return compactEuroFormatter.format(Number(value))
}

function money(value?: number | null, currency = 'EUR') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function num(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 4,
  }).format(Number(value))
}

function pct(value?: number | null, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(decimals)} %`
}

function rawPct(value?: number | null, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return `${Number(value).toFixed(decimals)} %`
}
function formatDate(value?: string | null) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function uniqueOptions(values: Array<string | null | undefined>) {
  return ['Tous', ...Array.from(new Set(values.filter(Boolean) as string[])).sort()]
}

function compareValues(a: unknown, b: unknown, direction: SortDirection) {
  const multiplier = direction === 'asc' ? 1 : -1

  if (typeof a === 'number' || typeof b === 'number') {
    return ((Number(a) || 0) - (Number(b) || 0)) * multiplier
  }

  return String(a || '').localeCompare(String(b || ''), 'fr') * multiplier
}

function isDataOk(status?: string | null) {
  const value = String(status || '').toUpperCase()

  return (
    value === 'OK' ||
    value.includes('STALE') ||
    value.includes('FALLBACK')
  )
}

function normalizeAccountType(value?: string | null) {
  const normalized = String(value || '').toUpperCase()
  if (normalized.includes('PEA')) return 'PEA'
  if (normalized.includes('CTO')) return 'CTO'
  return value || 'AUTRE'
}

function normalizeTicker(value?: string | null) {
  return String(value || '').trim().toUpperCase()
}

function isBroker(row: Position, broker: string) {
  const value = `${row.broker_code || ''} ${row.account_name || ''}`.toUpperCase()
  return value.includes(broker)
}

function getFreshness(updatedAt?: string | null) {
  if (!updatedAt) return { label: 'Inconnue', danger: true, hours: null as number | null }

  const updated = new Date(updatedAt)
  if (Number.isNaN(updated.getTime())) return { label: 'Inconnue', danger: true, hours: null as number | null }

  const diffHours = (Date.now() - updated.getTime()) / 36e5

  if (diffHours < 24) return { label: '< 24h', danger: false, hours: diffHours }
  if (diffHours < 72) return { label: '1-3 jours', danger: false, hours: diffHours }

  return { label: '> 3 jours', danger: true, hours: diffHours }
}

function getNexialAction(row: Position): NexialAction {
  const pnlPct = Number(row.pnl_pct || 0)
  const weight = Number(row.portfolio_weight_pct || 0)
  const qualityOk = isDataOk(row.data_quality)
  const freshness = getFreshness(row.updated_at)

  if (!qualityOk || freshness.danger) {
    return {
      label: 'SURVEILLER',
      tone: 'watch',
      reason: !qualityOk ? 'Donnée prix à contrôler' : 'Donnée ancienne',
      priority: 2,
    }
  }

  if (weight >= 10 && pnlPct > 15) {
    return {
      label: 'ALLÉGER',
      tone: 'reduce',
      reason: 'Ligne gagnante surpondérée',
      priority: 3,
    }
  }

  if (pnlPct <= -15 && weight < 8) {
    return {
      label: 'RENFORCER',
      tone: 'buy',
      reason: 'Repli significatif, poids encore maîtrisé',
      priority: 4,
    }
  }

  if (pnlPct < -5) {
    return {
      label: 'SURVEILLER',
      tone: 'watch',
      reason: 'Sous-performance à contrôler',
      priority: 2,
    }
  }

  return {
    label: 'HOLD',
    tone: 'hold',
    reason: 'Position conservée',
    priority: 1,
  }
}

function getDisplayedPrice(row: Position) {
  return row.live_price ?? row.broker_price ?? null
}

function getAccountKey(row: Position) {
  return `${normalizeAccountType(row.account_type)} · ${row.broker_code || 'Broker'} · ${row.account_name || 'Compte'}`
}

function accountSortWeight(type?: string | null) {
  const normalized = normalizeAccountType(type)
  if (normalized === 'PEA') return 1
  if (normalized === 'CTO') return 2
  return 3
}

function portfolioIdentity(row: Pick<Position, 'account_type' | 'broker_code' | 'ticker'>) {
  return `${normalizeAccountType(row.account_type)}::${normalizeTicker(row.ticker)}`
}

function executionIdentity(row: ExecutionPosition) {
  return `${normalizeAccountType(row.account_scope)}::${normalizeTicker(row.ticker)}`
}

function inferAssetBucket(row: ExecutionPosition) {
  const name = `${row.asset_name || ''} ${row.ticker || ''}`.toUpperCase()

  if (
    name.includes('ETF') ||
    name.includes('NASDAQ') ||
    name.includes('MSCI') ||
    name.includes('AMUNDI')
  ) {
    return 'ETF'
  }

  return 'ACTION'
}

function executionToPosition(row: ExecutionPosition): Position {
  const accountType = normalizeAccountType(row.account_scope)
  const bucket = inferAssetBucket(row)
  const priceQuality = row.price_is_reliable ? 'OK' : row.price_status || 'STALE'
  const value =
    row.current_value ??
    (row.quantity != null && row.latest_price != null ? row.quantity * row.latest_price : null)
  const pnl =
    row.pnl_amount ??
    (value != null && row.quantity != null && row.avg_price != null
      ? value - row.quantity * row.avg_price
      : null)

  return {
    position_id: row.id,
    account_id: `EXECUTION-${accountType}-${normalizeTicker(row.ticker)}`,
    account_name: accountType === 'PEA' ? 'PEA Execution' : `${accountType} Execution`,
    account_type: accountType,
    broker_code: row.broker || (accountType === 'PEA' ? 'BOURSORAMA' : 'EXECUTION'),
    ticker: row.ticker,
    asset_name: row.asset_name,
    asset_type: bucket,
    asset_bucket: bucket,
    sector: null,
    country: null,
    pea_eligible: accountType === 'PEA',
    quantity: row.quantity,
    pru: row.avg_price,
    currency: row.currency,
    broker_price: row.latest_price,
    live_price: row.latest_price,
    price_source: row.last_execution_source || EXECUTION_PORTFOLIO_VIEW,
    value_native: value,
    value_eur: value,
    pnl_native: pnl,
    pnl_eur: pnl,
    pnl_pct: row.pnl_pct,
    portfolio_weight_pct: null,
    account_weight_pct: null,
    data_quality: priceQuality,
    updated_at: row.updated_at,
    execution_source: row.last_execution_source,
    execution_last_limit_price: row.last_limit_price,
    execution_last_confirmed_at: row.last_confirmed_at,
    execution_position: true,
  }
}

function recalculateWeights(rows: Position[]) {
  const totalValue = rows.reduce((sum, row) => sum + Number(row.value_eur || 0), 0)

  const accountTotals = new Map<string, number>()
  rows.forEach((row) => {
    const key = getAccountKey(row)
    accountTotals.set(key, (accountTotals.get(key) || 0) + Number(row.value_eur || 0))
  })

  return rows.map((row) => {
    const value = Number(row.value_eur || 0)
    const accountValue = accountTotals.get(getAccountKey(row)) || 0

    return {
      ...row,
      portfolio_weight_pct: totalValue > 0 ? (value / totalValue) * 100 : row.portfolio_weight_pct,
      account_weight_pct: accountValue > 0 ? (value / accountValue) * 100 : row.account_weight_pct,
    }
  })
}

function mergePortfolioRows(baseRows: Position[], executionRows: ExecutionPosition[]) {
  const map = new Map<string, Position>()

  baseRows.forEach((row) => {
    map.set(portfolioIdentity(row), {
      ...row,
      execution_position: false,
    })
  })

  executionRows.forEach((executionRow) => {
    const key = executionIdentity(executionRow)
    const existing = map.get(key)

    if (!existing) {
      map.set(key, executionToPosition(executionRow))
      return
    }

    map.set(key, {
  ...existing,

  // 🔥 PRIORITÉ EXECUTION (CRITIQUE)
  pru: executionRow.avg_price ?? existing.pru,
  quantity: executionRow.quantity ?? existing.quantity,
  value_eur:
    executionRow.current_value ??
    (executionRow.quantity && executionRow.latest_price
      ? executionRow.quantity * executionRow.latest_price
      : existing.value_eur),

  pnl_eur:
    executionRow.pnl_amount ??
    (executionRow.quantity && executionRow.avg_price && executionRow.latest_price
      ? executionRow.quantity * (executionRow.latest_price - executionRow.avg_price)
      : existing.pnl_eur),

  pnl_pct: executionRow.pnl_pct ?? existing.pnl_pct,

  execution_source: executionRow.last_execution_source,
  execution_last_limit_price: executionRow.last_limit_price,
  execution_last_confirmed_at: executionRow.last_confirmed_at,
})
  })

  return recalculateWeights(Array.from(map.values()))
}

export default function PortfolioPage() {
  const supabase = useMemo(() => createClient(), [])

  const [rows, setRows] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('ALL')
  const [selectedType, setSelectedType] = useState('Tous')
  const [selectedBroker, setSelectedBroker] = useState('Tous')
  const [selectedAccount, setSelectedAccount] = useState('Tous')
  const [selectedBucket, setSelectedBucket] = useState('Tous')
  const [selectedQuality, setSelectedQuality] = useState('Tous')
  const [search, setSearch] = useState('')

  const [sortKey, setSortKey] = useState<SortKey>('value_eur')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('LIST')
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const [portfolioResult, executionResult] = await Promise.all([
        supabase.from(PORTFOLIO_VIEW).select(PORTFOLIO_SELECT),
        supabase.from(EXECUTION_PORTFOLIO_VIEW).select(EXECUTION_PORTFOLIO_SELECT),
      ])

      if (portfolioResult.error) {
        console.error('Portfolio load error:', portfolioResult.error.message)
        setError(portfolioResult.error.message)
        setRows([])
        setLoading(false)
        return
      }

      const baseRows = (portfolioResult.data || []) as Position[]

      if (executionResult.error) {
        console.error('Execution portfolio load error:', executionResult.error.message)
        setError(executionResult.error.message)
        setRows(recalculateWeights(baseRows))
        setLoading(false)
        return
      }

      const executionRows = (executionResult.data || []) as ExecutionPosition[]
      setRows(mergePortfolioRows(baseRows, executionRows))
      setLoading(false)
    }

    load()
  }, [supabase])

  const typeOptions = useMemo(() => uniqueOptions(rows.map((row) => row.account_type)), [rows])
  const brokerOptions = useMemo(() => uniqueOptions(rows.map((row) => row.broker_code)), [rows])
  const accountOptions = useMemo(() => uniqueOptions(rows.map((row) => row.account_name)), [rows])
  const bucketOptions = useMemo(() => uniqueOptions(rows.map((row) => row.asset_bucket)), [rows])
  const qualityOptions = useMemo(() => uniqueOptions(rows.map((row) => row.data_quality)), [rows])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rows.filter((row) => {
      const action = getNexialAction(row)

      if (quickFilter === 'PEA' && normalizeAccountType(row.account_type) !== 'PEA') return false
      if (quickFilter === 'CTO' && normalizeAccountType(row.account_type) !== 'CTO') return false
      if (quickFilter === 'IBKR' && !isBroker(row, 'IBKR')) return false
      if (quickFilter === 'BOURSORAMA' && !isBroker(row, 'BOURSORAMA')) return false
      if (quickFilter === 'TRADE_REPUBLIC' && !isBroker(row, 'TRADE')) return false
      if (quickFilter === 'DATA_ALERTS' && isDataOk(row.data_quality) && !getFreshness(row.updated_at).danger) return false
      if (quickFilter === 'REINFORCE' && action.label !== 'RENFORCER') return false
      if (quickFilter === 'REDUCE' && action.label !== 'ALLÉGER') return false

      if (selectedType !== 'Tous' && row.account_type !== selectedType) return false
      if (selectedBroker !== 'Tous' && row.broker_code !== selectedBroker) return false
      if (selectedAccount !== 'Tous' && row.account_name !== selectedAccount) return false
      if (selectedBucket !== 'Tous' && row.asset_bucket !== selectedBucket) return false
      if (selectedQuality !== 'Tous' && row.data_quality !== selectedQuality) return false

      if (query) {
        const haystack = [
          row.ticker,
          row.asset_name,
          row.account_name,
          row.broker_code,
          row.asset_bucket,
          row.sector,
          row.country,
          row.price_source,
          row.execution_source,
        ]
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(query)) return false
      }

      return true
    })
  }, [
    rows,
    quickFilter,
    selectedType,
    selectedBroker,
    selectedAccount,
    selectedBucket,
    selectedQuality,
    search,
  ])

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) =>
      compareValues(a[sortKey], b[sortKey], sortDirection)
    )
  }, [filteredRows, sortKey, sortDirection])

  const totals = useMemo(() => {
    const value = filteredRows.reduce((sum, row) => sum + Number(row.value_eur || 0), 0)
    const pnl = filteredRows.reduce((sum, row) => sum + Number(row.pnl_eur || 0), 0)
    const cost = value - pnl
    const pnlPct = cost !== 0 ? (pnl / cost) * 100 : null

    const alerts = filteredRows.filter((row) => {
  const status = String(row.data_quality || '').toUpperCase()

  return (
    !status ||
    status.includes('ERROR') ||
    status.includes('MISSING')
  )
}).length

const oldData = 0

    const maxWeight = Math.max(...filteredRows.map((row) => Number(row.portfolio_weight_pct || 0)), 0)
    const topPosition = filteredRows.find((row) => Number(row.portfolio_weight_pct || 0) === maxWeight)
    const reinforce = filteredRows.filter((row) => getNexialAction(row).label === 'RENFORCER').length
    const reduce = filteredRows.filter((row) => getNexialAction(row).label === 'ALLÉGER').length
    const watch = filteredRows.filter((row) => getNexialAction(row).label === 'SURVEILLER').length
    const executionPositions = filteredRows.filter((row) => {
  const source = String(row.execution_source || row.price_source || '').toUpperCase()

  return (
    row.execution_position === true ||
    source.includes('DCA') ||
    source.includes('EXECUTION') ||
    source.includes('AUTO')
  )
}).length
    const qualityRatio = filteredRows.length > 0 ? ((filteredRows.length - alerts - oldData) / filteredRows.length) * 100 : 100

    return { value, pnl, pnlPct, alerts, maxWeight, topPosition, oldData, reinforce, reduce, watch, executionPositions, qualityRatio }
  }, [filteredRows])

  const accountGroups = useMemo<AccountGroup[]>(() => {
    const map = new Map<string, Position[]>()

    sortedRows.forEach((row) => {
      const key = getAccountKey(row)
      const current = map.get(key) || []
      current.push(row)
      map.set(key, current)
    })

    return Array.from(map.entries())
      .map(([key, positions]) => {
        const value = positions.reduce((sum, row) => sum + Number(row.value_eur || 0), 0)
        const pnl = positions.reduce((sum, row) => sum + Number(row.pnl_eur || 0), 0)
        const cost = value - pnl
        const pnlPct = cost !== 0 ? (pnl / cost) * 100 : null
        const first = positions[0]

        return {
          key,
          positions,
          value,
          pnl,
          pnlPct,
          type: normalizeAccountType(first?.account_type),
          broker: first?.broker_code || 'Broker',
          accountName: first?.account_name || 'Compte',
          sort: accountSortWeight(first?.account_type),
        }
      })
      .sort((a, b) => a.sort - b.sort || b.value - a.value)
  }, [sortedRows])

  const topSignals = useMemo(() => {
    return [...filteredRows]
      .map((row) => ({ row, action: getNexialAction(row) }))
      .filter((item) => item.action.label !== 'HOLD')
      .sort((a, b) => b.action.priority - a.action.priority || Number(b.row.value_eur || 0) - Number(a.row.value_eur || 0))
      .slice(0, 3)
  }, [filteredRows])

  function resetFilters() {
    setQuickFilter('ALL')
    setSelectedType('Tous')
    setSelectedBroker('Tous')
    setSelectedAccount('Tous')
    setSelectedBucket('Tous')
    setSelectedQuality('Tous')
    setSearch('')
    setSortKey('value_eur')
    setSortDirection('desc')
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection(['asset_name', 'ticker', 'account_name', 'broker_code', 'updated_at'].includes(key) ? 'asc' : 'desc')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#08111f] p-6 text-white">
        <div className="mx-auto max-w-[1600px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#101827] shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
          <div className="relative p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_36%),radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_32%)]" />
            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                <Database size={14} /> Nexial Portfolio
              </div>
              <h1 className="text-4xl font-semibold tracking-tight">Chargement Portfolio Master...</h1>
              <p className="mt-3 text-sm text-slate-400">
                Lecture de <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-200">{PORTFOLIO_VIEW}</code> +{' '}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-200">{EXECUTION_PORTFOLIO_VIEW}</code>
              </p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#08111f] px-4 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-[1720px] space-y-5">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#101827] shadow-[0_30px_120px_rgba(0,0,0,0.34)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_40%)]" />

          <div className="relative grid gap-6 p-6 lg:grid-cols-[1.25fr_0.75fr] lg:p-8">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                <Command size={14} /> Portfolio Master
              </div>

              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white md:text-6xl">
                Voir. Décider. Exécuter.
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Vue portefeuille PEA / CTO centrée décision : poids, performance, qualité prix et signal Nexial en moins de 3 secondes.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <StatusPill icon={<ShieldCheck size={15} />} label="Source" value={`${PORTFOLIO_VIEW} + execution`} />
                <StatusPill icon={<Gauge size={15} />} label="Signal" value="HOLD / RENFORCER / ALLÉGER" />
                <StatusPill icon={<Sparkles size={15} />} label="Execution" value={`${totals.executionPositions} ligne(s)`} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <HeroMetric label="Valeur filtrée" value={eur(totals.value)} helper={`${filteredRows.length} lignes affichées`} icon={<Wallet size={20} />} />
              <HeroMetric label="Performance" value={pct(totals.pnlPct)} helper={eur(totals.pnl)} icon={(totals.pnlPct || 0) >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />} tone={(totals.pnlPct || 0) >= 0 ? 'positive' : 'negative'} />
              <HeroMetric label="Top position" value={totals.topPosition?.ticker || '—'} helper={rawPct(totals.maxWeight)} icon={<Target size={20} />} tone={totals.maxWeight >= 10 ? 'warning' : 'neutral'} />
              <HeroMetric label="Data health" value={totals.alerts === 0 && totals.oldData === 0 ? 'OK' : 'À vérifier'} helper={`${Math.max(0, totals.qualityRatio).toFixed(0)} % fiable`} icon={totals.alerts === 0 && totals.oldData === 0 ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />} tone={totals.alerts === 0 && totals.oldData === 0 ? 'positive' : 'warning'} />
            </div>
          </div>
        </header>

        {error && (
          <section className="rounded-[1.5rem] border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-200">
            Erreur Supabase : {error}
          </section>
        )}

        <section className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
          <div className="rounded-[1.75rem] border border-white/10 bg-[#101827]/95 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <LineChart size={18} className="text-cyan-300" /> Lecture Nexial
                </div>
                <p className="mt-1 text-sm text-slate-400">Synthèse actionnable du portefeuille filtré.</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">Live UI</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DecisionTile label="Renforcer" value={String(totals.reinforce)} icon={<TrendingUp size={18} />} tone="positive" />
              <DecisionTile label="Alléger" value={String(totals.reduce)} icon={<TrendingDown size={18} />} tone="warning" />
              <DecisionTile label="Surveiller" value={String(totals.watch)} icon={<AlertTriangle size={18} />} tone="watch" />
              <DecisionTile label="HOLD" value={String(Math.max(filteredRows.length - totals.reinforce - totals.reduce - totals.watch, 0))} icon={<ShieldCheck size={18} />} tone="neutral" />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-[#101827]/95 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)]">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Sparkles size={18} className="text-cyan-300" /> Top signaux
                </div>
                <p className="mt-1 text-sm text-slate-400">Maximum 3 lignes à regarder maintenant.</p>
              </div>
              <button onClick={() => setQuickFilter('ALL')} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.07]">
                Réinitialiser vue
              </button>
            </div>

            {topSignals.length === 0 ? (
              <div className="rounded-[1.25rem] border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                Aucun signal prioritaire. Portefeuille en mode HOLD : pas d’action inutile.
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-3">
                {topSignals.map(({ row, action }) => (
                  <SignalCard key={row.position_id || `${row.account_id}-${row.ticker}`} row={row} action={action} onOpen={() => setSelectedPosition(row)} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-[#101827]/95 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)]">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Filter size={18} className="text-cyan-300" /> Filtres portefeuille
              </div>
              <p className="mt-1 text-sm text-slate-400">PEA / CTO / broker / qualité data / action Nexial.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <QuickButton label="Tous" active={quickFilter === 'ALL'} onClick={() => setQuickFilter('ALL')} />
              <QuickButton label="PEA" active={quickFilter === 'PEA'} onClick={() => setQuickFilter('PEA')} />
              <QuickButton label="CTO" active={quickFilter === 'CTO'} onClick={() => setQuickFilter('CTO')} />
              <QuickButton label="IBKR" active={quickFilter === 'IBKR'} onClick={() => setQuickFilter('IBKR')} />
              <QuickButton label="Boursorama" active={quickFilter === 'BOURSORAMA'} onClick={() => setQuickFilter('BOURSORAMA')} />
              <QuickButton label="Trade Republic" active={quickFilter === 'TRADE_REPUBLIC'} onClick={() => setQuickFilter('TRADE_REPUBLIC')} />
              <QuickButton label="Renforcer" active={quickFilter === 'REINFORCE'} onClick={() => setQuickFilter('REINFORCE')} positive />
              <QuickButton label="Alléger" active={quickFilter === 'REDUCE'} onClick={() => setQuickFilter('REDUCE')} warning />
              <QuickButton label="Alertes data" active={quickFilter === 'DATA_ALERTS'} onClick={() => setQuickFilter('DATA_ALERTS')} danger />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            <Select label="Type" value={selectedType} onChange={setSelectedType} options={typeOptions} />
            <Select label="Broker" value={selectedBroker} onChange={setSelectedBroker} options={brokerOptions} />
            <Select label="Compte" value={selectedAccount} onChange={setSelectedAccount} options={accountOptions} />
            <Select label="Classe" value={selectedBucket} onChange={setSelectedBucket} options={bucketOptions} />
            <Select label="Qualité" value={selectedQuality} onChange={setSelectedQuality} options={qualityOptions} />

            <label className="space-y-2 xl:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Recherche</span>
              <div className="relative">
                <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ticker, actif, secteur, compte..." className="h-[46px] w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10" />
              </div>
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <ViewModeSwitch value={viewMode} onChange={setViewMode} />

            <button onClick={resetFilters} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.07]">
              Réinitialiser
            </button>
          </div>
        </section>

        <section className="space-y-4">
          {accountGroups.length === 0 ? (
            <div className="rounded-[1.75rem] border border-white/10 bg-[#101827]/95 p-8 text-center text-slate-400">
              Aucune position ne correspond aux filtres actifs.
            </div>
          ) : viewMode === 'LIST' ? (
            accountGroups.map((group) => (
              <AccountListBlock key={group.key} group={group} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} onOpen={setSelectedPosition} />
            ))
          ) : (
            accountGroups.map((group) => (
              <AccountCardBlock key={group.key} group={group} onOpen={setSelectedPosition} />
            ))
          )}
        </section>
      </div>

      {selectedPosition && (
        <PositionDrawer row={selectedPosition} onClose={() => setSelectedPosition(null)} />
      )}
    </main>
  )
}
function StatusPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-slate-300 backdrop-blur">
      <span className="text-cyan-300">{icon}</span>
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-200">{value}</span>
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
  tone?: 'neutral' | 'positive' | 'negative' | 'warning'
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-300 border-emerald-300/20 bg-emerald-400/10'
      : tone === 'negative'
        ? 'text-red-300 border-red-300/20 bg-red-400/10'
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

function DecisionTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string
  icon: ReactNode
  tone: 'positive' | 'warning' | 'watch' | 'neutral'
}) {
  const className =
    tone === 'positive'
      ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200'
      : tone === 'warning'
        ? 'border-amber-300/20 bg-amber-400/10 text-amber-200'
        : tone === 'watch'
          ? 'border-cyan-300/20 bg-cyan-300/10 text-cyan-200'
          : 'border-white/10 bg-white/[0.04] text-slate-200'

  return (
    <div className={`rounded-[1.25rem] border p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  )
}

function SignalCard({
  row,
  action,
  onOpen,
}: {
  row: Position
  action: NexialAction
  onOpen: () => void
}) {
  return (
    <button
      onClick={onOpen}
      className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-cyan-300/30 hover:bg-white/[0.06]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold text-white">{row.ticker}</div>
          <div className="mt-1 truncate text-xs text-slate-500">{row.asset_name || '—'}</div>
        </div>
        <ActionBadge label={action.label} tone={action.tone} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl border border-white/10 bg-black/10 p-2">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Perf</div>
          <div className={Number(row.pnl_pct || 0) >= 0 ? 'font-semibold text-emerald-300' : 'font-semibold text-red-300'}>
            {pct(row.pnl_pct)}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-2">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Poids</div>
          <div className="font-semibold text-slate-200">{rawPct(row.portfolio_weight_pct)}</div>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-400">{action.reason}</p>
    </button>
  )
}

function ViewModeSwitch({
  value,
  onChange,
}: {
  value: ViewMode
  onChange: (value: ViewMode) => void
}) {
  return (
    <div className="inline-flex w-fit rounded-2xl border border-white/10 bg-black/10 p-1">
      <button
        onClick={() => onChange('LIST')}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
          value === 'LIST'
            ? 'bg-cyan-300/20 text-cyan-100 ring-1 ring-cyan-300/25'
            : 'text-slate-400 hover:bg-white/10 hover:text-white'
        }`}
      >
        <List size={16} /> Liste
      </button>
      <button
        onClick={() => onChange('CARDS')}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
          value === 'CARDS'
            ? 'bg-cyan-300/20 text-cyan-100 ring-1 ring-cyan-300/25'
            : 'text-slate-400 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Grid3X3 size={16} /> Cartes
      </button>
    </div>
  )
}

function QuickButton({
  label,
  active,
  onClick,
  danger,
  positive,
  warning,
}: {
  label: string
  active: boolean
  onClick: () => void
  danger?: boolean
  positive?: boolean
  warning?: boolean
}) {
  const inactive = danger
    ? 'border-red-300/20 bg-red-400/10 text-red-200 hover:bg-red-400/15'
    : positive
      ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15'
      : warning
        ? 'border-amber-300/20 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15'
        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.07]'

  const activeClass = danger
    ? 'border-red-300/40 bg-red-400/20 text-red-100'
    : positive
      ? 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100'
      : warning
        ? 'border-amber-300/40 bg-amber-400/20 text-amber-100'
        : 'border-cyan-300/40 bg-cyan-300/20 text-cyan-100'

  return (
    <button onClick={onClick} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? activeClass : inactive}`}>
      {label}
    </button>
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

function AccountHeader({ group }: { group: AccountGroup }) {
  const reinforce = group.positions.filter((row) => getNexialAction(row).label === 'RENFORCER').length
  const reduce = group.positions.filter((row) => getNexialAction(row).label === 'ALLÉGER').length
  const watch = group.positions.filter((row) => getNexialAction(row).label === 'SURVEILLER').length

  return (
    <div className="flex flex-col gap-4 border-b border-white/10 p-5 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-cyan-300">
          {group.type === 'PEA' ? <BadgeEuro size={22} /> : group.type === 'CTO' ? <CircleDollarSign size={22} /> : <Building2 size={22} />}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-white">{group.type}</h2>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">{group.broker}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">{group.accountName}</span>
          </div>
          <p className="mt-1 text-sm text-slate-400">{group.positions.length} lignes · {compactEur(group.value)} · {pct(group.pnlPct)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SmallAccountMetric label="Valeur" value={eur(group.value)} />
        <SmallAccountMetric label="P&L" value={eur(group.pnl)} positive={group.pnl >= 0} />
        <SmallAccountMetric label="Renfort" value={String(reinforce)} positive={reinforce > 0} />
        <SmallAccountMetric label="À traiter" value={String(reduce + watch)} warning={reduce + watch > 0} />
      </div>
    </div>
  )
}

function AccountListBlock({
  group,
  sortKey,
  sortDirection,
  onSort,
  onOpen,
}: {
  group: AccountGroup
  sortKey: SortKey
  sortDirection: SortDirection
  onSort: (key: SortKey) => void
  onOpen: (row: Position) => void
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#101827]/95 shadow-[0_24px_90px_rgba(0,0,0,0.25)]">
      <AccountHeader group={group} />

      <div className="hidden border-b border-white/10 bg-black/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 xl:grid xl:grid-cols-[1.35fr_0.7fr_0.75fr_0.75fr_0.7fr_0.75fr_0.8fr_0.9fr_0.65fr] xl:items-center xl:gap-3">
        <button onClick={() => onSort('asset_name')} className="text-left transition hover:text-cyan-300">Actif {sortKey === 'asset_name' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</button>
        <button onClick={() => onSort('value_eur')} className="text-right transition hover:text-cyan-300">Valeur {sortKey === 'value_eur' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</button>
        <button onClick={() => onSort('pnl_pct')} className="text-right transition hover:text-cyan-300">Perf {sortKey === 'pnl_pct' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</button>
        <button onClick={() => onSort('portfolio_weight_pct')} className="text-right transition hover:text-cyan-300">Poids {sortKey === 'portfolio_weight_pct' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</button>
        <div className="text-right">P&L</div>
        <div className="text-right">PRU</div>
        <div className="text-right">Cours</div>
        <div className="text-right">Signal</div>
        <div className="text-right">Détail</div>
      </div>

      <div className="divide-y divide-white/10">
        {group.positions.map((row) => {
          const action = getNexialAction(row)
          const displayedPrice = getDisplayedPrice(row)
          const positive = Number(row.pnl_pct || 0) >= 0
          const freshness = getFreshness(row.updated_at)

          return (
            <button
              key={row.position_id || `${row.account_id}-${row.ticker}-list`}
              onClick={() => onOpen(row)}
              className="block w-full px-5 py-4 text-left transition hover:bg-cyan-300/5"
            >
              <div className="grid gap-4 xl:grid-cols-[1.35fr_0.7fr_0.75fr_0.75fr_0.7fr_0.75fr_0.8fr_0.9fr_0.65fr] xl:items-center xl:gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold text-white">{row.ticker}</span>
                    <BucketBadge bucket={row.asset_bucket || row.asset_type || 'UNKNOWN'} />
                    {row.execution_position && <ExecutionBadge />}
                    <span className="xl:hidden"><ActionBadge label={action.label} tone={action.tone} /></span>
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-400">{row.asset_name || row.ticker}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 xl:hidden">
                    <DataBadge status={row.data_quality || 'UNKNOWN'} />
                    <FreshnessBadge label={freshness.label} danger={freshness.danger} />
                    <PriceSourceBadge source={row.price_source || 'UNKNOWN'} />
                  </div>
                </div>

                <ListValue label="Valeur" value={eur(row.value_eur)} />
                <ListValue label="Perf" value={pct(row.pnl_pct)} tone={positive ? 'positive' : 'negative'} />
                <ListValue label="Poids" value={rawPct(row.portfolio_weight_pct)} />
                <ListValue label="P&L" value={eur(row.pnl_eur)} tone={Number(row.pnl_eur || 0) >= 0 ? 'positive' : 'negative'} />
                <ListValue label="PRU" value={money(row.pru, row.currency || 'EUR')} />
                <ListValue label="Cours" value={money(displayedPrice, row.currency || 'EUR')} />

                <div className="hidden justify-end xl:flex">
                  <ActionBadge label={action.label} tone={action.tone} />
                </div>

                <div className="hidden justify-end xl:flex">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-300">
                    <Eye size={13} /> Ouvrir
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function AccountCardBlock({ group, onOpen }: { group: AccountGroup; onOpen: (row: Position) => void }) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#101827]/95 shadow-[0_24px_90px_rgba(0,0,0,0.25)]">
      <AccountHeader group={group} />

      <div className="grid gap-4 p-5 xl:grid-cols-2 2xl:grid-cols-3">
        {group.positions.map((row) => (
          <PositionCard key={row.position_id || `${row.account_id}-${row.ticker}`} row={row} onOpen={() => onOpen(row)} />
        ))}
      </div>
    </section>
  )
}

function ListValue({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'positive' | 'negative' }) {
  return (
    <div className="grid grid-cols-2 items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-2 xl:block xl:border-0 xl:bg-transparent xl:px-0 xl:py-0 xl:text-right">
      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-600 xl:hidden">{label}</span>
      <span className={`text-sm font-semibold ${tone === 'positive' ? 'text-emerald-300' : tone === 'negative' ? 'text-red-300' : 'text-white'}`}>
        {value}
      </span>
    </div>
  )
}

function SmallAccountMetric({ label, value, positive, warning }: { label: string; value: string; positive?: boolean; warning?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${positive ? 'text-emerald-300' : warning ? 'text-amber-300' : 'text-white'}`}>{value}</div>
    </div>
  )
}

function PositionCard({ row, onOpen }: { row: Position; onOpen: () => void }) {
  const action = getNexialAction(row)
  const displayedPrice = getDisplayedPrice(row)
  const pnlPositive = Number(row.pnl_pct || 0) >= 0
  const freshness = getFreshness(row.updated_at)

  return (
    <article className="group rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.055]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-xl font-semibold tracking-tight text-white">{row.ticker}</h3>
            <BucketBadge bucket={row.asset_bucket || row.asset_type || 'UNKNOWN'} />
            {row.execution_position && <ExecutionBadge />}
          </div>
          <p className="mt-1 truncate text-sm text-slate-400">{row.asset_name || row.ticker}</p>
        </div>
        <ActionBadge label={action.label} tone={action.tone} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <PositionMetric label="Valeur" value={eur(row.value_eur)} icon={<Wallet size={15} />} />
        <PositionMetric label="Perf" value={pct(row.pnl_pct)} icon={pnlPositive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />} tone={pnlPositive ? 'positive' : 'negative'} />
        <PositionMetric label="Poids" value={rawPct(row.portfolio_weight_pct)} icon={<BarChart3 size={15} />} />
        <PositionMetric label="P&L" value={eur(row.pnl_eur)} icon={<LineChart size={15} />} tone={Number(row.pnl_eur || 0) >= 0 ? 'positive' : 'negative'} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-sm">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-600">PRU</div>
          <div className="mt-1 truncate font-medium text-slate-200">{money(row.pru, row.currency || 'EUR')}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-600">Cours</div>
          <div className="mt-1 truncate font-medium text-slate-200">{money(displayedPrice, row.currency || 'EUR')}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-600">Qté</div>
          <div className="mt-1 truncate font-medium text-slate-200">{num(row.quantity)}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <DataBadge status={row.data_quality || 'UNKNOWN'} />
        <PriceSourceBadge source={row.price_source || 'UNKNOWN'} />
        <FreshnessBadge label={freshness.label} danger={freshness.danger} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="line-clamp-2 text-xs leading-5 text-slate-500">{action.reason}</p>
        <button onClick={onOpen} className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10">
          Détail
        </button>
      </div>
    </article>
  )
}

function PositionMetric({ label, value, icon, tone = 'neutral' }: { label: string; value: string; icon: ReactNode; tone?: 'neutral' | 'positive' | 'negative' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-600">
        {label}
        <span className={tone === 'positive' ? 'text-emerald-300' : tone === 'negative' ? 'text-red-300' : 'text-slate-500'}>{icon}</span>
      </div>
      <div className={`truncate text-sm font-semibold ${tone === 'positive' ? 'text-emerald-300' : tone === 'negative' ? 'text-red-300' : 'text-white'}`}>{value}</div>
    </div>
  )
}

function PositionDrawer({ row, onClose }: { row: Position; onClose: () => void }) {
  const action = getNexialAction(row)
  const displayedPrice = getDisplayedPrice(row)
  const freshness = getFreshness(row.updated_at)
  const pnlPositive = Number(row.pnl_pct || 0) >= 0

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <button aria-label="Fermer le détail" className="absolute inset-0 cursor-default" onClick={onClose} />

      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#07111f] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Détail actif</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h2 className="text-4xl font-semibold tracking-tight">{row.ticker}</h2>
              <BucketBadge bucket={row.asset_bucket || row.asset_type || 'UNKNOWN'} />
              {row.execution_position && <ExecutionBadge />}
            </div>
            <p className="mt-1 text-slate-400">{row.asset_name || '—'}</p>
          </div>

          <button onClick={onClose} className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-slate-300 transition hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Signal Nexial</p>
              <p className="mt-1 text-2xl font-semibold text-white">{action.label}</p>
            </div>
            <ActionBadge label={action.label} tone={action.tone} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">{action.reason}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <DrawerMetric label="Valeur" value={eur(row.value_eur)} />
          <DrawerMetric label="P&L" value={eur(row.pnl_eur)} tone={Number(row.pnl_eur || 0) >= 0 ? 'positive' : 'negative'} />
          <DrawerMetric label="Performance" value={pct(row.pnl_pct)} tone={pnlPositive ? 'positive' : 'negative'} />
          <DrawerMetric label="Poids portefeuille" value={rawPct(row.portfolio_weight_pct)} />
          <DrawerMetric label="PRU" value={money(row.pru, row.currency || 'EUR')} />
          <DrawerMetric label="Cours" value={money(displayedPrice, row.currency || 'EUR')} />
          <DrawerMetric label="Quantité" value={num(row.quantity)} />
          <DrawerMetric label="Poids compte" value={rawPct(row.account_weight_pct)} />
        </div>

        {row.execution_source && (
          <div className="mt-5 rounded-[1.5rem] border border-emerald-300/20 bg-emerald-400/10 p-5">
            <p className="text-sm font-semibold text-emerald-100">Origine exécution</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <DrawerMetric label="Source" value={row.execution_source || '—'} />
              <DrawerMetric label="Dernier ordre" value={money(row.execution_last_limit_price, row.currency || 'EUR')} />
              <DrawerMetric label="Confirmé" value={formatDate(row.execution_last_confirmed_at)} />
              <DrawerMetric label="Mode" value={row.execution_position ? 'Execution Engine' : 'Core Portfolio'} />
            </div>
          </div>
        )}

        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm font-semibold text-white">Qualité & source</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <DataBadge status={row.data_quality || 'UNKNOWN'} />
            <PriceSourceBadge source={row.price_source || 'UNKNOWN'} />
            <FreshnessBadge label={freshness.label} danger={freshness.danger} />
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Compte : {row.account_name || '—'} · Broker : {row.broker_code || '—'} · Devise : {row.currency || '—'}
          </p>
        </div>
      </aside>
    </div>
  )
}

function DrawerMetric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'positive' | 'negative' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${tone === 'positive' ? 'text-emerald-300' : tone === 'negative' ? 'text-red-300' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function DataBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase()
  const className =
    normalized === 'OK'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : normalized.includes('FALLBACK') || normalized.includes('MISSING') || normalized.includes('STALE')
        ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
        : 'border-red-300/30 bg-red-400/10 text-red-200'

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>{status}</span>
}

function BucketBadge({ bucket }: { bucket: string }) {
  const normalized = bucket.toUpperCase()
  const className =
    normalized === 'ETF'
      ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
      : normalized === 'CRYPTO'
        ? 'border-violet-300/30 bg-violet-400/10 text-violet-200'
        : normalized === 'ACTION' || normalized === 'STOCK'
          ? 'border-blue-300/30 bg-blue-400/10 text-blue-100'
          : 'border-white/10 bg-white/10 text-slate-300'

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>{bucket}</span>
}

function PriceSourceBadge({ source }: { source: string }) {
  const normalized = source.toUpperCase()
  const className =
    normalized.includes('LIVE')
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : normalized.includes('BROKER')
        ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
        : normalized.includes('EXECUTION') || normalized.includes('DCA') || normalized.includes('AUTO')
          ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
          : normalized.includes('FALLBACK')
            ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
            : 'border-white/10 bg-white/10 text-slate-300'

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>{source}</span>
}

function FreshnessBadge({ label, danger }: { label: string; danger: boolean }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${danger ? 'border-amber-300/30 bg-amber-400/10 text-amber-200' : 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'}`}>
      {label}
    </span>
  )
}

function ActionBadge({ label, tone }: { label: NexialAction['label']; tone: NexialTone }) {
  const className =
    tone === 'buy'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : tone === 'reduce'
        ? 'border-orange-300/30 bg-orange-400/10 text-orange-200'
        : tone === 'watch'
          ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
          : 'border-white/10 bg-white/10 text-slate-300'

  return <span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>
}

function ExecutionBadge() {
  return (
    <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
      EXEC
    </span>
  )
}