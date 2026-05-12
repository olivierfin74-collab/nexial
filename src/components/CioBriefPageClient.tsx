"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Banknote, Clock, Loader2, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";

type BriefRecord = Record<string, unknown>;

type Opportunity = {
  ticker?: string;
  score?: number;
  opportunity_score?: number;
  drawdown?: number;
  drawdown_pct?: number;
  action?: string;
  suggested_action?: string;
  rationale?: string;
};

type ProtectiveAlert = {
  ticker?: string;
  severity?: string;
  priority?: string;
  concentration_pct?: number;
  drawdown_pct?: number;
  message?: string;
  rationale?: string;
};

const fmtNumber = (value: unknown, digits = 1) => (
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "-"
);

const fmtPct = (value: unknown, digits = 1) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  return `${normalized.toFixed(digits)}%`;
};

const fmtCurrency = (value: unknown) => (
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value)
    : "-"
);

const asObject = (value: unknown): BriefRecord => (
  value && typeof value === "object" && !Array.isArray(value) ? value as BriefRecord : {}
);

const asArray = <T,>(value: unknown): T[] => (
  Array.isArray(value) ? value as T[] : []
);

function getBriefPayload(raw: unknown): BriefRecord {
  if (Array.isArray(raw)) return asObject(raw[0]);
  return asObject(raw);
}

function RegimeBadge({ regime }: { regime: unknown }) {
  const value = typeof regime === "string" ? regime : "NEUTRAL";
  const palette = value === "STRESS" || value === "CORRECTION"
    ? "border-red-200 bg-red-50 text-red-700"
    : value === "BULL" || value === "BULL_LIGHT"
      ? "border-green-200 bg-green-50 text-green-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest ${palette}`}>
      {value}
    </span>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#DDE9D8] text-[#1F4A2E]">{icon}</span>
        <h2 className="font-serif text-2xl text-[#1F4A2E]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function CioBriefPageClient() {
  const [brief, setBrief] = useState<BriefRecord | null>(null);
  const [cashRecommendation, setCashRecommendation] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [cashLoading, setCashLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cashError, setCashError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cio/brief");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setBrief(getBriefPayload(json.brief));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement brief CIO");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadCash = async () => {
    setCashLoading(true);
    setCashError(null);
    try {
      const res = await fetch("/api/cio/cash-deployment", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setCashRecommendation(json.recommendation);
    } catch (err) {
      setCashError(err instanceof Error ? err.message : "Erreur recommandation cash");
    } finally {
      setCashLoading(false);
    }
  };

  const opportunities = useMemo(
    () => asArray<Opportunity>(brief?.top_opportunities).slice(0, 5),
    [brief],
  );
  const portfolio = asObject(brief?.portfolio_state);
  const macro = asObject(brief?.macro_context);
  const alerts = asArray<ProtectiveAlert>(brief?.protective_alerts);
  const generatedAt = typeof brief?.generated_at === "string" ? new Date(brief.generated_at).toLocaleString("fr-FR") : "-";
  const briefDate = typeof brief?.brief_date === "string"
    ? new Date(`${brief.brief_date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "Mardi 12 mai 2026";

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <div className="mb-5">
        <Link href="/aujourdhui" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1F4A2E]">
          <ArrowLeft className="h-4 w-4" />
          Decisions dashboard
        </Link>
      </div>

      <section className="mb-5 rounded-xl border border-black/10 bg-[#FBF9F4] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">CIO Agent V4.5</p>
            <h1 className="font-serif text-4xl text-[#1F4A2E]">Brief CIO - {briefDate}</h1>
            <p className="mt-2 text-sm text-gray-600">Synthese deterministe du portefeuille, du marche et des actions prioritaires.</p>
          </div>
          <RegimeBadge regime={brief?.market_regime} />
        </div>
      </section>

      {loading && (
        <div className="rounded-xl border border-black/10 bg-white p-8 text-center text-sm text-gray-500">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
          Chargement du brief...
        </div>
      )}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {!loading && !error && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Marche aujourd'hui" icon={<TrendingUp className="h-5 w-5" />}>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-[#FBF9F4] p-3">
                <div className="text-xs font-bold uppercase text-gray-500">Sizing</div>
                <div className="mt-1 text-2xl font-bold text-[#1F4A2E]">x{fmtNumber(brief?.sizing_multiplier, 2)}</div>
              </div>
              <div className="rounded-lg bg-[#FBF9F4] p-3">
                <div className="text-xs font-bold uppercase text-gray-500">RSI SPY</div>
                <div className="mt-1 text-2xl font-bold">{fmtNumber(macro.spy_rsi ?? macro.rsi_spy, 1)}</div>
              </div>
              <div className="rounded-lg bg-[#FBF9F4] p-3">
                <div className="text-xs font-bold uppercase text-gray-500">Macro</div>
                <div className="mt-1 text-sm font-semibold">{Object.keys(macro).length ? "VIX / DXY / TNX" : "manual mode"}</div>
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              <div>VIX: <span className="font-semibold">{fmtNumber(macro.vix, 2)}</span></div>
              <div>DXY: <span className="font-semibold">{fmtNumber(macro.dxy, 2)}</span></div>
              <div>^TNX: <span className="font-semibold">{fmtNumber(macro["^tnx"] ?? macro.tnx, 2)}</span></div>
            </div>
          </Panel>

          <Panel title="Opportunites prioritaires" icon={<Sparkles className="h-5 w-5" />}>
            <div className="space-y-3">
              {opportunities.length === 0 ? (
                <div className="text-sm text-gray-500">Aucune opportunite prioritaire disponible.</div>
              ) : opportunities.map((item, index) => (
                <div key={`${item.ticker || "OPP"}-${index}`} className="rounded-lg border border-black/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold">{item.ticker || "Asset"}</div>
                      <div className="mt-1 text-sm text-gray-600">{item.rationale || "Rationale non disponible."}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-[#1F4A2E]">{fmtNumber(item.score ?? item.opportunity_score, 0)}</div>
                      <div className="text-xs text-gray-500">score</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-gray-100 px-2 py-1">Drawdown {fmtPct(item.drawdown_pct ?? item.drawdown)}</span>
                    <span className="rounded-full bg-[#DDE9D8] px-2 py-1 text-[#1F4A2E]">{item.suggested_action || item.action || "Surveiller"}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Risques portefeuille" icon={<ShieldAlert className="h-5 w-5" />}>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-[#FBF9F4] p-3 text-sm">Positions <b>{String(portfolio.positions ?? "-")}</b></div>
              <div className="rounded-lg bg-[#FBF9F4] p-3 text-sm">P&L <b>{fmtPct(portfolio.pnl_pct ?? portfolio.pnl)}</b></div>
              <div className="rounded-lg bg-[#FBF9F4] p-3 text-sm">Cash <b>{fmtCurrency(portfolio.cash)}</b></div>
            </div>
            <div className="space-y-2">
              {alerts.length === 0 ? (
                <div className="text-sm text-gray-500">Aucune alerte protective critique.</div>
              ) : alerts.map((alert, index) => {
                const severity = alert.severity || alert.priority || "HIGH";
                return (
                  <div key={`${alert.ticker || "risk"}-${index}`} className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                    <div className="flex justify-between gap-3 font-bold text-red-800">
                      <span>{alert.ticker || "Portefeuille"}</span>
                      <span>{severity}</span>
                    </div>
                    <div className="mt-1 text-red-700">{alert.message || alert.rationale || `Drawdown ${fmtPct(alert.drawdown_pct)} - concentration ${fmtPct(alert.concentration_pct)}`}</div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Cash deployment" icon={<Banknote className="h-5 w-5" />}>
            <button
              type="button"
              onClick={loadCash}
              disabled={cashLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1F4A2E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {cashLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Voir recommandations cash
            </button>
            {cashError && <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{cashError}</div>}
            {cashRecommendation !== null && (
              <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-[#111827] p-3 text-xs text-white">
                {JSON.stringify(cashRecommendation, null, 2)}
              </pre>
            )}
          </Panel>

          <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="font-serif text-2xl text-[#1F4A2E]">Recommandation CIO</h2>
            <div className="mt-3 whitespace-pre-wrap rounded-lg bg-[#FBF9F4] p-4 text-sm leading-6 text-gray-800">
              {typeof brief?.cio_recommendation === "string" ? brief.cio_recommendation : "Aucune recommandation CIO disponible."}
            </div>
          </section>
        </div>
      )}

      <footer className="mt-6 flex flex-col gap-2 border-t border-black/10 pt-4 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
        <span>Genere par CIO Agent V4.5 - {generatedAt} - invocation {String(brief?.invocation_id || "-")}</span>
        <Link href="/cio-brief#historique-briefs" className="font-semibold text-[#1F4A2E]">Historique briefs</Link>
      </footer>
    </main>
  );
}
