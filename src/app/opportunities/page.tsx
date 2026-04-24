import { createClient } from "@/lib/supabase/server";

type OpportunityRow = {
  asset_id: string;
  ticker: string;
  asset_name: string;
  account_name: string;
  account_type: string;
  market_value: number | string | null;
  portfolio_weight_pct: number | string | null;
  target_weight_pct: number | string | null;
  max_weight_pct: number | string | null;
  total_score_v2: number | string | null;
  capital_efficiency_score: number | string | null;
  expected_return_pct: number | string | null;
  opportunity_cost_gap: number | string | null;
  decision_v4: string | null;
  current_price: number | string | null;
  funding_need_amount: number | string | null;
  buy_zone: string | null;
  target_rank: number | string | null;
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

function formatNumber(
  value: number | string | null | undefined,
  digits = 2
): string {
  return toNumber(value).toFixed(digits);
}

export default async function OpportunitiesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vw_arbitrage_targets_ranked_v2")
    .select("*")
    .order("target_rank", { ascending: true });

  if (error) {
    return (
      <main className="p-6">
        <h1 className="mb-4 text-2xl font-bold text-red-600">
          Erreur chargement opportunités
        </h1>
        <pre className="overflow-x-auto rounded-xl border bg-white p-4 text-sm">
          {JSON.stringify(error, null, 2)}
        </pre>
      </main>
    );
  }

  const rows = (data ?? []) as OpportunityRow[];

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-2xl border bg-white p-6">
        <div className="mb-2 text-sm font-medium text-gray-500">Opportunités</div>
        <h1 className="text-3xl font-bold">Cibles prioritaires</h1>
        <p className="mt-2 text-sm text-gray-600">
          Classement des meilleures cibles d’allocation issues du moteur.
        </p>
      </section>

      <section className="rounded-2xl border bg-white p-6">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-600">
            Aucune opportunité classée pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="p-2">Rang</th>
                  <th className="p-2">Ticker</th>
                  <th className="p-2">Actif</th>
                  <th className="p-2">Compte</th>
                  <th className="p-2">Décision</th>
                  <th className="p-2">Buy zone</th>
                  <th className="p-2">Score</th>
                  <th className="p-2">Efficiency</th>
                  <th className="p-2">Retour attendu</th>
                  <th className="p-2">Besoin de financement</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.account_type}-${row.asset_id}`} className="border-b">
                    <td className="p-2 font-semibold">
                      {formatNumber(row.target_rank, 0)}
                    </td>
                    <td className="p-2 font-semibold">{row.ticker}</td>
                    <td className="p-2">{row.asset_name}</td>
                    <td className="p-2">{row.account_name}</td>
                    <td className="p-2">{row.decision_v4 ?? "-"}</td>
                    <td className="p-2">{row.buy_zone ?? "-"}</td>
                    <td className="p-2">{formatNumber(row.total_score_v2, 2)}</td>
                    <td className="p-2">
                      {formatNumber(row.capital_efficiency_score, 2)}
                    </td>
                    <td className="p-2">
                      {formatNumber(row.expected_return_pct, 2)} %
                    </td>
                    <td className="p-2 font-bold">
                      {formatCurrency(row.funding_need_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}