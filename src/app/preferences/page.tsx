import { createClient } from '@supabase/supabase-js'
import PreferencesForm from '@/components/PreferencesForm'
import DeletePreferenceButton from '@/components/DeletePreferenceButton'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Preference = {
  id: string
  created_at: string
  account_scope: string
  asset_name: string
  ticker: string | null
  preference_type: string
  target_weight: number | null
  max_weight: number | null
  note: string | null
}

export default async function PreferencesPage() {
  const [{ data: prefData, error: prefError }, { data: assetsData, error: assetsError }] =
    await Promise.all([
      supabase
        .from('allocation_preferences_v1')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('vw_portfolio_positions_v1')
        .select('asset_name, ticker, account_name, account_type'),
    ])

  if (prefError || assetsError) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold mb-4">Erreur Supabase</h1>
        <pre>{JSON.stringify({ prefError, assetsError }, null, 2)}</pre>
      </main>
    )
  }

  const preferences = (prefData ?? []) as Preference[]
  const assets = dedupeAssets(assetsData ?? [])

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Préférences d’allocation</h1>
        <p className="text-gray-600">
          Définit les surpondérations, exclusions et cibles personnalisées par actif.
        </p>
      </div>

      <section className="rounded-xl border p-4 bg-white">
        <h2 className="font-semibold mb-4">Ajouter une préférence</h2>
        <PreferencesForm assets={assets} />
      </section>

      <section className="rounded-xl border p-4 bg-white">
        <h2 className="font-semibold mb-4">Préférences actives</h2>

        {preferences.length === 0 ? (
          <p className="text-gray-500">Aucune préférence enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Actif</th>
                  <th className="py-2">Ticker</th>
                  <th className="py-2">Scope</th>
                  <th className="py-2">Préférence</th>
                  <th className="py-2">Cible %</th>
                  <th className="py-2">Max %</th>
                  <th className="py-2">Note</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {preferences.map((p) => (
                  <tr key={p.id} className="border-b align-top">
                    <td className="py-2">{p.asset_name}</td>
                    <td className="py-2">{p.ticker ?? '-'}</td>
                    <td className="py-2">{p.account_scope}</td>
                    <td className="py-2">{p.preference_type}</td>
                    <td className="py-2">{formatNumber(p.target_weight, 2)}</td>
                    <td className="py-2">{formatNumber(p.max_weight, 2)}</td>
                    <td className="py-2 text-gray-700">{p.note ?? '-'}</td>
                    <td className="py-2">
                      <DeletePreferenceButton id={p.id} />
                    </td>
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

function dedupeAssets(rows: any[]) {
  const seen = new Set<string>()
  const output: any[] = []

  for (const row of rows) {
    const key = `${row.asset_name}|||${row.ticker ?? '-'}`
    if (seen.has(key)) continue
    seen.add(key)
    output.push(row)
  }

  return output.sort((a, b) => a.asset_name.localeCompare(b.asset_name))
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value == null) return '-'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}