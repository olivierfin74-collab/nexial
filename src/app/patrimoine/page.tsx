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

const COLORS = ['#38bdf8', '#22c55e', '#a78bfa', '#f59e0b', '#ef4444', '#14b8a6']

type PatrimoineV2 = {
  positions_count: number
  patrimoine_total_eur: number
  invested_value_eur: number
  invested_pnl_eur: number
  performance_pct: number
  total_cash_eur: number
  pea_cash_eur: number
  cto_cash_eur: number
  pea_value_eur: number
  cto_value_eur: number
  pea_pnl_eur: number
  cto_pnl_eur: number
  active_orders_count: number
  engaged_capital_eur: number
  orders_to_confirm_count: number
  available_cash_after_orders_eur: number
  new_alerts: number
  active_alerts: number
  urgent_alerts: number
  nexial_global_status: string
  nexial_global_message: string
  calculated_at: string
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

function eur(v?: number | null, digits = 0) {
  if (v == null || Number.isNaN(Number(v))) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: digits,
  }).format(Number(v))
}

function num(v?: number | null) {
  if (v == null || Number.isNaN(Number(v))) return '—'
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(Number(v))
}

function pct(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)} %`
}

function weight(value: number, total: number) {
  if (!total) return '0.0 %'
  return `${((value / total) * 100).toFixed(1)} %`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function statusColor(status: string) {
  if (status === 'ACTION_REQUIRED') return 'text-red-300'
  if (status === 'CONFIRM_EXECUTION') return 'text-amber-300'
  if (status === 'ORDERS_ACTIVE') return 'text-cyan-300'
  if (status === 'CAPITAL_AVAILABLE') return 'text-emerald-300'
  return 'text-slate-300'
}

export default function PatrimoinePage() {
  const [patrimoine, setPatrimoine] = useState<PatrimoineV2 | null>(null)
  const [accounts, setAccounts] = useState<AccountTotal[]>([])
  const [cashDetails, setCashDetails] = useState<CashDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError(null)

    const [p, a, c] = await Promise.all([
      supabase.from('vw_patrimoine_global_v2').select('*').limit(1).maybeSingle(),
      supabase.from('vw_patrimoine_by_account_v1').select('*'),
      supabase.from('vw_patrimoine_cash_by_currency_v1').select('*'),
    ])

    if (p.error) setError(p.error.message)
    if (p.data) setPatrimoine(p.data as PatrimoineV2)

    if (a.data) setAccounts(a.data as AccountTotal[])
    if (c.data) setCashDetails(c.data as CashDetail[])

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    load(false)
  }, [])

  const accountPie = useMemo(() => {
    return accounts.map((a) => ({
      name: a.account_name,
      value: Number(a.total_eur || 0),
    }))
  }, [accounts])

  const cashPie = useMemo(() => {
    return accounts
      .map((a) => ({
        name: a.account_name,
        value: Number(a.cash_eur || 0),
      }))
      .filter((a) => a.value > 0)
  }, [accounts])

  const cashByCurrency = useMemo(() => {
    const map = new Map<string, number>()
    cashDetails.forEach((c) => {
      map.set(c.currency, (map.get(c.currency) || 0) + Number(c.cash_amount || 0))
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

  if (!patrimoine) {
    return (
      <main className="min-h-screen bg-[#050816] p-8 text-white">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <h1 className="text-3xl font-semibold">Aucune donnée patrimoine.</h1>
          {error && <p className="mt-4 text-red-300">{error}</p>}
        </div>
      </main>
    )
  }

  const totalGeneral = Number(patrimoine.patrimoine_total_eur || 0)

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
                Vue consolidée PEA, CTO, liquidités, performance, alertes et ordres engagés.
              </p>

              <button
                onClick={() => load(true)}
                disabled={refreshing}
                className="mt-6 rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
              >
                {refreshing ? 'Actualisation...' : 'Actualiser'}
              </button>
            </div>

            <div className="rounded-3xl border border-sky-400/20 bg-sky-400/10 px-6 py-5 text-right">
              <p className="text-sm text-sky-200">Patrimoine total</p>
              <p className="mt-1 text-5xl font-semibold">{eur(patrimoine.patrimoine_total_eur)}</p>
              <p className="mt-3 text-sm text-slate-400">
                MAJ {formatDate(patrimoine.calculated_at)}
              </p>
            </div>
          </div>
        </header>

        {error && (
          <section className="rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-200">
            {error}
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Investi" value={eur(patrimoine.invested_value_eur)} />
          <MetricCard label="Cash" value={eur(patrimoine.total_cash_eur)} positive />
          <MetricCard label="P&L investi" value={eur(patrimoine.invested_pnl_eur)} positive />
          <MetricCard label="Performance" value={pct(patrimoine.performance_pct)} positive />
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-sky-300">
              Statut Nexial
            </p>

            <h2 className={`mt-5 text-4xl font-semibold ${statusColor(patrimoine.nexial_global_status)}`}>
              {patrimoine.nexial_global_status}
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-300">
              {patrimoine.nexial_global_message}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Mini label="Alertes" value={String(patrimoine.active_alerts)} />
              <Mini label="Nouvelles" value={String(patrimoine.new_alerts)} />
              <Mini label="Urgentes" value={String(patrimoine.urgent_alerts)} warning={patrimoine.urgent_alerts > 0} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-sky-300">
              Capital disponible
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Mini label="Cash total" value={eur(patrimoine.total_cash_eur)} positive />
              <Mini label="Capital engagé" value={eur(patrimoine.engaged_capital_eur)} warning />
              <Mini label="Cash net" value={eur(patrimoine.available_cash_after_orders_eur)} positive />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Mini label="Ordres actifs" value={String(patrimoine.active_orders_count)} />
              <Mini label="À confirmer" value={String(patrimoine.orders_to_confirm_count)} warning={patrimoine.orders_to_confirm_count > 0} />
              <Mini label="Positions" value={String(patrimoine.positions_count)} />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Répartition par portefeuille" data={accountPie} />
          <ChartCard title="Cash par portefeuille" data={cashPie} />
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20">
          <h2 className="text-2xl font-semibold">Répartition PEA / CTO / Cash</h2>
          <p className="mt-1 text-sm text-slate-400">
            Vision utile pour piloter le risque, le cash et l’exposition globale.
          </p>

          <div className="mt-6 space-y-4">
            <AllocationLine
              label="PEA"
              value={patrimoine.pea_value_eur}
              pnl={patrimoine.pea_pnl_eur}
              total={patrimoine.patrimoine_total_eur}
            />
            <AllocationLine
              label="CTO"
              value={patrimoine.cto_value_eur}
              pnl={patrimoine.cto_pnl_eur}
              total={patrimoine.patrimoine_total_eur}
            />
            <AllocationLine
              label="Cash"
              value={patrimoine.total_cash_eur}
              pnl={0}
              total={patrimoine.patrimoine_total_eur}
            />
          </div>
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
              const accountWeight = totalGeneral ? (Number(a.total_eur || 0) / totalGeneral) * 100 : 0

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
                      <p className="text-sm text-slate-400">{accountWeight.toFixed(1)} %</p>
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(accountWeight, 100)}%`,
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

function MetricCard({
  label,
  value,
  positive = false,
  warning = false,
}: {
  label: string
  value: string
  positive?: boolean
  warning?: boolean
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-6 shadow-xl shadow-black/20 backdrop-blur">
      <p className="text-sm text-slate-400">{label}</p>
      <p
        className={`mt-2 text-3xl font-semibold tracking-tight ${
          positive ? 'text-emerald-300' : warning ? 'text-amber-300' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function Mini({
  label,
  value,
  positive = false,
  warning = false,
}: {
  label: string
  value: string
  positive?: boolean
  warning?: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p
        className={`mt-2 text-xl font-semibold ${
          positive ? 'text-emerald-300' : warning ? 'text-amber-300' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function AllocationLine({
  label,
  value,
  pnl,
  total,
}: {
  label: string
  value: number
  pnl: number
  total: number
}) {
  const allocationWeight = total > 0 ? (value / total) * 100 : 0

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-white">{label}</p>
          <p className={`mt-1 text-sm ${pnl >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
            {pnl === 0 ? '—' : eur(pnl)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xl font-semibold text-white">{eur(value)}</p>
          <p className="text-sm text-slate-500">{allocationWeight.toFixed(1)} %</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-sky-300"
          style={{ width: `${Math.min(Math.max(allocationWeight, 0), 100)}%` }}
        />
      </div>
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
              <p className="text-xs text-slate-500">{weight(item.value, total)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}