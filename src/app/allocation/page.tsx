'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

type Row = {
  account_name: string
  account_type: string
  broker_code: string
  etf_eur: number
  actions_eur: number
  crypto_eur: number
  cash_eur: number
  total_eur: number
  cash_pct: number
}

const COLORS = ['#38bdf8', '#22c55e', '#a78bfa', '#f59e0b', '#ef4444', '#14b8a6']

function eur(v?: number | null) {
  if (v == null) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v)
}

function pct(v?: number | null) {
  if (v == null) return '—'
  return `${v.toFixed(1)}%`
}

export default function AllocationPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('vw_allocation_by_account_v2')
        .select('*')
        .order('total_eur', { ascending: false })

      setRows((data || []) as Row[])
      setLoading(false)
    }

    load()
  }, [])

  const total = rows.reduce((s, r) => s + Number(r.total_eur || 0), 0)
  const totalEtf = rows.reduce((s, r) => s + Number(r.etf_eur || 0), 0)
  const totalActions = rows.reduce((s, r) => s + Number(r.actions_eur || 0), 0)
  const totalCrypto = rows.reduce((s, r) => s + Number(r.crypto_eur || 0), 0)
  const totalCash = rows.reduce((s, r) => s + Number(r.cash_eur || 0), 0)

  const accountPie = rows.map((r) => ({
    name: r.account_name,
    value: Number(r.total_eur || 0),
  }))

  const bucketPie = [
    { name: 'ETF', value: totalEtf },
    { name: 'Actions', value: totalActions },
    { name: 'Crypto', value: totalCrypto },
    { name: 'Cash', value: totalCash },
  ].filter((x) => x.value > 0)

  if (loading) {
    return <main className="min-h-screen bg-slate-950 p-8 text-white">Chargement allocation...</main>
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#172554_0,#020617_42%,#020617_100%)] px-8 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Nexial Allocation</p>
          <h1 className="mt-3 text-5xl font-semibold">Répartition du portefeuille</h1>
          <p className="mt-3 text-slate-300">
            Vue consolidée par compte, classe d’actifs et niveau de cash.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Card label="Valeur totale" value={eur(total)} />
          <Card label="ETF" value={eur(totalEtf)} />
          <Card label="Actions" value={eur(totalActions)} />
          <Card label="Cash" value={eur(totalCash)} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Répartition par compte" data={accountPie} />
          <ChartCard title="Répartition par classe" data={bucketPie} />
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl">
          <h2 className="mb-5 text-2xl font-semibold">Détail par compte</h2>

          <table className="w-full text-sm">
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
              {rows.map((r) => (
                <tr key={r.account_name} className="border-t border-white/10 hover:bg-white/[0.03]">
                  <td className="px-4 py-4 font-semibold">{r.account_name}</td>
                  <td className="px-4 py-4 text-slate-400">{r.account_type}</td>
                  <td className="px-4 py-4 text-right">{eur(r.etf_eur)}</td>
                  <td className="px-4 py-4 text-right">{eur(r.actions_eur)}</td>
                  <td className="px-4 py-4 text-right">{eur(r.crypto_eur)}</td>
                  <td className="px-4 py-4 text-right">{eur(r.cash_eur)}</td>
                  <td className="px-4 py-4 text-right font-semibold">{eur(r.total_eur)}</td>
                  <td className="px-4 py-4 text-right">{pct(r.cash_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

function ChartCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const total = data.reduce((s, x) => s + x.value, 0)

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
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => eur(value)}
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
        {data.map((item, i) => (
          <div key={item.name} className="flex justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              {item.name}
            </span>
            <span className="font-medium">
              {eur(item.value)} · {total ? ((item.value / total) * 100).toFixed(1) : '0'}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}