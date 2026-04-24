import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { getInvestModuleData } from "@/domains/invest/data";
import {
  buildInvestPlan,
  normalizeAccountPreference,
} from "@/domains/invest/engine";

type SearchParams = Promise<{
  amount?: string;
  accountPref?: string;
}>;

export default async function InvestPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const requestedAmount = Number(params.amount ?? 1000);
  const accountPreference = normalizeAccountPreference(params.accountPref);

  try {
    const { targets, cashRows } = await getInvestModuleData();

    const plan = buildInvestPlan({
      targets,
      cashRows,
      requestedAmount,
      accountPreference,
    });

    const stateTone =
      plan.state === "INVEST"
        ? "border-green-200 bg-green-50"
        : plan.state === "PARTIAL"
        ? "border-amber-200 bg-amber-50"
        : "border-slate-200 bg-slate-50";

    const stateLabel =
      plan.state === "INVEST"
        ? "Investir"
        : plan.state === "PARTIAL"
        ? "Investir partiellement"
        : "Attendre";

    return (
      <main className="space-y-6 p-6">
        <section className="rounded-2xl border bg-white p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 text-sm font-medium text-gray-500">
                Aujourd’hui
              </div>
              <h1 className="text-3xl font-bold">Investir maintenant</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600">
                Décision simple, disciplinée, concentrée sur les meilleures idées.
              </p>
            </div>

            <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium">
              FREE
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6">
          <h2 className="mb-4 font-semibold">Paramètres</h2>

          <form method="GET" className="grid gap-4 md:grid-cols-3">
            <Field label="Montant à investir">
              <input
                type="number"
                name="amount"
                min={0}
                step="100"
                defaultValue={requestedAmount}
                className="w-full rounded-xl border px-3 py-2"
              />
            </Field>

            <Field label="Compte cible">
              <select
                name="accountPref"
                defaultValue={accountPreference}
                className="w-full rounded-xl border px-3 py-2"
              >
                <option value="AUTO">Auto</option>
                <option value="PEA">PEA</option>
                <option value="CTO">CTO</option>
              </select>
            </Field>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-xl bg-black px-4 py-2 text-white hover:opacity-90"
              >
                Générer
              </button>
            </div>
          </form>
        </section>

        <section className={`rounded-2xl border p-6 ${stateTone}`}>
          <div className="mb-2 text-sm text-gray-500">Décision</div>
          <div className="mb-2 text-3xl font-bold">{stateLabel}</div>
          <p className="max-w-3xl text-sm text-gray-700">{plan.summary}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <KpiCard
            title="Cash disponible"
            value={formatCurrency(plan.availableCash)}
          />
          <KpiCard
            title="Montant demandé"
            value={formatCurrency(plan.requestedAmount)}
          />
          <KpiCard
            title="À investir maintenant"
            value={formatCurrency(plan.investNowAmount)}
          />
          <KpiCard
            title="Cash à conserver"
            value={formatCurrency(plan.keepCashAmount)}
          />
        </section>

        <section className="rounded-2xl border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Top idées</h2>
            <span className="text-sm text-gray-500">Max 3</span>
          </div>

          {plan.proposals.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aucune idée remontée par le moteur pour ce périmètre.
            </p>
          ) : (
            <div className="space-y-4">
              {plan.proposals.map((proposal) => (
                <article
                  key={`${proposal.accountName}-${proposal.ticker}`}
                  className="rounded-2xl border p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {proposal.ticker} — {proposal.assetName}
                        </h3>
                        <span className="rounded-full border px-2 py-0.5 text-xs">
                          #{proposal.targetRank}
                        </span>
                      </div>

                      <div className="mt-1 text-sm text-gray-500">
                        {proposal.accountName} · {proposal.accountType}
                      </div>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${
                        proposal.isExecutable
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {proposal.isExecutable ? "Exécutable" : "Surveillance"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <Metric
                      label="Montant suggéré"
                      value={formatCurrency(proposal.suggestedAmount)}
                    />
                    <Metric
                      label="Quantité suggérée"
                      value={String(proposal.suggestedQuantity)}
                    />
                    <Metric
                      label="Prix actuel"
                      value={formatCurrency(proposal.currentPrice)}
                    />
                    <Metric label="Zone d’achat" value={proposal.buyZone} />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <Metric
                      label="Score"
                      value={formatNumber(proposal.totalScore, 2)}
                    />
                    <Metric
                      label="Capital efficiency"
                      value={formatNumber(proposal.capitalEfficiencyScore, 2)}
                    />
                    <Metric
                      label="Rendement attendu"
                      value={formatPercent(proposal.expectedReturnPct, 0)}
                    />
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-gray-700">
                    {proposal.reason}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-6">
          <div className="mb-2 text-sm font-medium text-gray-500">CORE</div>
          <h2 className="text-xl font-semibold">Voir le plan complet</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Débloquer le plan détaillé, les alternatives rejetées, le niveau de
            risque et les arbitrages éventuels.
          </p>

          <div className="mt-4 rounded-2xl border border-dashed p-4 text-sm text-gray-600">
            Plan détaillé verrouillé : timing, alternatives, arbitrages,
            exposition cible, exécution par ordre.
          </div>
        </section>
      </main>
    );
  } catch (error) {
    return (
      <main className="p-6">
        <h1 className="mb-4 text-2xl font-bold">Erreur Invest</h1>
        <pre className="overflow-x-auto rounded-2xl border bg-white p-4 text-sm">
          {error instanceof Error ? error.message : "Erreur inconnue"}
        </pre>
      </main>
    );
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-sm text-gray-600">{label}</div>
      {children}
    </label>
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

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}