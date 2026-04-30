'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

const VIEW_NAME = 'vw_invest_ui_v1'

type RawRow = Record<string, any>

type InvestRow = {
  id: string
  ticker: string
  asset_name: string
  display_subtitle: string
  account_name: string
  account_type: string
  broker_code: string
  currency: string
  latest_close_price: number | null
  amount_suggested: number | null
  suggested_quantity: number | null
  buy_zone_low: number | null
  buy_zone_high: number | null
  score: number | null
  capital_efficiency_score: number | null
  expected_return_pct: number | null
  decision: string
  reason: string
  price_source: string
  price_quality: string
  price_updated_at: string | null
}

type SortKey =
  | 'ticker'
  | 'asset_name'
  | 'latest_close_price'
  | 'amount_suggested'
  | 'suggested_quantity'
  | 'score'
  | 'capital_efficiency_score'
  | 'expected_return_pct'
  | 'decision'
  | 'price_quality'

type SortDirection = 'asc' | 'desc'

function toNumber(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function text(value: unknown, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

function formatCurrency(value: number | null | undefined, currency = 'EUR') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value))
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return `${formatNumber(value, 2)} %`
}

function normalizeRow(row: RawRow, index: number): InvestRow {
  return {
    id: text(row.id ?? row.request_id ?? row.ticker ?? index),
    ticker: text(row.ticker),
    asset_name: text(row.asset_name ?? row.display_label ?? row.ticker),
    display_subtitle: text(row.display_subtitle ?? ''),
    account_name: text(row.account_name ?? row.wrapper_recommendation ?? '—'),
    account_type: text(row.account_type ?? row.final_wrapper_decision ?? '—'),
    broker_code: text(row.broker_code ?? '—'),
    currency: text(row.currency, 'EUR'),
    latest_close_price: toNumber(row.latest_close_price),
    amount_suggested: toNumber(row.amount_suggested),
    suggested_quantity: toNumber(row.suggested_quantity),
    buy_zone_low: toNumber(row.buy_zone_low),
    buy_zone_high: toNumber(row.buy_zone_high),
    score: toNumber(row.score),
    capital_efficiency_score: toNumber(row.capital_efficiency_score),
    expected_return_pct: toNumber(row.expected_return_pct),
    decision: text(row.decision, 'SURVEILLANCE'),
    reason: text(row.reason ?? row.display_subtitle ?? ''),
    price_source: text(row.price_source, 'UNKNOWN'),
    price_quality: text(row.price_quality, 'UNKNOWN'),
    price_updated_at: text(row.updated_at ?? row.price_updated_at ?? null, ''),
  }
}

function compareValues(a: unknown, b: unknown, direction: SortDirection) {
  const multiplier = direction === 'asc' ? 1 : -1

  if (typeof a === 'number' || typeof b === 'number') {
    return ((Number(a) || 0) - (Number(b) || 0)) * multiplier
  }

  return String(a || '').localeCompare(String(b || ''), 'fr') * multiplier
}

function decisionStyle(decision: string) {
  const d = decision.toUpperCase()

  if (d.includes('BUY') || d.includes('ACHAT') || d.includes('READY')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }

  if (d.includes('WAIT') || d.includes('ATTENDRE') || d.includes('SURVEILLANCE')) {
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }

  return 'border-slate-200 bg-slate-50 text-slate-700'
}

function qualityStyle(quality: string) {
  const q = quality.toUpperCase()

  if (q === 'OK') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (q.includes('STALE') || q.includes('FALLBACK') || q.includes('UNKNOWN')) {
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }

  return 'border-red-200 bg-red-50 text-red-800'
}

function zoneLabel(item: InvestRow) {
  if (item.buy_zone_low != null && item.buy_zone_high != null) {
    return `${formatCurrency(item.buy_zone_low, item.currency)} - ${formatCurrency(item.buy_zone_high, item.currency)}`
  }

  return 'NONE'
}

function isActionable(item: InvestRow) {
  const d = item.decision.toUpperCase()
  const q = item.price_quality.toUpperCase()

  return (
    q === 'OK' &&
    (d.includes('BUY') || d.includes('READY') || d.includes('ACHAT'))
  )
}

export default function InvestPage() {
  const [rows, setRows] = useState<InvestRow[]>([])
  const [sourceView, setSourceView] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedAccount, setSelectedAccount] = useState('Tous')
  const [selectedDecision, setSelectedDecision] = useState('Tous')
  const [selectedQuality, setSelectedQuality] = useState('Tous')
  const [search, setSearch] = useState('')

  const [sortKey, setSortKey] = useState<SortKey>('capital_efficiency_score')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.from(VIEW_NAME).select('*')

      if (error) {
        setRows([])
        setError(error.message)
        setSourceView(VIEW_NAME)
      } else {
        setRows((data || []).map((row, index) => normalizeRow(row, index)))
        setSourceView(VIEW_NAME)
      }

      setLoading(false)
    }

    load()
  }, [])

  const accountOptions = useMemo(
    () => ['Tous', ...Array.from(new Set(rows.map((r) => r.account_name).filter(Boolean))).sort()],
    [rows]
  )

  const decisionOptions = useMemo(
    () => ['Tous', ...Array.from(new Set(rows.map((r) => r.decision).filter(Boolean))).sort()],
    [rows]
  )

  const qualityOptions = useMemo(
    () => ['Tous', ...Array.from(new Set(rows.map((r) => r.price_quality).filter(Boolean))).sort()],
    [rows]
  )

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()

    return rows.filter((row) => {
      if (selectedAccount !== 'Tous' && row.account_name !== selectedAccount) return false
      if (selectedDecision !== 'Tous' && row.decision !== selectedDecision) return false
      if (selectedQuality !== 'Tous' && row.price_quality !== selectedQuality) return false

      if (q) {
        const haystack = [
          row.ticker,
          row.asset_name,
          row.account_name,
          row.account_type,
          row.broker_code,
          row.decision,
          row.reason,
        ]
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [rows, selectedAccount, selectedDecision, selectedQuality, search])

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) =>
      compareValues(a[sortKey], b[sortKey], sortDirection)
    )
  }, [filteredRows, sortKey, sortDirection])

  const stats = useMemo(() => {
    const actionable = filteredRows.filter(isActionable).length
    const surveillance = filteredRows.filter((row) =>
      row.decision.toUpperCase().includes('SURVEILLANCE')
    ).length
    const blocked = filteredRows.filter((row) => row.price_quality.toUpperCase() !== 'OK').length
    const amountNow = filteredRows
      .filter(isActionable)
      .reduce((sum, row) => sum + Number(row.amount_suggested || 0), 0)

    const best = [...filteredRows].sort((a, b) => {
      const aScore = Number(a.capital_efficiency_score || 0) + Number(a.score || 0)
      const bScore = Number(b.capital_efficiency_score || 0) + Number(b.score || 0)
      return bScore - aScore
    })[0]

    return { actionable, surveillance, blocked, amountNow, best }
  }, [filteredRows])

  function resetFilters() {
    setSelectedAccount('Tous')
    setSelectedDecision('Tous')
    setSelectedQuality('Tous')
    setSearch('')
    setSortKey('capital_efficiency_score')
    setSortDirection('desc')
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection(['ticker', 'asset_name', 'decision', 'price_quality'].includes(key) ? 'asc' : 'desc')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#eef2f7] p-8 text-slate-900">
        Chargement Invest Now...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#eef2f7] px-5 py-5 text-slate-900">
      <div className="mx-auto max-w-[1550px] space-y-5">
        <header className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-[#0f172a] via-[#172554] to-[#1e3a8a] px-7 py-6 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-blue-200">
                  Nexial Invest Now
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                  Investir maintenant
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
                  Propositions verrouillées sur la vue Invest UI officielle. Les anciennes vues ne sont plus utilisées.
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-right backdrop-blur">
                <p className="text-xs text-blue-100">Source moteur</p>
                <p className="mt-1 text-lg font-semibold">{sourceView || '—'}</p>
              </div>
            </div>
          </div>

          <section className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
            <Metric label="Idées" value={`${filteredRows.length} / ${rows.length}`} />
            <Metric label="Actionnables" value={String(stats.actionable)} positive={stats.actionable > 0} />
            <Metric label="Surveillance" value={String(stats.surveillance)} />
            <Metric label="Prix bloqués" value={String(stats.blocked)} danger={stats.blocked > 0} />
            <Metric label="À investir" value={formatCurrency(stats.amountNow, 'EUR')} />
            <Metric
              label="Meilleur actif"
              value={stats.best?.ticker || '—'}
              subValue={stats.best ? formatCurrency(stats.best.latest_close_price, stats.best.currency) : undefined}
            />
          </section>
        </header>

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Erreur source Invest : {error}
          </section>
        )}

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Filtres dynamiques</h2>
              <p className="text-sm text-slate-500">
                Compte, décision et qualité prix viennent directement de <strong>{VIEW_NAME}</strong>.
              </p>
            </div>

            <button
              onClick={resetFilters}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Réinitialiser
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Select label="Compte" value={selectedAccount} onChange={setSelectedAccount} options={accountOptions} />
            <Select label="Décision" value={selectedDecision} onChange={setSelectedDecision} options={decisionOptions} />
            <Select label="Qualité prix" value={selectedQuality} onChange={setSelectedQuality} options={qualityOptions} />

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-600">Recherche</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ticker, actif, compte..."
                className="h-[44px] w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Top idées</h2>
              <p className="mt-1 text-sm text-slate-500">
                Triable par score, prix, montant, rendement ou qualité prix.
              </p>
            </div>

            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-500">
              Vue officielle unique
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr className="border-b border-slate-200">
                  <SortableTh label="Actif" sortKey="asset_name" current={sortKey} direction={sortDirection} onSort={handleSort} className="w-[230px]" />
                  <SortableTh label="Ticker" sortKey="ticker" current={sortKey} direction={sortDirection} onSort={handleSort} className="w-[80px]" />
                  <th className="w-[170px] px-3 py-3 font-semibold">Compte</th>
                  <SortableTh label="Décision" sortKey="decision" current={sortKey} direction={sortDirection} onSort={handleSort} className="w-[135px]" />
                  <SortableTh label="Prix" sortKey="latest_close_price" current={sortKey} direction={sortDirection} onSort={handleSort} align="right" className="w-[105px]" />
                  <th className="w-[160px] px-3 py-3 text-right font-semibold">Zone</th>
                  <SortableTh label="Montant" sortKey="amount_suggested" current={sortKey} direction={sortDirection} onSort={handleSort} align="right" className="w-[110px]" />
                  <SortableTh label="Qté" sortKey="suggested_quantity" current={sortKey} direction={sortDirection} onSort={handleSort} align="right" className="w-[95px]" />
                  <SortableTh label="Score" sortKey="score" current={sortKey} direction={sortDirection} onSort={handleSort} align="right" className="w-[90px]" />
                  <SortableTh label="Efficiency" sortKey="capital_efficiency_score" current={sortKey} direction={sortDirection} onSort={handleSort} align="right" className="w-[105px]" />
                  <SortableTh label="Rdt." sortKey="expected_return_pct" current={sortKey} direction={sortDirection} onSort={handleSort} align="right" className="w-[85px]" />
                  <SortableTh label="Prix data" sortKey="price_quality" current={sortKey} direction={sortDirection} onSort={handleSort} align="right" className="w-[105px]" />
                </tr>
              </thead>

              <tbody>
                {sortedRows.map((item, index) => (
                  <tr key={`${item.id}-${item.ticker}-${index}`} className="border-b border-slate-100 transition hover:bg-blue-50/60">
                    <td className="px-3 py-4">
                      <div className="font-semibold text-slate-950">{item.asset_name}</div>
                      <div className="text-xs text-slate-400">{item.display_subtitle || item.reason}</div>
                    </td>
                    <td className="px-3 py-4 font-semibold text-blue-700">{item.ticker}</td>
                    <td className="px-3 py-4 text-slate-600">
                      <div>{item.account_name}</div>
                      <div className="text-xs text-slate-400">{item.account_type} · {item.broker_code}</div>
                    </td>
                    <td className="px-3 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${decisionStyle(item.decision)}`}>
                        {item.decision}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-right font-semibold text-slate-950">
                      {formatCurrency(item.latest_close_price, item.currency)}
                    </td>
                    <td className="px-3 py-4 text-right text-slate-600">{zoneLabel(item)}</td>
                    <td className="px-3 py-4 text-right font-medium">{formatCurrency(item.amount_suggested, item.currency)}</td>
                    <td className="px-3 py-4 text-right">{formatNumber(item.suggested_quantity, 4)}</td>
                    <td className="px-3 py-4 text-right">{formatNumber(item.score, 2)}</td>
                    <td className="px-3 py-4 text-right">{formatNumber(item.capital_efficiency_score, 2)}</td>
                    <td className="px-3 py-4 text-right">{formatPercent(item.expected_return_pct)}</td>
                    <td className="px-3 py-4 text-right">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${qualityStyle(item.price_quality)}`}>
                        {item.price_quality}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

function Metric({
  label,
  value,
  subValue,
  positive,
  danger,
}: {
  label: string
  value: string
  subValue?: string
  positive?: boolean
  danger?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${danger ? 'text-red-700' : positive ? 'text-emerald-700' : 'text-slate-950'}`}>
        {value}
      </p>
      {subValue && <p className="mt-1 text-sm text-slate-400">{subValue}</p>}
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
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-[44px] w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-900 outline-none transition hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function SortableTh({
  label,
  sortKey,
  current,
  direction,
  onSort,
  align = 'left',
  className = '',
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  direction: SortDirection
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
  className?: string
}) {
  const active = current === sortKey

  return (
    <th className={`px-3 py-3 ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 font-semibold transition hover:text-blue-700 ${
          active ? 'text-blue-700' : 'text-slate-600'
        }`}
      >
        {label}
        <span className="text-[10px]">{active ? (direction === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  )
}