import { createClient } from "@/lib/supabase/server";

type AllocationRow = {
  account_id: string;
  account_name: string;
  account_type: string;
  etf_value: number | string | null;
  stock_value: number | string | null;
  other_value: number | string | null;
  cash_value: number | string | null;
  total_value: number | string | null;
};

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatCurrency(value: number | string | null | undefined): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)} %`;
}

export default async function AllocationPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vw_account_allocation_v1")
    .select("*")
    .order("account_type", { ascending: true });

  if (error) {
    return (
      <main className="p-6">
        <h1 className="mb-4 text-2xl font-bold text-red-600">
          Erreur chargement allocation
        </h1>
        <pre className="overflow-x-auto rounded-xl border bg-white p-4 text-sm">
          {JSON.stringify(error, null, 2)}
        </pre>
      </main>
    );
  }

  const rows = (data ?? []) as AllocationRow[];

  const totalPortfolio = rows.reduce(
    (sum, row) => sum + toNumber(row.total_value),
    0
  );

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-2xl border bg-white p-6">
        <div className="mb-2 text-sm font-medium text-gray-500">Allocation</div>
        <h1 className="text-3xl font-bold">Répartition du portefeuille</h1>
        <p className="mt-2 text-sm text-gray-600">
          Vue consolidée par compte : ETF, actions, autres actifs et cash.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <KpiCard title="Valeur totale" value={formatCurrency(totalPortfolio)} />
        <KpiCard title="Comptes suivis" value={String(rows.length)} />
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="p-2">Compte</th>
                <th className="p-2">Type</th>
                <th className="p-2">ETF</th>
                <th className="p-2">Actions</th>
                <th className="p-2">Autres</th>
                <th className="p-2">Cash</th>
                <th className="p-2">Total</th>
                <th className="p-2">Cash %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const total = toNumber(row.total_value);
                const cash = toNumber(row.cash_value);
                const cashPct = total > 0 ? (cash / total) * 100 : 0;

                return (
                  <tr key={row.account_id} className="border-b">
                    <td className="p-2 font-semibold">{row.account_name}</td>
                    <td className="p-2">{row.account_type}</td>
                    <td className="p-2">{formatCurrency(row.etf_value)}</td>
                    <td className="p-2">{formatCurrency(row.stock_value)}</td>
                    <td className="p-2">{formatCurrency(row.other_value)}</td>
                    <td className="p-2">{formatCurrency(row.cash_value)}</td>
                    <td className="p-2 font-bold">{formatCurrency(row.total_value)}</td>
                    <td className="p-2">{formatPercent(cashPct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function KpiCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}