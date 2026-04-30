'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
}

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

type QuickFilter =
  | 'ALL'
  | 'PEA'
  | 'CTO'
  | 'IBKR'
  | 'BOURSORAMA'
  | 'TRADE_REPUBLIC'
  | 'DATA_ALERTS'

function eur(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(value))
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

function pct(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)} %`
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
  return String(status || '').toUpperCase() === 'OK'
}

function isBroker(row: Position, broker: string) {
  const value = `${row.broker_code || ''} ${row.account_name || ''}`.toUpperCase()
  return value.includes(broker)
}

function getFreshness(updatedAt?: string | null) {
  if (!updatedAt) return { label: 'Inconnue', danger: true }

  const updated = new Date(updatedAt)
  if (Number.isNaN(updated.getTime())) return { label: 'Inconnue', danger: true }

  const diffHours = (Date.now() - updated.getTime()) / 36e5

  if (diffHours < 24) return { label: '< 24h', danger: false }
  if (diffHours < 72) return { label: '1-3 jours', danger: false }

  return { label: '> 3 jours', danger: true }
}

function getNexialAction(row: Position) {
  const pnlPct = Number(row.pnl_pct || 0)
  const weight = Number(row.portfolio_weight_pct || 0)
  const qualityOk = isDataOk(row.data_quality)

  if (!qualityOk) return { label: 'Surveiller', tone: 'watch' as const }
  if (weight >= 10 && pnlPct > 15) return { label: 'Alléger ?', tone: 'reduce' as const }
  if (pnlPct <= -15 && weight < 8) return { label: 'Renfort ?', tone: 'buy' as const }
  if (pnlPct < -5) return { label: 'Contrôler', tone: 'watch' as const }

  return { label: 'Conserver', tone: 'hold' as const }
}

export default function PortfolioPage() {
  const supabase = createClient()

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

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('vw_portfolio_positions_ui_v2')
        .select('*')

      if (error) {
        console.error('Portfolio load error:', error.message)
        setError(error.message)
        setRows([])
      } else {
        setRows((data || []) as Position[])
      }

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
      if (quickFilter === 'PEA' && row.account_type !== 'PEA') return false
      if (quickFilter === 'CTO' && row.account_type !== 'CTO') return false
      if (quickFilter === 'IBKR' && !isBroker(row, 'IBKR')) return false
      if (quickFilter === 'BOURSORAMA' && !isBroker(row, 'BOURSORAMA')) return false
      if (quickFilter === 'TRADE_REPUBLIC' && !isBroker(row, 'TRADE')) return false
      if (quickFilter === 'DATA_ALERTS' && isDataOk(row.data_quality)) return false

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

    const winners = filteredRows.filter((row) => Number(row.pnl_eur || 0) > 0).length
    const losers = filteredRows.filter((row) => Number(row.pnl_eur || 0) < 0).length
    const alerts = filteredRows.filter((row) => !isDataOk(row.data_quality)).length

    const maxWeight = Math.max(
      ...filteredRows.map((row) => Number(row.portfolio_weight_pct || 0)),
      0
    )

    const topPosition = filteredRows.find(
      (row) => Number(row.portfolio_weight_pct || 0) === maxWeight
    )

    const oldData = filteredRows.filter((row) => getFreshness(row.updated_at).danger).length

    return { value, pnl, pnlPct, winners, losers, alerts, maxWeight, topPosition, oldData }
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
      setSortDirection(
        ['asset_name', 'ticker', 'account_name', 'broker_code', 'updated_at'].includes(key)
          ? 'asc'
          : 'desc'
      )
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#111a33] p-8 text-white">
        <div className="mx-auto max-w-[1600px] rounded-[1.75rem] border border-white/10 bg-[#182441] p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
            Nexial Portfolio
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Chargement portefeuille...</h1>
          <p className="mt-2 text-sm text-blue-100">
            Lecture de <code>vw_portfolio_positions_ui_v2</code>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#111a33] px-5 py-5 text-white">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#243763] via-[#1c2b50] to-[#151f3b] shadow-sm">
          <div className="px-7 py-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
                  Nexial Portfolio
                </p>
                <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">
                  Portefeuille
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-blue-100">
                  Vue complète, filtrable et triable de toutes les positions. P&L, poids, source prix et qualité data.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-right backdrop-blur">
                  <p className="text-xs text-blue-200">Valeur filtrée</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{eur(totals.value)}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-right backdrop-blur">
                  <p className="text-xs text-blue-200">État données</p>
                  <p
                    className={`mt-1 text-2xl font-semibold ${
                      totals.alerts === 0 && totals.oldData === 0 ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {totals.alerts === 0 && totals.oldData === 0 ? 'OK' : 'À vérifier'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <section className="grid gap-3 border-t border-white/10 p-4 md:grid-cols-3 xl:grid-cols-7">
            <MetricCard label="Lignes" value={`${filteredRows.length} / ${rows.length}`} />
            <MetricCard label="P&L EUR" value={eur(totals.pnl)} positive={totals.pnl >= 0} />
            <MetricCard label="Perf filtrée" value={pct(totals.pnlPct)} positive={(totals.pnlPct || 0) >= 0} />
            <MetricCard label="Gagnants / Perdants" value={`${totals.winners} / ${totals.losers}`} />
            <MetricCard label="1re position" value={totals.topPosition?.ticker || '—'} subValue={pct(totals.maxWeight)} />
            <MetricCard label="Qualité data" value={totals.alerts === 0 ? 'OK' : `${totals.alerts} alertes`} danger={totals.alerts > 0} />
            <MetricCard label="Fraîcheur" value={totals.oldData === 0 ? 'OK' : `${totals.oldData} à vérifier`} danger={totals.oldData > 0} />
          </section>
        </header>

        {error && (
          <section className="rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-200">
            Erreur Supabase : {error}
          </section>
        )}

        <section className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Filtres rapides</h2>
              <p className="text-sm text-blue-100">
                Accès immédiat aux vues utiles : PEA, CTO, brokers et alertes data.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <QuickButton label="Tous" active={quickFilter === 'ALL'} onClick={() => setQuickFilter('ALL')} />
              <QuickButton label="PEA" active={quickFilter === 'PEA'} onClick={() => setQuickFilter('PEA')} />
              <QuickButton label="CTO" active={quickFilter === 'CTO'} onClick={() => setQuickFilter('CTO')} />
              <QuickButton label="IBKR" active={quickFilter === 'IBKR'} onClick={() => setQuickFilter('IBKR')} />
              <QuickButton label="Boursorama" active={quickFilter === 'BOURSORAMA'} onClick={() => setQuickFilter('BOURSORAMA')} />
              <QuickButton label="Trade Republic" active={quickFilter === 'TRADE_REPUBLIC'} onClick={() => setQuickFilter('TRADE_REPUBLIC')} />
              <QuickButton label="Alertes data" active={quickFilter === 'DATA_ALERTS'} onClick={() => setQuickFilter('DATA_ALERTS')} danger />
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Filtres dynamiques</h2>
              <p className="text-sm text-blue-100">
                Type, broker, compte, classe et qualité viennent directement de la base.
              </p>
            </div>

            <button
              onClick={resetFilters}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
            >
              Réinitialiser
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Select label="Type" value={selectedType} onChange={setSelectedType} options={typeOptions} />
            <Select label="Broker" value={selectedBroker} onChange={setSelectedBroker} options={brokerOptions} />
            <Select label="Compte" value={selectedAccount} onChange={setSelectedAccount} options={accountOptions} />
            <Select label="Classe" value={selectedBucket} onChange={setSelectedBucket} options={bucketOptions} />
            <Select label="Qualité" value={selectedQuality} onChange={setSelectedQuality} options={qualityOptions} />

            <label className="space-y-2">
              <span className="text-sm font-medium text-blue-100">Recherche</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ticker, actif, compte..."
                className="h-[44px] w-full rounded-xl border border-white/10 bg-white/10 px-4 text-white outline-none transition placeholder:text-blue-200/60 hover:border-cyan-300/40 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
              />
            </label>
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#182441] shadow-sm">
          <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Positions</h2>
              <p className="mt-1 text-sm text-blue-100">
                Clique sur une colonne pour trier. Défile horizontalement pour voir toutes les colonnes.
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-blue-100">
              {filteredRows.length} lignes affichées
            </div>
          </div>

          <div className="relative">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1700px] text-[13px]">
                <thead className="sticky top-0 z-20 bg-[#1d2b4c] text-left text-blue-100">
                  <tr className="border-b border-white/10">
                    <SortableTh label="Actif" sortKey="asset_name" current={sortKey} direction={sortDirection} onSort={handleSort} className="sticky left-0 z-30 w-[230px] bg-[#1d2b4c]" />
                    <SortableTh label="Compte" sortKey="account_name" current={sortKey} direction={sortDirection} onSort={handleSort} className="sticky left-[230px] z-30 w-[170px] bg-[#1d2b4c]" />
                    <SortableTh label="Classe" sortKey="asset_bucket" current={sortKey} direction={sortDirection} onSort={handleSort} className="w-[105px]" />
                    <SortableTh label="Type" sortKey="account_type" current={sortKey} direction={sortDirection} onSort={handleSort} className="w-[90px]" />
                    <SortableTh label="Broker" sortKey="broker_code" current={sortKey} direction={sortDirection} onSort={handleSort} className="w-[110px]" />
                    <SortableTh label="Ticker" sortKey="ticker" current={sortKey} direction={sortDirection} onSort={handleSort} className="w-[90px]" />
                    <th className="w-[80px] px-3 py-3 text-right font-semibold">Qté</th>
                    <th className="w-[105px] px-3 py-3 text-right font-semibold">PRU</th>
                    <th className="w-[105px] px-3 py-3 text-right font-semibold">Cours</th>
                    <th className="w-[105px] px-3 py-3 text-right font-semibold">Source</th>
                    <SortableTh label="Valeur €" sortKey="value_eur" current={sortKey} direction={sortDirection} onSort={handleSort} align="right" className="w-[120px]" />
                    <SortableTh label="P&L €" sortKey="pnl_eur" current={sortKey} direction={sortDirection} onSort={handleSort} align="right" className="w-[115px]" />
                    <SortableTh label="Perf %" sortKey="pnl_pct" current={sortKey} direction={sortDirection} onSort={handleSort} align="right" className="w-[95px]" />
                    <SortableTh label="Poids" sortKey="portfolio_weight_pct" current={sortKey} direction={sortDirection} onSort={handleSort} align="right" className="w-[90px]" />
                    <SortableTh label="Compte %" sortKey="account_weight_pct" current={sortKey} direction={sortDirection} onSort={handleSort} align="right" className="w-[95px]" />
                    <SortableTh label="Data" sortKey="data_quality" current={sortKey} direction={sortDirection} onSort={handleSort} align="right" className="w-[95px]" />
                    <SortableTh label="MAJ" sortKey="updated_at" current={sortKey} direction={sortDirection} onSort={handleSort} align="right" className="w-[105px]" />
                    <th className="w-[120px] px-3 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedRows.map((row) => {
                    const pnlPositive = Number(row.pnl_eur || 0) >= 0
                    const key = row.position_id || `${row.account_name}-${row.ticker}`
                    const freshness = getFreshness(row.updated_at)
                    const action = getNexialAction(row)
                    const displayedPrice = row.live_price ?? row.broker_price

                    return (
                      <tr key={key} className="group border-b border-white/10 transition hover:bg-cyan-300/5">
                        <td
                          className="sticky left-0 z-10 max-w-[230px] bg-[#182441] px-3 py-3 text-white transition group-hover:bg-[#1b2d52]"
                          title={row.asset_name || row.ticker}
                        >
                          <div className="truncate font-semibold">{row.asset_name || row.ticker}</div>
                          <div className="truncate text-xs text-blue-200">
                            {row.sector || '—'} · {row.country || '—'}
                          </div>
                        </td>

                        <td
                          className="sticky left-[230px] z-10 max-w-[170px] truncate bg-[#182441] px-3 py-3 font-medium text-blue-100 transition group-hover:bg-[#1b2d52]"
                          title={row.account_name || ''}
                        >
                          {row.account_name || '—'}
                        </td>

                        <td className="px-3 py-3">
                          <BucketBadge bucket={row.asset_bucket || 'UNKNOWN'} />
                        </td>

                        <td className="px-3 py-3 text-blue-100">{row.account_type || '—'}</td>
                        <td className="px-3 py-3 text-blue-100">{row.broker_code || '—'}</td>
                        <td className="px-3 py-3 font-semibold text-cyan-300">{row.ticker}</td>
                        <td className="px-3 py-3 text-right text-blue-100">{num(row.quantity)}</td>
                        <td className="px-3 py-3 text-right text-blue-100">{money(row.pru, row.currency || 'EUR')}</td>
                        <td className="px-3 py-3 text-right text-blue-100">{money(displayedPrice, row.currency || 'EUR')}</td>

                        <td className="px-3 py-3 text-right">
                          <PriceSourceBadge source={row.price_source || 'UNKNOWN'} />
                        </td>

                        <td className="px-3 py-3 text-right font-semibold text-white">{eur(row.value_eur)}</td>

                        <td className={`px-3 py-3 text-right font-semibold ${pnlPositive ? 'text-emerald-300' : 'text-red-300'}`}>
                          {eur(row.pnl_eur)}
                        </td>

                        <td className={`px-3 py-3 text-right font-semibold ${Number(row.pnl_pct || 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                          {pct(row.pnl_pct)}
                        </td>

                        <td className="px-3 py-3 text-right text-blue-100">{pct(row.portfolio_weight_pct)}</td>
                        <td className="px-3 py-3 text-right text-blue-100">{pct(row.account_weight_pct)}</td>

                        <td className="px-3 py-3 text-right">
                          <DataBadge status={row.data_quality || 'UNKNOWN'} />
                        </td>

                        <td className="px-3 py-3 text-right">
                          <FreshnessBadge label={freshness.label} danger={freshness.danger} />
                        </td>

                        <td className="px-3 py-3 text-right">
                          <ActionBadge label={action.label} tone={action.tone} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-white/10 bg-white/5 px-5 py-2 text-xs text-blue-100">
              Astuce : fais défiler horizontalement le tableau pour voir toutes les colonnes. Les deux premières colonnes restent fixes.
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function MetricCard({
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
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-sm backdrop-blur">
      <p className="text-sm font-medium text-blue-200">{label}</p>
      <p
        className={`mt-2 text-xl font-semibold tracking-tight ${
          danger ? 'text-red-300' : positive ? 'text-emerald-300' : 'text-white'
        }`}
      >
        {value}
      </p>
      {subValue && <p className="mt-1 text-sm text-blue-200">{subValue}</p>}
    </div>
  )
}

function QuickButton({
  label,
  active,
  onClick,
  danger,
}: {
  label: string
  active: boolean
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? danger
            ? 'bg-red-400/20 text-red-100 ring-1 ring-red-300/30'
            : 'bg-cyan-300/20 text-cyan-100 ring-1 ring-cyan-300/30'
          : danger
            ? 'border border-red-300/30 bg-red-400/10 text-red-200 hover:bg-red-400/15'
            : 'border border-white/10 bg-white/10 text-blue-100 hover:bg-white/15'
      }`}
    >
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
      <span className="text-sm font-medium text-blue-100">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-[44px] w-full rounded-xl border border-white/10 bg-[#1d2b4c] px-4 text-white outline-none transition hover:border-cyan-300/40 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#1d2b4c] text-white">
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
        className={`inline-flex items-center gap-1 font-semibold transition hover:text-cyan-300 ${
          active ? 'text-cyan-300' : 'text-blue-100'
        }`}
      >
        {label}
        <span className="text-[10px]">{active ? (direction === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  )
}

function DataBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase()

  const className =
    normalized === 'OK'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : normalized.includes('FALLBACK') || normalized.includes('MISSING')
        ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
        : 'border-red-300/30 bg-red-400/10 text-red-200'

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {status}
    </span>
  )
}

function BucketBadge({ bucket }: { bucket: string }) {
  const normalized = bucket.toUpperCase()

  const className =
    normalized === 'ETF'
      ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
      : normalized === 'CRYPTO'
        ? 'border-violet-300/30 bg-violet-400/10 text-violet-200'
        : normalized === 'ACTION'
          ? 'border-blue-300/30 bg-blue-400/10 text-blue-100'
          : 'border-white/10 bg-white/10 text-blue-100'

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {bucket}
    </span>
  )
}

function PriceSourceBadge({ source }: { source: string }) {
  const normalized = source.toUpperCase()

  const className =
    normalized.includes('LIVE')
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : normalized.includes('BROKER')
        ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
        : normalized.includes('FALLBACK')
          ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
          : 'border-white/10 bg-white/10 text-blue-100'

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {source}
    </span>
  )
}

function FreshnessBadge({ label, danger }: { label: string; danger: boolean }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
        danger
          ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
          : 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      }`}
    >
      {label}
    </span>
  )
}

function ActionBadge({
  label,
  tone,
}: {
  label: string
  tone: 'hold' | 'watch' | 'buy' | 'reduce'
}) {
  const className =
    tone === 'buy'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : tone === 'reduce'
        ? 'border-orange-300/30 bg-orange-400/10 text-orange-200'
        : tone === 'watch'
          ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
          : 'border-white/10 bg-white/10 text-blue-100'

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}