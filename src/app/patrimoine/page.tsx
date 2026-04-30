'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

type Total = {
  total_positions_eur: number
  total_cash_eur: number
  total_general_eur: number
}

type AccountTotal = {
  account_name: string
  account_type: string | null
  positions_eur: number
  cash_eur: number
  total_eur: number
}

type CashDetail = {
  currency: string
  account_name: string
  broker_code: string
  account_type: string
  cash_amount: number
}

const COLORS = ['#38bdf8', '#22c55e', '#a78bfa', '#f59e0b', '#ef4444', '#14b8a6']

function eur(v?: number | null) {
  if (v == null) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(v)
}

function num(v?: number | null) {
  if (v == null) return '—'
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(v)
}

function pct(value: number, total: number) {
  if (!total) return '0%'
  return `${((value / total) * 100).toFixed(1)}%`
}

export default function PatrimoinePage() {
  const [total, setTotal] = useState<Total | null>(null)
  const [accounts, setAccounts] = useState<AccountTotal[]>([])
  const [cashDetails, setCashDetails] = useState<CashDetail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [t, a, c] = await Promise.all([
        supabase.from('vw_patrimoine_total_general_eur_v1').select('*').single(),
        supabase.from('vw_patrimoine_by_account_v1').select('*'),
        supabase.from('vw_patrimoine_cash_by_currency_v1').select('*'),
      ])

      if (t.data) setTotal(t.data)
      if (a.data) setAccounts(a.data)
      if (c.data) setCashDetails(c.data)

      setLoading(false)
    }

    load()
  }, [])

  const totalGeneral = Number(total?.total_general_eur || 0)

  const accountPie = accounts.map((a) => ({
    name: a.account_name,
    value: Number(a.total_eur || 0),
  }))

  const cashPie = accounts
    .map((a) => ({
      name: a.account_name,
      value: Number(a.cash_eur || 0),
    }))
    .filter((a) => a.value > 0)

  const cashByCurrency = useMemo(() => {
    const map = new Map<string, number>()
    cashDetails.forEach((c) => {
      map.set(c.currency, (map.get(c.currency) || 0) + Number(c.cash_amount))
    })
    return Array.from(map.entries()).map(([currency, amount]) => ({
      currency,
      amount,
    }))
  }, [cashDetails])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050816] p-8 text-white">
        Chargement du patrimoine...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#172554_0,#020617_38%,#020617_100%)] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-300">
                Nexial Wealth Hub
              </p>
              <h1 className="mt-3 text-5xl font-semibold tracking-tight">
                Patrimoine
              </h1>
              <p className="mt-3 max-w-2xl text-slate-300">
                Vue consolidée PEA, CTO, crypto et liquidités. Objectif : savoir exactement où se trouve le capital.
              </p>
            </div>

            <div className="rounded-3xl border border-sky-400/20 bg-sky-400/10 px-6 py-5 text-right">
              <p className="text-sm text-sky-200">Total général</p>
              <p className="mt-1 text-4xl font-semibold">{eur(total?.total_general_eur)}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Positions" value={eur(total?.total_positions_eur)} />
          <MetricCard label="Cash converti EUR" value={eur(total?.total_cash_eur)} />
          <MetricCard
            label="Poids cash"
            value={pct(Number(total?.total_cash_eur || 0), totalGeneral)}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Répartition par portefeuille" data={accountPie} />
          <ChartCard title="Cash par portefeuille" data={cashPie} />
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Portefeuilles</h2>
              <p className="mt-1 text-sm text-slate-400">Positions + cash convertis en EUR</p>
            </div>
          </div>

          <div className="space-y-4">
            {accounts.map((a, index) => {
              const weight = totalGeneral ? (Number(a.total_eur || 0) / totalGeneral) * 100 : 0

              return (
                <div
                  key={a.account_name}
                  className="rounded-3xl border border-white/10 bg-slate-950/60 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <p className="text-lg font-semibold">{a.account_name}</p>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{a.account_type || 'Compte'}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-semibold">{eur(a.total_eur)}</p>
                      <p className="text-sm text-slate-400">{weight.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(weight, 100)}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                    <div className="rounded-2xl bg-white/[0.03] p-3">
                      Positions : <span className="font-medium text-white">{eur(a.positions_eur)}</span>
                    </div>
                    <div className="rounded-2xl bg-white/[0.03] p-3">
                      Cash : <span className="font-medium text-white">{eur(a.cash_eur)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20">
          <h2 className="text-2xl font-semibold">Cash par devise</h2>
          <p className="mt-1 text-sm text-slate-400">
            Totaux natifs par monnaie, avec détail par compte.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {cashByCurrency.map((c) => {
              const details = cashDetails.filter((d) => d.currency === c.currency)

              return (
                <div key={c.currency} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Devise</p>
                      <p className="mt-1 text-2xl font-semibold">{c.currency}</p>
                    </div>
                    <p className="text-2xl font-semibold">{num(c.amount)}</p>
                  </div>

                  <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
                    {details.map((d) => (
                      <div key={`${d.currency}-${d.account_name}`} className="flex justify-between gap-4 text-sm">
                        <span className="text-slate-400">{d.account_name}</span>
                        <span className="font-medium">{num(d.cash_amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-6 shadow-xl shadow-black/20 backdrop-blur">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}

function ChartCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20">
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
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-slate-300">{item.name}</span>
            </div>
            <div className="text-right">
              <p className="font-medium">{eur(item.value)}</p>
              <p className="text-xs text-slate-500">{pct(item.value, total)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}