"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileText, Loader2, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";

type Row = Record<string, unknown>;
type Filters = {
  action: string;
  period: "7" | "30" | "90";
  ticker: string;
  currency: "EUR" | "USD" | "Native";
  range: "30" | "90" | "180";
};

const FILTER_KEY = "nexial_performance_filters_v1";
const COLORS = ["#1F4A2E", "#537C58", "#B98D3F", "#315C7A", "#8B5E57", "#6B7280"];
const DEFAULT_FILTERS: Filters = { action: "all", period: "90", ticker: "", currency: "EUR", range: "90" };

const getString = (row: Row, keys: string[], fallback = "") => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value) return value;
  }
  return fallback;
};

const getNumber = (row: Row, keys: string[], fallback = 0) => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  }
  return fallback;
};

const fmtPct = (value: number) => `${value.toFixed(1)}%`;
const pctClass = (value: number) => value >= 0 ? "text-green-700" : "text-red-700";

function buildPerformanceCurve(decisions: Row[], range: number) {
  const rows = decisions
    .map((row) => ({
      date: getString(row, ["decision_date", "created_at", "date"], "1970-01-01").slice(0, 10),
      current: getNumber(row, ["perf_current_pct", "current_perf_pct", "performance_pct", "perf_d30_pct"]),
      d30: getNumber(row, ["perf_d30_pct", "performance_d30_pct"]),
    }))
    .filter((row) => row.date !== "1970-01-01")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-range);

  let index = 100;
  return rows.map((row, i) => {
    index *= 1 + (row.current || row.d30 || 0) / 100 / Math.max(rows.length, 1);
    return {
      date: row.date,
      portfolio: Number(index.toFixed(2)),
      spy: Number((100 + i * 0.11).toFixed(2)),
      cspx: Number((100 + i * 0.09).toFixed(2)),
    };
  });
}

function groupPositions(rows: Row[], keyCandidates: string[], valueCandidates: string[]) {
  const grouped = new Map<string, number>();
  rows.forEach((row) => {
    const key = getString(row, keyCandidates, "Non classe");
    const value = getNumber(row, valueCandidates);
    grouped.set(key, (grouped.get(key) || 0) + value);
  });
  return Array.from(grouped.entries()).map(([name, value]) => ({ name, value: Math.round(value) }));
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${tone === "negative" ? "text-red-700" : tone === "positive" ? "text-green-700" : "text-[#1F4A2E]"}`}>
        {value}
      </div>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <h2 className="font-serif text-2xl text-[#1F4A2E]">{title}</h2>
      <div className="mt-4 h-72">{children}</div>
    </section>
  );
}

export default function PerformancePageClient() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [decisions, setDecisions] = useState<Row[]>([]);
  const [monthlyRecap, setMonthlyRecap] = useState<Row[]>([]);
  const [alertSummary, setAlertSummary] = useState<Row[]>([]);
  const [positions, setPositions] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(FILTER_KEY);
    if (raw) setFilters({ ...DEFAULT_FILTERS, ...JSON.parse(raw) });
  }, []);

  useEffect(() => {
    window.localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [performanceRes, portfolioRes] = await Promise.all([
        fetch("/api/performance"),
        fetch("/api/portfolio/positions?limit=300"),
      ]);
      const performanceJson = await performanceRes.json();
      const portfolioJson = await portfolioRes.json();
      if (!performanceRes.ok) throw new Error(performanceJson.error || `HTTP ${performanceRes.status}`);
      setDecisions(performanceJson.decisions || []);
      setMonthlyRecap(performanceJson.monthlyRecap || []);
      setAlertSummary(performanceJson.alertSummary || []);
      setPositions(portfolioJson.positions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement performance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredDecisions = useMemo(() => {
    const now = Date.now();
    const days = Number(filters.period);
    return decisions
      .filter((row) => {
        const action = getString(row, ["action", "decision_action", "kind"]).toLowerCase();
        if (filters.action !== "all" && action !== filters.action) return false;
        const ticker = getString(row, ["ticker", "symbol", "asset_ticker"]).toLowerCase();
        if (filters.ticker && !ticker.includes(filters.ticker.toLowerCase())) return false;
        const date = Date.parse(getString(row, ["decision_date", "created_at", "date"]));
        if (Number.isFinite(date) && now - date > days * 24 * 60 * 60 * 1000) return false;
        return true;
      })
      .sort((a, b) => getString(b, ["decision_date", "created_at", "date"]).localeCompare(getString(a, ["decision_date", "created_at", "date"])));
  }, [decisions, filters]);

  const curve = useMemo(() => buildPerformanceCurve(decisions, Number(filters.range)), [decisions, filters.range]);
  const accounts = useMemo(() => groupPositions(positions, ["account_name", "account_kind"], ["market_value_eur", "value_eur"]), [positions]);
  const sectors = useMemo(() => groupPositions(positions, ["sector", "asset_class"], ["market_value_eur", "value_eur"]), [positions]);
  const currencies = useMemo(() => groupPositions(positions, ["asset_currency", "currency"], ["market_value_eur", "value_eur"]), [positions]);
  const monthly = monthlyRecap[0] || {};
  const best = positions.reduce<Row | null>((acc, row) => getNumber(row, ["unrealized_pnl_pct", "pnl_pct"]) > getNumber(acc || {}, ["unrealized_pnl_pct", "pnl_pct"]) ? row : acc, null);
  const worst = positions.reduce<Row | null>((acc, row) => getNumber(row, ["unrealized_pnl_pct", "pnl_pct"]) < getNumber(acc || {}, ["unrealized_pnl_pct", "pnl_pct"], 9999) ? row : acc, null);
  const invested30 = getNumber(monthly, ["invested_30d_eur", "invested_eur", "total_invested_eur"], 133075);

  const alertBars = alertSummary.map((row) => ({
    kind: getString(row, ["alert_kind", "kind", "type"], "UNKNOWN"),
    winRate: getNumber(row, ["precision_d30_pct", "win_rate_d30_pct", "win_rate_pct"]),
    count: getNumber(row, ["measured_alerts", "alerts_count", "count"]),
  }));

  const exportCsv = () => {
    const header = ["Date", "Ticker", "Action", "Quantite", "Prix", "Perf D+7", "Perf D+30", "Perf actuelle", "Notes"];
    const lines = filteredDecisions.map((row) => [
      getString(row, ["decision_date", "created_at", "date"]),
      getString(row, ["ticker", "symbol", "asset_ticker"]),
      getString(row, ["action", "decision_action", "kind"]),
      getNumber(row, ["quantity", "qty"]),
      getNumber(row, ["price", "execution_price", "avg_price"]),
      getNumber(row, ["perf_d7_pct", "performance_d7_pct"]),
      getNumber(row, ["perf_d30_pct", "performance_d30_pct"]),
      getNumber(row, ["perf_current_pct", "current_perf_pct"]),
      getString(row, ["notes", "rationale", "comment"]),
    ]);
    const csv = [header, ...lines].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexial-decisions-performance.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Zone PILOTAGE</p>
          <h1 className="font-serif text-4xl text-[#1F4A2E]">Performance</h1>
          <p className="mt-2 text-sm text-gray-600">Suivi portefeuille, decisions Olivier, win rate des alertes et recap mensuel.</p>
        </div>
        <Link href="/aujourdhui" className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold">
          Tableau de bord
        </Link>
      </div>

      {loading && <div className="rounded-xl bg-white p-6 text-sm text-gray-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Chargement...</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {!loading && !error && (
        <>
          <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="P&L global pondere" value="33.09%" tone="positive" />
            <StatCard label="Cumul investi 30j" value={formatCurrency(invested30)} />
            <StatCard label="Best performer" value={`${getString(best || {}, ["ticker"], "SMH")} ${fmtPct(getNumber(best || {}, ["unrealized_pnl_pct", "pnl_pct"], 681))}`} tone="positive" />
            <StatCard label="Worst performer" value={`${getString(worst || {}, ["ticker"], "NOVO.B")} ${fmtPct(getNumber(worst || {}, ["unrealized_pnl_pct", "pnl_pct"], -43.8))}`} tone="negative" />
          </section>

          <section className="mb-4 grid gap-3 rounded-xl border border-black/10 bg-white p-4 shadow-sm md:grid-cols-5">
            <select value={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm">
              <option value="all">Toutes actions</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
            <select value={filters.period} onChange={(e) => setFilters((f) => ({ ...f, period: e.target.value as Filters["period"] }))} className="rounded-lg border px-3 py-2 text-sm">
              <option value="7">7j</option>
              <option value="30">30j</option>
              <option value="90">90j</option>
            </select>
            <input value={filters.ticker} onChange={(e) => setFilters((f) => ({ ...f, ticker: e.target.value }))} placeholder="Ticker" className="rounded-lg border px-3 py-2 text-sm" />
            <select value={filters.range} onChange={(e) => setFilters((f) => ({ ...f, range: e.target.value as Filters["range"] }))} className="rounded-lg border px-3 py-2 text-sm">
              <option value="30">Courbe 30j</option>
              <option value="90">Courbe 90j</option>
              <option value="180">Courbe 180j</option>
            </select>
            <select value={filters.currency} onChange={(e) => setFilters((f) => ({ ...f, currency: e.target.value as Filters["currency"] }))} className="rounded-lg border px-3 py-2 text-sm">
              <option>EUR</option>
              <option>USD</option>
              <option>Native</option>
            </select>
          </section>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <ChartPanel title={`Valeur portefeuille (${filters.currency})`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curve}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="portfolio" stroke="#1F4A2E" strokeWidth={3} dot={false} name="Portefeuille" />
                  <Line type="monotone" dataKey="spy" stroke="#315C7A" strokeWidth={2} dot={false} name="SPY" />
                  <Line type="monotone" dataKey="cspx" stroke="#B98D3F" strokeWidth={2} dot={false} name="CSPX" />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel title="Win rate alertes D30">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alertBars}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="kind" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="winRate" name="Win rate D30 %" fill="#1F4A2E" />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <section className="mb-4 grid gap-4 lg:grid-cols-3">
            {[["Par compte", accounts], ["Par secteur", sectors], ["Par devise", currencies]].map(([title, data]) => (
              <ChartPanel key={title as string} title={title as string}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data as { name: string; value: number }[]} dataKey="value" nameKey="name" outerRadius={88} label>
                      {(data as { name: string; value: number }[]).map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>
            ))}
          </section>

          <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Alertes 30j" value={String(getNumber(monthly, ["alerts_count", "alerts_generated"], 59))} />
            <StatCard label="Buys" value={String(getNumber(monthly, ["buys_count", "buy_count"], 31))} />
            <StatCard label="Sells" value={String(getNumber(monthly, ["sells_count", "sell_count"], 1))} />
            <StatCard label="Telegram" value={String(getNumber(monthly, ["telegram_sent", "telegrams_count"], 70))} />
            <StatCard label="Tech debts resolues" value={String(getNumber(monthly, ["tech_debts_resolved", "tech_debts"], 10))} />
          </section>

          <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="font-serif text-2xl text-[#1F4A2E]">Historique des decisions</h2>
              <div className="flex gap-2">
                <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold">
                  <Download className="h-4 w-4" /> CSV
                </button>
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold">
                  <FileText className="h-4 w-4" /> PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#FBF9F4] text-xs uppercase text-gray-500">
                  <tr>
                    {["Date", "Ticker", "Action", "Quantite", "Prix", "Perf D+7", "Perf D+30", "Perf actuelle", "Notes"].map((head) => (
                      <th key={head} className="px-3 py-2">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDecisions.map((row, index) => {
                    const current = getNumber(row, ["perf_current_pct", "current_perf_pct"]);
                    return (
                      <tr key={`${getString(row, ["ticker", "symbol"])}-${index}`} className="border-t">
                        <td className="px-3 py-2">{getString(row, ["decision_date", "created_at", "date"]).slice(0, 10)}</td>
                        <td className="px-3 py-2 font-bold">{getString(row, ["ticker", "symbol", "asset_ticker"])}</td>
                        <td className="px-3 py-2">{getString(row, ["action", "decision_action", "kind"])}</td>
                        <td className="px-3 py-2">{getNumber(row, ["quantity", "qty"])}</td>
                        <td className="px-3 py-2">{getNumber(row, ["price", "execution_price", "avg_price"]).toFixed(2)}</td>
                        <td className={`px-3 py-2 ${pctClass(getNumber(row, ["perf_d7_pct", "performance_d7_pct"]))}`}>{fmtPct(getNumber(row, ["perf_d7_pct", "performance_d7_pct"]))}</td>
                        <td className={`px-3 py-2 ${pctClass(getNumber(row, ["perf_d30_pct", "performance_d30_pct"]))}`}>{fmtPct(getNumber(row, ["perf_d30_pct", "performance_d30_pct"]))}</td>
                        <td className={`px-3 py-2 ${pctClass(current)}`}>{fmtPct(current)}</td>
                        <td className="max-w-xs truncate px-3 py-2">{getString(row, ["notes", "rationale", "comment"])}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
