'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type CurveRow = {
  quoted_at: string;
  nexial_index: number;
  market_index: number;
  alpha_vs_market: number;
};

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return date;
  }
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0].payload;

  return (
    <div className="rounded-xl border bg-white p-3 text-sm shadow">
      <div className="mb-1 font-semibold">{formatDate(row.quoted_at)}</div>
      <div className="text-indigo-600">
        Nexial : {Number(row.nexial_index).toFixed(2)}
      </div>
      <div className="text-gray-600">
        Marché : {Number(row.market_index).toFixed(2)}
      </div>
      <div className="font-medium text-emerald-600">
        Alpha : {Number(row.alpha_vs_market).toFixed(2)}
      </div>
    </div>
  );
}

export default function NexialChart({ data }: { data: CurveRow[] }) {
  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="quoted_at"
            tickFormatter={formatDate}
            tick={{ fontSize: 12 }}
          />

          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />

          <Tooltip content={<CustomTooltip />} />
          <Legend />

          <Line
            type="monotone"
            dataKey="nexial_index"
            stroke="#4f46e5"
            strokeWidth={3}
            dot={false}
            name="Nexial"
          />

          <Line
            type="monotone"
            dataKey="market_index"
            stroke="#9ca3af"
            strokeWidth={2}
            dot={false}
            name="Marché"
          />

          <Line
            type="monotone"
            dataKey="alpha_vs_market"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="Alpha"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}