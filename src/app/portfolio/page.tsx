import { createClient } from '@supabase/supabase-js'
import { applyAccountFilters, uniqueValues } from '@/lib/filters/accountFilters'
import { getLatestDate, formatFreshness } from '@/lib/freshness/dataFreshness'
import AccountFilters from '@/components/AccountFilters'
import FreshnessBanner from '@/components/FreshnessBanner'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type SearchParams = Promise<{
  type?: string
  broker?: string
  account?: string
}>

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams

  const { data, error } = await supabase
    .from('vw_portfolio_positions_v1')
    .select('*')
    .order('account_name', { ascending: true })

  if (error) {
    return <pre>{JSON.stringify(error, null, 2)}</pre>
  }

  const allRows = data ?? []
  const rows = applyAccountFilters(allRows, {
    type: params.type,
    broker: params.broker,
    account: params.account,
  })

  const accountTypes = uniqueValues(allRows, 'account_type')
  const brokers = uniqueValues(allRows, 'broker_code')
  const accounts = uniqueValues(allRows, 'account_name')

  const portfolioUpdatedAt = formatFreshness(
    getLatestDate(rows, 'last_portfolio_sync_at')
  )
  const marketUpdatedAt = formatFreshness(
    getLatestDate(rows, 'price_timestamp')
  )

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Portefeuille</h1>
        <p className="text-gray-600">Vue détaillée des positions filtrables</p>
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

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 border-b">Compte</th>
              <th className="text-left p-3 border-b">Type</th>
              <th className="text-left p-3 border-b">Broker</th>
              <th className="text-left p-3 border-b">Actif</th>
              <th className="text-left p-3 border-b">Ticker</th>
              <th className="text-right p-3 border-b">Qté</th>
              <th className="text-right p-3 border-b">PRU</th>
              <th className="text-right p-3 border-b">Cours</th>
              <th className="text-right p-3 border-b">Valeur</th>
              <th className="text-right p-3 border-b">Perf €</th>
              <th className="text-right p-3 border-b">Perf %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => {
              const positive = (row.unrealized_pnl ?? 0) >= 0
              return (
                <tr key={row.position_id}>
                  <td className="p-3 border-b">{row.account_name}</td>
                  <td className="p-3 border-b">{row.account_type}</td>
                  <td className="p-3 border-b">{row.broker_code}</td>
                  <td className="p-3 border-b">{row.asset_name}</td>
                  <td className="p-3 border-b">{row.ticker ?? '-'}</td>
                  <td className="p-3 border-b text-right">{formatNumber(row.quantity, 2)}</td>
                  <td className="p-3 border-b text-right">{formatNumber(row.avg_cost, 2)}</td>
                  <td className="p-3 border-b text-right">{formatNumber(row.current_price, 2)}</td>
                  <td className="p-3 border-b text-right">{formatNumber(row.market_value, 2)}</td>
                  <td className={`p-3 border-b text-right font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
                    {formatNumber(row.unrealized_pnl, 2)}
                  </td>
                  <td className={`p-3 border-b text-right font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
                    {row.unrealized_pnl_pct == null ? '-' : `${formatNumber(row.unrealized_pnl_pct, 2)} %`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value == null) return '-'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}