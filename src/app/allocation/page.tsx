'use client'

import { useEffect, useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

type AllocationRow = {
  account_name: string
  account_type: string
  broker_code: string | null
  etf_eur: number | null
  actions_eur: number | null
  crypto_eur: number | null
  cash_eur: number | null
  total_eur: number | null
  cash_pct: number | null
}

type PieItem = {
  name: string
  value: number
}

const COLORS = ['#38bdf8', '#22c55e', '#a78bfa', '#f59e0b', '#ef4444', '#14b8a6']

function n(value: number | null | undefined): number {
  return Number(value ?? 0)
}

function eur(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return '—'

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function pct(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(1)}%`
}

export default function AllocationPage() {
  const [rows, setRows] = useState<AllocationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('vw_allocation_by_account_v2')
        .select('*')
        .order('total_eur', { ascending: false })

      if (error) {
        setError(error.message)
        setRows([])
      } else {
        setRows((data ?? []) as AllocationRow[])
      }

      setLoading(false)
    }

    load()
  }, [])

  const totals = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + n(row.total_eur), 0)
    const etf = rows.reduce((sum, row) => sum + n(row.etf_eur), 0)
    const actions = rows.reduce((sum, row) => sum + n(row.actions_eur), 0)
    const crypto = rows.reduce((sum, row) => sum + n(row.crypto_eur), 0)
    const cash = rows.reduce((sum, row) => sum + n(row.cash_eur), 0)

    return { total, etf, actions, crypto, cash }
  }, [rows])

  const accountPie: PieItem[] = useMemo(
    () =>
      rows
        .map((row) => ({
          name: row.account_name,
          value: n(row.total_eur),
        }))
        .filter((item) => item.value > 0),
    [rows]
  )

  const bucketPie: PieItem[] = useMemo(
    () =>
      [
        { name: 'ETF', value: totals.etf },
        { name: 'Actions', value: totals.actions },
        { name: 'Crypto', value: totals.crypto },
        { name: 'Cash', value: totals.cash },
      ].filter((item) => item.value > 0),
    [totals]
  )

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Chargement allocation...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#172554_0,#020617_42%,#020617_100%)] px-8 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300">
            Nexial Allocation
          </p>

          <h1 className="mt-3 text-5xl font-semibold">
            Répartition du portefeuille
          </h1>

          <p className="mt-3 text-slate-300">
            Vue consolidée par compte, classe d’actifs et niveau de cash.
          </p>
        </header>

        {error && (
          <section className="rounded-[1.5rem] border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            Erreur Supabase : {error}
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <Card label="Valeur totale" value={eur(totals.total)} />
          <Card label="ETF" value={eur(totals.etf)} />
          <Card label="Actions" value={eur(totals.actions)} />
          <Card label="Cash" value={eur(totals.cash)} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Répartition par compte" data={accountPie} />
          <ChartCard title="Répartition par classe" data={bucketPie} />
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl">
          <h2 className="mb-5 text-2xl font-semibold">Détail par compte</h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-900/90 text-left text-slate-300">
                <tr>
                  <th className="px-4 py-4">Compte</th>
                  <th className="px-4 py-4">Type</th>
                  <th className="px-4 py-4 text-right">ETF</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                  <th className="px-4 py-4 text-right">Crypto</th>
                  <th className="px-4 py-4 text-right">Cash</th>
                  <th className="px-4 py-4 text-right">Total</th>
                  <th className="px-4 py-4 text-right">Cash %</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.account_name}-${row.account_type}`}
                    className="border-t border-white/10 hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-4 font-semibold">{row.account_name}</td>
                    <td className="px-4 py-4 text-slate-400">{row.account_type}</td>
                    <td className="px-4 py-4 text-right">{eur(row.etf_eur)}</td>
                    <td className="px-4 py-4 text-right">{eur(row.actions_eur)}</td>
                    <td className="px-4 py-4 text-right">{eur(row.crypto_eur)}</td>
                    <td className="px-4 py-4 text-right">{eur(row.cash_eur)}</td>
                    <td className="px-4 py-4 text-right font-semibold">
                      {eur(row.total_eur)}
                    </td>
                    <td className="px-4 py-4 text-right">{pct(row.cash_pct)}</td>
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

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-6 shadow-xl">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  )
}

function ChartCard({ title, data }: { title: string; data: PieItem[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl">
      <h2 className="text-xl font-semibold">{title}</h2>

      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={72}
              outerRadius={112}
              paddingAngle={3}
              stroke="rgba(255,255,255,0.15)"
            >
              {data.map((item, index) => (
                <Cell key={item.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>

            <Tooltip
              formatter={(value) => eur(Number(value))}
              contentStyle={{
                background: '#020617',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 16,
                color: '#fff',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 space-y-3">
        {data.map((item, index) => (
          <div key={item.name} className="flex justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-300">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              {item.name}
            </span>

            <span className="font-medium">
              {eur(item.value)} · {total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}