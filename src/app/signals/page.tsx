import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type SignalLog = {
  id: string
  logged_at: string
  asset_name: string
  ticker: string | null
  signal_type: string
  signal_strength: string | null
  signal_value: number | null
  score: number | null
  weight_pct: number | null
  market_value: number | null
  current_price: number | null
  rationale: string | null
  source: string
}

export default async function SignalsPage() {
  const { data, error } = await supabase
    .from('signal_logs_v1')
    .select('*')
    .order('logged_at', { ascending: false })

  if (error) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold mb-4">Erreur Supabase</h1>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </main>
    )
  }

  const logs = (data ?? []) as SignalLog[]

  const totalSignals = logs.length
  const overweightCount = logs.filter((l) => l.signal_type === 'OVERWEIGHT').length
  const pullbackCount = logs.filter((l) => l.signal_type === 'PULLBACK').length
  const weakCount = logs.filter((l) => l.signal_type === 'WEAK_ASSET').length

  const avgScore =
    logs.length > 0
      ? logs.reduce((sum, l) => sum + (l.score ?? 0), 0) / logs.length
      : 0

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Historique des signaux</h1>
        <p className="text-gray-600">
          Journal des signaux enregistrés pour analyse et mesure de performance
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard title="Nb signaux" value={String(totalSignals)} />
        <KpiCard title="OVERWEIGHT" value={String(overweightCount)} />
        <KpiCard title="PULLBACK" value={String(pullbackCount)} />
        <KpiCard title="WEAK_ASSET" value={String(weakCount)} />
        <KpiCard title="Score moyen" value={formatNumber(avgScore, 2)} />
      </div>

      <section className="rounded-xl border p-4 bg-white">
        <h2 className="font-semibold mb-4">Journal détaillé</h2>

        {logs.length === 0 ? (
          <p className="text-gray-500">Aucun signal enregistré pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Date</th>
                  <th className="py-2">Actif</th>
                  <th className="py-2">Ticker</th>
                  <th className="py-2">Signal</th>
                  <th className="py-2">Force</th>
                  <th className="py-2">Valeur</th>
                  <th className="py-2">Score</th>
                  <th className="py-2">Poids %</th>
                  <th className="py-2">Prix</th>
                  <th className="py-2">Rationale</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b align-top">
                    <td className="py-2 whitespace-nowrap">
                      {formatDate(log.logged_at)}
                    </td>
                    <td className="py-2">{log.asset_name}</td>
                    <td className="py-2">{log.ticker ?? '-'}</td>
                    <td className="py-2">
                      <SignalBadge signal={log.signal_type} />
                    </td>
                    <td className="py-2">{log.signal_strength ?? '-'}</td>
                    <td className="py-2">{formatNumber(log.signal_value, 2)}</td>
                    <td className="py-2">{formatNumber(log.score, 2)}</td>
                    <td className="py-2">{formatNumber(log.weight_pct, 2)}</td>
                    <td className="py-2">{formatNumber(log.current_price, 2)}</td>
                    <td className="py-2 text-gray-700">{log.rationale ?? '-'}</td>
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

function SignalBadge({ signal }: { signal: string }) {
  const classes =
    signal === 'OVERWEIGHT'
      ? 'bg-red-100 text-red-700'
      : signal === 'PULLBACK'
      ? 'bg-blue-100 text-blue-700'
      : signal === 'FAST_DROP'
      ? 'bg-orange-100 text-orange-700'
      : signal === 'UNDERWEIGHT_OPPORTUNITY'
      ? 'bg-green-100 text-green-700'
      : signal === 'WEAK_ASSET'
      ? 'bg-gray-200 text-gray-700'
      : 'bg-slate-100 text-slate-700'

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium ${classes}`}>
      {signal}
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

function formatDate(value: string) {
  return new Date(value).toLocaleString('fr-FR')
}