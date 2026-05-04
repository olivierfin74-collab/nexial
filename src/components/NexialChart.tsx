'use client'

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type CurveRow = {
  quoted_at: string
  nexial_index: number
  market_index: number
  alpha_vs_market: number
}

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    })
  } catch {
    return date
  }
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null

  const row = payload[0].payload as CurveRow

  return (
    <div className="rounded-xl border border-white/10 bg-[#07111f] p-3 text-sm text-white shadow-2xl">
      <div className="mb-1 font-semibold">{formatDate(row.quoted_at)}</div>
      <div className="text-cyan-300">
        Nexial : {Number(row.nexial_index).toFixed(2)}
      </div>
      <div className="text-slate-300">
        Marché : {Number(row.market_index).toFixed(2)}
      </div>
      <div className="font-medium text-emerald-300">
        Alpha : {Number(row.alpha_vs_market).toFixed(2)}
      </div>
    </div>
  )
}

export default function NexialChart({ data }: { data: CurveRow[] }) {
  return (
    <div className="h-[420px] min-h-[420px] w-full min-w-0 overflow-hidden rounded-[1.5rem]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={data} margin={{ top: 12, right: 24, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />

          <XAxis
            dataKey="quoted_at"
            tickFormatter={formatDate}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            tickLine={{ stroke: 'rgba(255,255,255,0.12)' }}
          />

          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            tickLine={{ stroke: 'rgba(255,255,255,0.12)' }}
          />

          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />

          <Line
            type="monotone"
            dataKey="nexial_index"
            stroke="#22d3ee"
            strokeWidth={3}
            dot={false}
            name="Nexial"
          />

          <Line
            type="monotone"
            dataKey="market_index"
            stroke="#94a3b8"
            strokeWidth={2}
            dot={false}
            name="Marché"
          />

          <Line
            type="monotone"
            dataKey="alpha_vs_market"
            stroke="#34d399"
            strokeWidth={2}
            dot={false}
            name="Alpha"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}