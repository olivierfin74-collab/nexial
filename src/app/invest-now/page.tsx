import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { getDecisionTone, getZoneTone } from "@/lib/investment-ui";
import type { InvestNowPlanRow } from "@/types/investment";

export default async function InvestNowPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vw_invest_now_plan_v1")
    .select(`
      rank_global,
      ticker,
      asset_name,
      decision_v2,
      preferred_account_type,
      account_id,
      account_name,
      account_type,
      cash_amount,
      allocation_share,
      recommended_amount,
      current_price,
      recommended_quantity,
      buy_zone,
      total_score_v2,
      capital_efficiency_score,
      expected_return_pct
    `)
    .order("rank_global", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as InvestNowPlanRow[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Invest Now</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Plan d’investissement concret : compte, montant, quantité et priorité d’exécution.
        </p>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-neutral-200 text-left text-neutral-500">
              <tr>
                <th className="px-3 py-3">Rang</th>
                <th className="px-3 py-3">Actif</th>
                <th className="px-3 py-3">Décision</th>
                <th className="px-3 py-3">Compte</th>
                <th className="px-3 py-3">Cash</th>
                <th className="px-3 py-3">Allocation</th>
                <th className="px-3 py-3">Montant</th>
                <th className="px-3 py-3">Prix</th>
                <th className="px-3 py-3">Qté</th>
                <th className="px-3 py-3">Zone</th>
                <th className="px-3 py-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.rank_global}-${row.account_id}-${row.ticker}`} className="border-b border-neutral-100">
                  <td className="px-3 py-3 font-medium">#{row.rank_global}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-neutral-900">{row.ticker ?? row.asset_name}</div>
                    <div className="text-neutral-500">{row.asset_name}</div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={getDecisionTone(row.decision_v2) as any}>
                      {row.decision_v2 ?? "-"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div>{row.account_name}</div>
                    <div className="text-neutral-500">{row.account_type}</div>
                  </td>
                  <td className="px-3 py-3">{formatCurrency(row.cash_amount)}</td>
                  <td className="px-3 py-3">{formatPercent((row.allocation_share ?? 0) * 100)}</td>
                  <td className="px-3 py-3 font-medium">{formatCurrency(row.recommended_amount)}</td>
                  <td className="px-3 py-3">{formatCurrency(row.current_price)}</td>
                  <td className="px-3 py-3">{formatNumber(row.recommended_quantity, 0)}</td>
                  <td className="px-3 py-3">
                    <Badge tone={getZoneTone(row.buy_zone) as any}>{row.buy_zone ?? "-"}</Badge>
                  </td>
                  <td className="px-3 py-3">{formatNumber(row.total_score_v2)} / 10</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}