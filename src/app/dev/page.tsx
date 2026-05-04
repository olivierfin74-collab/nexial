'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Row = Record<string, any>

const supabase = createClient()

const TABLES = [
  { key: 'market', label: 'Market data', view: 'vw_market_data_health_v1' },
  { key: 'invest', label: 'Invest UI', view: 'vw_invest_ui_v1' },
  { key: 'watchlist', label: 'Watchlist events', view: 'vw_watchlist_actionable_events_v2' },
  { key: 'orders', label: 'Execution orders', view: 'execution_order_lines_v2' },
]

function valueToString(value: any) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(4)
  return String(value)
}

function statusColor(status?: string) {
  if (!status) return 'border-slate-600 bg-slate-800 text-slate-300'
  const s = status.toUpperCase()
  if (s.includes('FRESH') || s.includes('OK') || s.includes('READY')) {
    return 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
  }
  if (s.includes('WAIT') || s.includes('STALE') || s.includes('WARNING')) {
    return 'border-yellow-400/40 bg-yellow-400/10 text-yellow-200'
  }
  return 'border-red-400/40 bg-red-400/10 text-red-200'
}

export default function DevCenterPage() {
  const [active, setActive] = useState(TABLES[0])
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(view = active.view) {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.from(view).select('*').limit(100)

    if (error) {
      setError(error.message)
      setRows([])
    } else {
      setRows(data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    load(active.view)
  }, [active.view])

  const columns = useMemo(() => {
    const first = rows[0]
    return first ? Object.keys(first) : []
  }, [rows])

  const health = useMemo(() => {
    const freshnessAlerts = rows.filter((r) =>
      ['MISSING', 'EXPIRED', 'STALE'].includes(String(r.freshness_status ?? '').toUpperCase())
    ).length

    const blocked = rows.filter((r) =>
      String(r.decision ?? '').toUpperCase().includes('WAIT')
    ).length

    const ready = rows.filter((r) =>
      String(r.decision ?? '').toUpperCase().includes('READY')
    ).length

    return { freshnessAlerts, blocked, ready }
  }, [rows])

  return (
    <main className="min-h-screen bg-[#07111f] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[2rem] border border-cyan-400/20 bg-[#101d33] p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Nexial Dev Center</p>
          <h1 className="mt-3 text-5xl font-semibold">Control Center</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            Outils développeur : contrôle data, moteur décisionnel, watchlist, ordres et debug.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric title="Vue active" value={active.view} />
          <Metric title="Lignes" value={String(rows.length)} />
          <Metric title="Blocages WAIT" value={String(health.blocked)} />
          <Metric title="Alertes data" value={String(health.freshnessAlerts)} danger={health.freshnessAlerts > 0} />
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#101d33] p-5">
          <div className="flex flex-wrap gap-3">
            {TABLES.map((item) => (
              <button
                key={item.key}
                onClick={() => setActive(item)}
                className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                  active.key === item.key
                    ? 'border-cyan-300 bg-cyan-300/15 text-cyan-100'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}

            <button
              onClick={() => load()}
              className="ml-auto rounded-full border border-emerald-300/40 bg-emerald-400/10 px-5 py-2 text-sm font-semibold text-emerald-200"
            >
              Refresh
            </button>
          </div>
        </section>

        {error && (
          <section className="rounded-2xl border border-red-400/40 bg-red-400/10 p-5 text-red-200">
            Erreur : {error}
          </section>
        )}

        <section className="rounded-[2rem] border border-white/10 bg-[#101d33] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">{active.label}</h2>
              <p className="text-sm text-slate-400">{active.view}</p>
            </div>
            {loading && <span className="text-sm text-cyan-300">Chargement...</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-400">
                  {columns.map((col) => (
                    <th key={col} className="px-3 py-3 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-b border-white/5 hover:bg-white/[0.03]">
                    {columns.map((col) => {
                      const value = row[col]
                      const isStatus =
                        col.includes('status') ||
                        col.includes('quality') ||
                        col.includes('decision') ||
                        col.includes('severity')

                      return (
                        <td key={col} className="px-3 py-3 align-top text-slate-200">
                          {isStatus ? (
                            <span className={`rounded-full border px-3 py-1 text-xs ${statusColor(valueToString(value))}`}>
                              {valueToString(value)}
                            </span>
                          ) : (
                            <span>{valueToString(value)}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-8 text-slate-400" colSpan={Math.max(columns.length, 1)}>
                      Aucune ligne retournée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

function Metric({
  title,
  value,
  danger = false,
}: {
  title: string
  value: string
  danger?: boolean
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className={`mt-2 truncate text-2xl font-semibold ${danger ? 'text-red-300' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}