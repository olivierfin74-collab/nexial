import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatPercent } from "@/lib/format";

type HeaderRow = {
  user_id: string;
  total_trades: number | null;
  total_alerts: number | null;
  executed_alerts: number | null;
  pnl_live: number | null;
  pnl_d1: number | null;
  pnl_d7: number | null;
  pnl_d30: number | null;
  win_live: number | null;
  win_d1: number | null;
  win_d7: number | null;
  win_d30: number | null;
  execution_rate: number | null;
  nexial_score: number | null;
};

type ActiveAlertRow = {
  id: string;
  user_id: string;
  account_id: string;
  account_type: string | null;
  buy_ticker: string | null;
  sell_ticker: string | null;
  confidence_level: string | null;
  current_price: number | null;
  buy_zone_low: number | null;
  buy_zone_high: number | null;
  alert_type: string | null;
  timing_signal: string | null;
  timing_message: string | null;
  target_quantity: number | null;
  target_buy_amount: number | null;
  created_at: string | null;
};

type RecentExecutionRow = {
  id: string;
  user_id: string;
  account_id: string;
  buy_ticker: string | null;
  sell_ticker: string | null;
  execution_price: number | null;
  price_last: number | null;
  pnl_abs: number | null;
  pnl_pct: number | null;
  pnl_d1_pct: number | null;
  pnl_d7_pct: number | null;
  pnl_d30_pct: number | null;
  execution_status: string | null;
  created_at: string | null;
};

type TopTickerRow = {
  user_id: string;
  buy_ticker: string | null;
  trade_count: number | null;
  avg_pnl_pct: number | null;
  total_pnl_abs: number | null;
};

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return Number(value).toFixed(digits);
}

function formatMoney(value: number | null | undefined, currency = "USD") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return formatCurrency(Number(value));
  }
}

function formatPct(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${Number(value).toFixed(2)}%`;
}

function pnlTone(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "text-neutral-500";
  }
  if (Number(value) > 0) return "text-emerald-600";
  if (Number(value) < 0) return "text-red-600";
  return "text-neutral-700";
}

function badgeClass(value: string | null | undefined) {
  const v = (value ?? "").toUpperCase();

  if (v.includes("HIGH")) return "bg-emerald-100 text-emerald-700";
  if (v.includes("BUY")) return "bg-emerald-100 text-emerald-700";
  if (v.includes("ACTIVE")) return "bg-blue-100 text-blue-700";
  if (v.includes("OPEN")) return "bg-blue-100 text-blue-700";
  if (v.includes("EXECUTED")) return "bg-emerald-100 text-emerald-700";
  if (v.includes("DISMISSED")) return "bg-neutral-200 text-neutral-700";
  if (v.includes("EXPIRED")) return "bg-amber-100 text-amber-700";

  return "bg-neutral-100 text-neutral-700";
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    headerRes,
    alertsRes,
    executionsRes,
    topTickersRes,
  ] = await Promise.all([
    supabase.from("vw_dashboard_nexial_header_v1").select("*").single<HeaderRow>(),
    supabase
      .from("vw_dashboard_active_alerts_v1")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<ActiveAlertRow[]>(),
    supabase
      .from("vw_dashboard_recent_executions_v1")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<RecentExecutionRow[]>(),
    supabase
      .from("vw_dashboard_top_tickers_v1")
      .select("*")
      .order("total_pnl_abs", { ascending: false })
      .limit(10)
      .returns<TopTickerRow[]>(),
  ]);

  if (headerRes.error) {
    throw new Error(`Erreur header dashboard: ${headerRes.error.message}`);
  }
  if (alertsRes.error) {
    throw new Error(`Erreur alertes dashboard: ${alertsRes.error.message}`);
  }
  if (executionsRes.error) {
    throw new Error(`Erreur exécutions dashboard: ${executionsRes.error.message}`);
  }
  if (topTickersRes.error) {
    throw new Error(`Erreur top tickers dashboard: ${topTickersRes.error.message}`);
  }

  const header = headerRes.data;
  const alerts = alertsRes.data ?? [];
  const executions = executionsRes.data ?? [];
  const topTickers = topTickersRes.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Nexial Dashboard</h1>
        <p className="mt-1 text-neutral-500">
          Alertes, exécutions et performance réelle du moteur
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <Card
          label="Nexial Score"
          value={formatNumber(header?.nexial_score, 2)}
          helper="qualité globale"
        />
        <Card
          label="Win Rate"
          value={formatPct(header?.win_live)}
          helper="trades live"
        />
        <Card
          label="PnL Live"
          value={formatPct(header?.pnl_live)}
          helper="performance moyenne"
        />
        <Card
          label="PnL J+1"
          value={formatPct(header?.pnl_d1)}
          helper="qualité du timing"
        />
        <Card
          label="Execution Rate"
          value={formatPct(header?.execution_rate)}
          helper="discipline"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">🔔 Alertes actives</h2>
            <span className="text-sm text-neutral-500">{alerts.length} active(s)</span>
          </div>

          {alerts.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Aucune alerte active pour le moment.
            </p>
          ) : (
            <div className="space-y-4">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className="rounded-2xl border border-neutral-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {a.buy_ticker ?? "—"}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass(
                            a.confidence_level
                          )}`}
                        >
                          {a.confidence_level ?? "—"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-neutral-500">
                        {a.sell_ticker
                          ? `Arbitrage depuis ${a.sell_ticker}`
                          : "Nouvelle opportunité"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass(
                        a.alert_type
                      )}`}
                    >
                      {a.alert_type ?? "—"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <MiniStat
                      label="Prix actuel"
                      value={formatMoney(a.current_price, "USD")}
                    />
                    <MiniStat
                      label="Zone d’achat"
                      value={
                        a.buy_zone_low !== null && a.buy_zone_high !== null
                          ? `${formatNumber(a.buy_zone_low, 2)} - ${formatNumber(
                              a.buy_zone_high,
                              2
                            )}`
                          : "—"
                      }
                    />
                    <MiniStat
                      label="Montant cible"
                      value={formatMoney(a.target_buy_amount, "USD")}
                    />
                    <MiniStat
                      label="Quantité cible"
                      value={a.target_quantity ?? "—"}
                    />
                  </div>

                  <div className="mt-4 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600">
                    {a.timing_message ?? "Aucun commentaire timing."}
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      disabled
                      className="rounded-xl bg-black px-4 py-2 text-sm text-white opacity-60"
                    >
                      EXECUTE
                    </button>
                    <button
                      disabled
                      className="rounded-xl border px-4 py-2 text-sm text-neutral-700 opacity-60"
                    >
                      DISMISS
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">📊 Vue rapide</h2>

          <div className="grid gap-3">
            <QuickCard
              label="Alertes totales"
              value={header?.total_alerts ?? 0}
            />
            <QuickCard
              label="Alertes exécutées"
              value={header?.executed_alerts ?? 0}
            />
            <QuickCard
              label="Trades suivis"
              value={header?.total_trades ?? 0}
            />
            <QuickCard
              label="Win rate J+1"
              value={formatPct(header?.win_d1)}
            />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">📈 Exécutions récentes</h2>
          <span className="text-sm text-neutral-500">{executions.length} ligne(s)</span>
        </div>

        {executions.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Aucune exécution enregistrée.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b text-left text-neutral-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Ticker</th>
                  <th className="pb-3 pr-4 font-medium">Entry</th>
                  <th className="pb-3 pr-4 font-medium">Dernier prix</th>
                  <th className="pb-3 pr-4 font-medium">PnL $</th>
                  <th className="pb-3 pr-4 font-medium">PnL %</th>
                  <th className="pb-3 pr-4 font-medium">PnL J+1</th>
                  <th className="pb-3 pr-4 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((e) => (
                  <tr key={e.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 font-medium">{e.buy_ticker ?? "—"}</td>
                    <td className="py-3 pr-4">
                      {formatMoney(e.execution_price, "USD")}
                    </td>
                    <td className="py-3 pr-4">
                      {formatMoney(e.price_last, "USD")}
                    </td>
                    <td className={`py-3 pr-4 ${pnlTone(e.pnl_abs)}`}>
                      {formatMoney(e.pnl_abs, "USD")}
                    </td>
                    <td className={`py-3 pr-4 ${pnlTone(e.pnl_pct)}`}>
                      {formatPct(e.pnl_pct)}
                    </td>
                    <td className={`py-3 pr-4 ${pnlTone(e.pnl_d1_pct)}`}>
                      {formatPct(e.pnl_d1_pct)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass(
                          e.execution_status
                        )}`}
                      >
                        {e.execution_status ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">🏆 Top idées exécutées</h2>
          <span className="text-sm text-neutral-500">{topTickers.length} ticker(s)</span>
        </div>

        {topTickers.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Aucun historique disponible.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b text-left text-neutral-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Ticker</th>
                  <th className="pb-3 pr-4 font-medium">Trades</th>
                  <th className="pb-3 pr-4 font-medium">Perf moyenne</th>
                  <th className="pb-3 pr-4 font-medium">PnL total</th>
                </tr>
              </thead>
              <tbody>
                {topTickers.map((t) => (
                  <tr key={t.buy_ticker ?? "unknown"} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 font-medium">{t.buy_ticker ?? "—"}</td>
                    <td className="py-3 pr-4">{t.trade_count ?? 0}</td>
                    <td className={`py-3 pr-4 ${pnlTone(t.avg_pnl_pct)}`}>
                      {formatPct(t.avg_pnl_pct)}
                    </td>
                    <td className={`py-3 pr-4 ${pnlTone(t.total_pnl_abs)}`}>
                      {formatMoney(t.total_pnl_abs, "USD")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Card({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {helper ? <div className="mt-1 text-xs text-neutral-400">{helper}</div> : null}
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function QuickCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border bg-neutral-50 p-4">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}