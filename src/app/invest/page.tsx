import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function InvestPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 🔒 sécurité
  if (!user) {
    redirect("/login?next=/invest");
  }

  // 📊 positions
  const { data: positions, error: positionsError } = await supabase
    .from("vw_portfolio_positions_core_v2")
    .select("*")
    .eq("user_id", user.id)
    .order("market_value", { ascending: false });

  // 💰 cash
  const { data: cashRows, error: cashError } = await supabase
    .from("vw_portfolio_cash_core_v1")
    .select("*")
    .eq("user_id", user.id);

  // 🔢 calculs
  const totalPositions =
    positions?.reduce((sum, row) => sum + Number(row.market_value ?? 0), 0) ?? 0;

  const totalCash =
    cashRows?.reduce((sum, row) => sum + Number(row.cash_amount ?? 0), 0) ?? 0;

  const totalPortfolio = totalPositions + totalCash;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Invest</h1>

      {/* KPI */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded border p-4">
          <p className="text-sm text-neutral-500">Positions</p>
          <p className="text-xl font-semibold">
            {totalPositions.toFixed(2)} €
          </p>
        </div>

        <div className="rounded border p-4">
          <p className="text-sm text-neutral-500">Cash</p>
          <p className="text-xl font-semibold">
            {totalCash.toFixed(2)} €
          </p>
        </div>

        <div className="rounded border p-4">
          <p className="text-sm text-neutral-500">Total</p>
          <p className="text-xl font-semibold">
            {totalPortfolio.toFixed(2)} €
          </p>
        </div>
      </div>

      {/* positions */}
      <div className="rounded border p-4">
        <h2 className="mb-4 font-medium">Positions</h2>

        {positionsError && (
          <p className="text-red-600 text-sm">
            {positionsError.message}
          </p>
        )}

        {!positions || positions.length === 0 ? (
          <p>Aucune position</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-2">Ticker</th>
                <th className="px-3 py-2">Nom</th>
                <th className="px-3 py-2">Qté</th>
                <th className="px-3 py-2">PRU</th>
                <th className="px-3 py-2">Cours</th>
                <th className="px-3 py-2">Valeur</th>
              </tr>
            </thead>

            <tbody>
              {positions.map((row) => (
                <tr key={`${row.account_id}-${row.ticker}`} className="border-b">
                  <td className="px-3 py-2">{row.ticker}</td>
                  <td className="px-3 py-2">{row.asset_name}</td>
                  <td className="px-3 py-2">{row.quantity}</td>
                  <td className="px-3 py-2">{row.avg_cost}</td>
                  <td className="px-3 py-2">{row.market_price}</td>
                  <td className="px-3 py-2">
                    {Number(row.market_value).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}