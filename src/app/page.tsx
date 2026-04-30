import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./app/logout-button";

type InvestRow = {
  id: string;
  ticker: string;
  asset_name: string;
  display_subtitle: string | null;
  amount_suggested: number | null;
  suggested_quantity: number | null;
  buy_zone_low: number | null;
  buy_zone_high: number | null;
  score: number | null;
  capital_efficiency_score: number | null;
  expected_return_pct: number | null;
  decision: string | null;
  reason: string | null;
  latest_close_price: number | null;
  currency: string | null;
  price_quality: string | null;
  price_source: string | null;
  updated_at: string | null;
};

type PatrimoineTotal = {
  total_positions_eur: number | null;
  total_cash_eur: number | null;
  total_general_eur: number | null;
};

const INVEST_VIEW = "vw_invest_ui_v1";

function eur(value?: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function money(value?: number | null, currency = "EUR") {
  if (value == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function num(value?: number | null, digits = 2) {
  if (value == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value));
}

function pct(value?: number | null) {
  if (value == null) return "—";
  return `${num(value, 2)} %`;
}

function isActionable(row: InvestRow) {
  const decision = String(row.decision || "").toUpperCase();
  const quality = String(row.price_quality || "").toUpperCase();

  return (
    quality === "OK" &&
    (decision.includes("READY") ||
      decision.includes("BUY") ||
      decision.includes("ACHAT"))
  );
}

function decisionClass(decision?: string | null) {
  const d = String(decision || "").toUpperCase();

  if (d.includes("READY") || d.includes("BUY") || d.includes("ACHAT")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (d.includes("SURVEILLANCE") || d.includes("WAIT") || d.includes("ATTENDRE")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function qualityClass(quality?: string | null) {
  const q = String(quality || "").toUpperCase();

  if (q === "OK") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (q.includes("STALE") || q.includes("FALLBACK") || q.includes("UNKNOWN")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-red-200 bg-red-50 text-red-800";
}

function zoneLabel(row: InvestRow) {
  if (row.buy_zone_low != null && row.buy_zone_high != null) {
    return `${money(row.buy_zone_low, row.currency || "EUR")} - ${money(
      row.buy_zone_high,
      row.currency || "EUR"
    )}`;
  }

  return "NONE";
}

export default async function AppPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [investRes, patrimoineRes] = await Promise.all([
    supabase.from(INVEST_VIEW).select("*"),
    supabase.from("vw_patrimoine_total_general_eur_v1").select("*").single(),
  ]);

  const investRows = ((investRes.data || []) as InvestRow[]).sort((a, b) => {
    const scoreA = Number(a.capital_efficiency_score || 0) + Number(a.score || 0);
    const scoreB = Number(b.capital_efficiency_score || 0) + Number(b.score || 0);
    return scoreB - scoreA;
  });

  const patrimoine = patrimoineRes.data as PatrimoineTotal | null;

  const actionableRows = investRows.filter(isActionable);
  const topRows = investRows.slice(0, 3);
  const amountNow = actionableRows.reduce(
    (sum, row) => sum + Number(row.amount_suggested || 0),
    0
  );

  const best = investRows[0];

  const decisionTitle = actionableRows.length > 0 ? "Investir" : "Attendre";
  const decisionText =
    actionableRows.length > 0
      ? `${actionableRows.length} idée(s) exploitable(s). Montant à engager maintenant : ${eur(
          amountNow
        )}.`
      : `Aucune idée n’est en zone d’achat. ${
          best ? `Meilleure idée à surveiller : ${best.ticker}. ` : ""
        }Discipline prioritaire : attendre un meilleur point d’entrée.`;

  return (
    <main className="min-h-screen bg-[#eef2f7] px-5 py-5 text-slate-900">
      <div className="mx-auto max-w-[1550px] space-y-5">
        <header className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-[#0f172a] via-[#172554] to-[#1e3a8a] px-7 py-6 text-white">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-blue-200">
                  Wealth Command Center
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                  Pilotage capital
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
                  Vue centrale du portefeuille, des opportunités et du cash disponible.
                  Source officielle : {INVEST_VIEW}.
                </p>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-right backdrop-blur">
                <div>
                  <p className="text-xs text-blue-100">Utilisateur connecté</p>
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
                <LogoutButton />
              </div>
            </div>
          </div>

          <section className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Patrimoine total" value={eur(patrimoine?.total_general_eur)} />
            <Kpi label="Cash disponible" value={eur(patrimoine?.total_cash_eur)} />
            <Kpi label="À investir maintenant" value={eur(amountNow)} positive={amountNow > 0} />
            <Kpi label="Idées actionnables" value={String(actionableRows.length)} positive={actionableRows.length > 0} />
          </section>
        </header>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Décision</p>
          <h2 className="mt-2 text-4xl font-semibold text-slate-950">
            {decisionTitle}
          </h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-slate-700">
            {decisionText}
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          <NavCard href="/portfolio" title="Portefeuille" text="Positions, P&L, poids, filtres et qualité data." />
          <NavCard href="/patrimoine" title="Patrimoine" text="Vue consolidée, cash, crypto et répartition globale." />
          <NavCard href="/allocation" title="Allocation" text="Répartition ETF, actions, cash et crypto par compte." />
          <NavCard href="/invest" title="Investir" text="Top idées, scoring, prix fiable et zones d’achat." />
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Top idées</h2>
              <p className="mt-1 text-sm text-slate-500">
                Prix, quantité et décision issus uniquement de {INVEST_VIEW}.
              </p>
            </div>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-500">
              Max 3
            </span>
          </div>

          <div className="grid gap-4">
            {topRows.map((item, index) => (
              <article
                key={`${item.id}-${item.ticker}-${index}`}
                className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-slate-950">
                        {item.ticker} — {item.asset_name}
                      </h3>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                        #{index + 1}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.display_subtitle || item.reason}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-sm font-medium ${decisionClass(
                      item.decision
                    )}`}
                  >
                    {item.decision || "SURVEILLANCE"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <Info label="Montant suggéré" value={money(item.amount_suggested, item.currency || "EUR")} />
                  <Info label="Quantité suggérée" value={num(item.suggested_quantity, 4)} />
                  <Info
                    label="Prix actuel"
                    value={money(item.latest_close_price, item.currency || "EUR")}
                    highlight={item.price_quality === "OK"}
                  />
                  <Info label="Zone d’achat" value={zoneLabel(item)} />
                  <Info label="Score" value={num(item.score, 2)} />
                  <Info label="Capital efficiency" value={num(item.capital_efficiency_score, 2)} />
                  <Info label="Rendement attendu" value={pct(item.expected_return_pct)} />
                  <Info
                    label="Source prix"
                    value={`${item.price_source || "—"} · ${item.price_quality || "—"}`}
                    badgeClass={qualityClass(item.price_quality)}
                  />
                </div>

                {item.reason && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {item.reason}
                  </div>
                )}
              </article>
            ))}

            {topRows.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-500">
                Aucune idée disponible dans la vue officielle.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Kpi({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${positive ? "text-emerald-700" : "text-slate-950"}`}>
        {value}
      </p>
    </div>
  );
}

function NavCard({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40"
    >
      <p className="text-lg font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </Link>
  );
}

function Info({
  label,
  value,
  highlight = false,
  badgeClass,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  badgeClass?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      {badgeClass ? (
        <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass}`}>
          {value}
        </span>
      ) : (
        <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
      )}
    </div>
  );
}