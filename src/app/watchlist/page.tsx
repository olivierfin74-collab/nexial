import { createClient } from '@supabase/supabase-js'
import { applyAccountFilters, uniqueValues } from '@/lib/filters/accountFilters'
import { getLatestDate, formatFreshness } from '@/lib/freshness/dataFreshness'
import { buildWatchlistView } from '@/lib/engine/watchlistEngine'
import AccountFilters from '@/components/AccountFilters'
import FreshnessBanner from '@/components/FreshnessBanner'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type SearchParams = Promise<{
  scope?: string
  type?: string
  broker?: string
  account?: string
}>

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const scope = params.scope ?? 'ALL'

  const [{ data: watchlistData, error: watchlistError }, { data: marketData, error: marketError }] =
    await Promise.all([
      supabase.from('watchlist_manual_v1').select('*').order('priority_score', { ascending: false }),
      supabase.from('vw_portfolio_positions_v1').select('*'),
    ])

  if (watchlistError || marketError) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold mb-4">Erreur Supabase</h1>
        <pre>{JSON.stringify({ watchlistError, marketError }, null, 2)}</pre>
      </main>
    )
  }

  const allMarketRows = marketData ?? []
  const marketRows = applyAccountFilters(allMarketRows, {
    type: params.type,
    broker: params.broker,
    account: params.account,
  })

  const accountTypes = uniqueValues(allMarketRows, 'account_type')
  const brokers = uniqueValues(allMarketRows, 'broker_code')
  const accounts = uniqueValues(allMarketRows, 'account_name')

  const portfolioUpdatedAt = formatFreshness(
    getLatestDate(marketRows, 'last_portfolio_sync_at')
  )
  const marketUpdatedAt = formatFreshness(
    getLatestDate(marketRows, 'price_timestamp')
  )

  const scoredMarketRows = marketRows.map((p: any) => ({
    asset_name: p.asset_name,
    ticker: p.ticker,
    current_price: p.current_price,
    score: deriveScore(p),
    account_name: p.account_name,
    account_type: p.account_type,
  }))

  const rows = buildWatchlistView(watchlistData ?? [], scoredMarketRows).filter((row) => {
    if (scope === 'ALL') return true
    return row.account_scope === scope
  })

  const inZone = rows.filter((r) => r.status === 'EN ZONE').length
  const nearZone = rows.filter((r) => r.status.startsWith('PROCHE')).length
  const avgPriority =
    rows.length > 0
      ? rows.reduce((sum, r) => sum + (r.priority_score ?? 0), 0) / rows.length
      : 0

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Watchlist</h1>
        <p className="text-gray-600">
          Suivi des actifs sélectionnés avec zones d’achat et filtres PEA / CTO
        </p>
      </div>

      <AccountFilters
        accountTypes={accountTypes}
        brokers={brokers}
        accounts={accounts}
      />

      <FreshnessBanner
        portfolioUpdatedAt={portfolioUpdatedAt}
        marketUpdatedAt={marketUpdatedAt}
      />

      <form method="GET" className="flex gap-4 flex-wrap">
        <input type="hidden" name="type" value={params.type ?? ''} />
        <input type="hidden" name="broker" value={params.broker ?? ''} />
        <input type="hidden" name="account" value={params.account ?? ''} />

        <select
          name="scope"
          defaultValue={scope}
          className="border rounded-lg px-3 py-2 bg-white"
        >
          <option value="ALL">Tous</option>
          <option value="PEA">PEA</option>
          <option value="CTO">CTO</option>
          <option value="AUTO">Auto</option>
        </select>

        <button className="border rounded-lg px-4 py-2 bg-white hover:bg-gray-50">
          Filtrer
        </button>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Nb actifs" value={String(rows.length)} />
        <KpiCard title="En zone" value={String(inZone)} />
        <KpiCard title="Proches zone" value={String(nearZone)} />
        <KpiCard title="Priorité moyenne" value={formatNumber(avgPriority, 2)} />
      </div>

      <section className="rounded-xl border p-4 bg-white">
        <h2 className="font-semibold mb-4">Suivi watchlist</h2>

        {rows.length === 0 ? (
          <p className="text-gray-500">Aucun actif dans la watchlist pour ce filtre.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Actif</th>
                  <th className="py-2">Ticker</th>
                  <th className="py-2">Scope</th>
                  <th className="py-2">Cours</th>
                  <th className="py-2">Z1</th>
                  <th className="py-2">Z2</th>
                  <th className="py-2">Z3</th>
                  <th className="py-2">Dist. Z1</th>
                  <th className="py-2">Dist. Z2</th>
                  <th className="py-2">Dist. Z3</th>
                  <th className="py-2">Score</th>
                  <th className="py-2">Priorité</th>
                  <th className="py-2">Statut</th>
                  <th className="py-2">Thèse</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b align-top">
                    <td className="py-2">{row.asset_name}</td>
                    <td className="py-2">{row.ticker}</td>
                    <td className="py-2">{row.account_scope}</td>
                    <td className="py-2">{formatNumber(row.current_price, 2)}</td>
                    <td className="py-2">{formatNumber(row.z1_price, 2)}</td>
                    <td className="py-2">{formatNumber(row.z2_price, 2)}</td>
                    <td className="py-2">{formatNumber(row.z3_price, 2)}</td>
                    <td className="py-2">{formatPercent(row.dist_z1_pct)}</td>
                    <td className="py-2">{formatPercent(row.dist_z2_pct)}</td>
                    <td className="py-2">{formatPercent(row.dist_z3_pct)}</td>
                    <td className="py-2">{formatNumber(row.score, 2)}</td>
                    <td className="py-2">{formatNumber(row.priority_score, 2)}</td>
                    <td className="py-2">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="py-2 text-gray-700">{row.thesis ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

function deriveScore(p: any) {
  const momentum = p.unrealized_pnl_pct ?? 0
  const quality = p.asset_type === 'ETF' ? 8 : 7
  const valuation = momentum > 20 ? 4 : 7
  const growth = momentum > 10 ? 8 : 6
  return (quality + growth + valuation + momentum / 5) / 4
}

function KpiCard({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <div className="rounded-xl border p-4 bg-white">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === 'EN ZONE'
      ? 'bg-green-100 text-green-700'
      : status.includes('PROCHE')
      ? 'bg-orange-100 text-orange-700'
      : status === 'LOIN'
      ? 'bg-gray-100 text-gray-700'
      : 'bg-slate-100 text-slate-700'

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium ${classes}`}>
      {status}
    </span>
  )
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value == null) return '-'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return '-'
  return `${formatNumber(value, 2)} %`
}