import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { getDecisionTone, getMomentumTone, getZoneTone } from "@/lib/investment-ui";
import type { DecisionEngineRow } from "@/types/investment";

export default async function DecisionEnginePage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vw_decision_engine_v2")
    .select(`
      position_id,
      asset_id,
      asset_name,
      ticker,
      account_name,
      account_type,
      broker_code,
      market_value,
      portfolio_weight_pct,
      total_score_v2,
      capital_efficiency_score,
      opportunity_cost_gap,
      expected_return_pct,
      buy_zone,
      momentum_regime,
      decision_v2
    `)
    .order("capital_efficiency_score", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as DecisionEngineRow[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Decision Engine</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Lecture CIO du portefeuille : efficacité du capital, coût d’opportunité et décision par ligne.
        </p>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-neutral-200 text-left text-neutral-500">
              <tr>
                <th className="px-3 py-3">Actif</th>
                <th className="px-3 py-3">Compte</th>
                <th className="px-3 py-3">Valeur</th>
                <th className="px-3 py-3">Poids</th>
                <th className="px-3 py-3">Score V2</th>
                <th className="px-3 py-3">Eff. capital</th>
                <th className="px-3 py-3">Gap opp.</th>
                <th className="px-3 py-3">ER</th>
                <th className="px-3 py-3">Zone</th>
                <th className="px-3 py-3">Momentum</th>
                <th className="px-3 py-3">Décision</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.position_id} className="border-b border-neutral-100">
                  <td className="px-3 py-3">
                    <div className="font-medium text-neutral-900">{row.ticker ?? row.asset_name}</div>
                    <div className="text-neutral-500">{row.asset_name}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div>{row.account_name}</div>
                    <div className="text-neutral-500">{row.account_type}</div>
                  </td>
                  <td className="px-3 py-3">{formatCurrency(row.market_value)}</td>
                  <td className="px-3 py-3">{formatPercent(row.portfolio_weight_pct)}</td>
                  <td className="px-3 py-3">{formatNumber(row.total_score_v2)} / 10</td>
                  <td className="px-3 py-3">{formatNumber(row.capital_efficiency_score)}</td>
                  <td className="px-3 py-3">{formatNumber(row.opportunity_cost_gap)}</td>
                  <td className="px-3 py-3">{formatPercent(row.expected_return_pct)}</td>
                  <td className="px-3 py-3">
                    <Badge tone={getZoneTone(row.buy_zone) as any}>{row.buy_zone ?? "-"}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={getMomentumTone(row.momentum_regime) as any}>
                      {row.momentum_regime ?? "-"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={getDecisionTone(row.decision_v2) as any}>
                      {row.decision_v2 ?? "-"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}