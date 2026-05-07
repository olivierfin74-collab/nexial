"use client";

/**
 * /opportunites — Couche 1 utilisateur final
 * Source : public.fn_get_opportunities_dashboard(user_id, min_score, event_kinds, actions)
 * Vocabulaire : Acheter / À renforcer / Surveiller / À alléger / Vendre
 * Design : ADR-10 v2 light editorial (canvas #FBF9F4, forest #2D5F3F, burgundy #7A3838)
 * Session 009 — Sprint 1.4
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// =====================================================================
// Types
// =====================================================================

type UserAction =
  | "Acheter"
  | "À renforcer"
  | "Surveiller"
  | "À alléger"
  | "Vendre";

type Opportunity = {
  asset_id: string;
  ticker: string;
  asset_name: string;
  asset_currency: string;
  exchange_region: string;
  sector: string | null;
  event_kind: string | null;
  severity: string | null;
  combined_score: number | null;
  final_action: string | null;
  user_action: UserAction;
  technical_score: number | null;
  overall_fundamental_score: number | null;
  market_regime: string | null;
  regime_confidence: number | null;
  regime_sizing_multiplier: number | null;
  rsi_14: number | null;
  rsi_label: string | null;
  chg_5d_pct: number | null;
  dist_52w_high_pct: number | null;
  next_earnings_date: string | null;
  days_to_earnings: number | null;
  earnings_imminent: boolean | null;
  in_portfolio: boolean;
  portfolio_quantity: number;
};

type Meta = {
  generated_at: string;
  n_total: number;
  n_acheter: number;
  n_renforcer: number;
  n_surveiller: number;
  n_alleger: number;
  n_vendre: number;
  market_regime: string | null;
  regime_confidence: number | null;
  regime_sizing_multiplier: number | null;
};

type DashboardResponse = {
  meta: Meta;
  opportunities: Opportunity[];
};

const FILTER_OPTIONS: { value: UserAction | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "Acheter", label: "Acheter" },
  { value: "À renforcer", label: "À renforcer" },
  { value: "Surveiller", label: "Surveiller" },
];

// =====================================================================
// Page (with Suspense boundary for useSearchParams)
// =====================================================================

export default function OpportunitesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OpportunitesContent />
    </Suspense>
  );
}

function OpportunitesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const filterParam = searchParams.get("filter");
  const activeFilter: UserAction | "all" =
    filterParam && FILTER_OPTIONS.some((o) => o.value === filterParam)
      ? (filterParam as UserAction | "all")
      : "all";

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return;
      if (!user) {
        router.replace("/login?next=/opportunites");
        return;
      }
      setUserId(user.id);
    });
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const actions = activeFilter === "all" ? null : [activeFilter];
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "fn_get_opportunities_dashboard",
        {
          p_user_id: userId,
          p_min_score: null,
          p_event_kinds: null,
          p_actions: actions,
        }
      );
      if (cancelled) return;
      if (rpcError) {
        setError(rpcError.message);
        setLoading(false);
        return;
      }
      setData(rpcData as DashboardResponse);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, activeFilter]);

  function setFilter(v: UserAction | "all") {
    const params = new URLSearchParams(searchParams);
    if (v === "all") params.delete("filter");
    else params.set("filter", v);
    const qs = params.toString();
    router.replace(qs ? `/opportunites?${qs}` : "/opportunites");
  }

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[440px] px-5 pb-24 pt-8">
        <header className="mb-6">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-tertiary">
            Aujourd&apos;hui · Opportunités
          </p>
          <h1 className="font-display mt-2 text-[32px] font-normal leading-[1.05] tracking-display text-ink-primary">
            {loading ? "Chargement…" : actionsHeadline(data)}
          </h1>
          {data?.meta?.market_regime && (
            <p className="mt-3 text-sm text-ink-secondary">
              Régime{" "}
              <span className="font-mono">
                {humanRegime(data.meta.market_regime)}
              </span>
              {data.meta.regime_confidence != null && (
                <>
                  {" · confiance "}
                  <span className="font-mono">
                    {Math.round(data.meta.regime_confidence)}
                  </span>
                </>
              )}
              {data.meta.regime_sizing_multiplier != null && (
                <>
                  {" · sizing × "}
                  <span className="font-mono">
                    {data.meta.regime_sizing_multiplier.toFixed(2)}
                  </span>
                </>
              )}
            </p>
          )}
        </header>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {FILTER_OPTIONS.map((opt) => {
            const active = activeFilter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={[
                  "shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-ink-primary text-white"
                    : "border border-border-subtle bg-bg-surface text-ink-secondary hover:text-ink-primary",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {error && <ErrorBanner message={error} />}
        {!loading && !error && data && data.opportunities.length === 0 && (
          <EmptyState filter={activeFilter} />
        )}

        {!loading && !error && data && (
          <ul className="flex flex-col gap-4">
            {data.opportunities.map((opp) => (
              <li key={opp.asset_id}>
                <OpportunityCard
                  opp={opp}
                  onAction={() => router.push(`/opportunites/${opp.ticker}`)}
                />
              </li>
            ))}
          </ul>
        )}

        {loading && <SkeletonList />}
      </div>
    </main>
  );
}

// =====================================================================
// Card
// =====================================================================

function OpportunityCard({
  opp,
  onAction,
}: {
  opp: Opportunity;
  onAction: () => void;
}) {
  const score = opp.combined_score ?? 0;
  const techScore = opp.technical_score ?? 0;
  const fundScore = opp.overall_fundamental_score ?? 0;

  return (
    <article className="rounded-lg border border-border-subtle bg-bg-surface p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-normal leading-tight tracking-display text-ink-primary">
              {opp.ticker}
            </h2>
            {opp.in_portfolio && (
              <span className="rounded-sm border border-forest-green-pale bg-bg-pour px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-eyebrow text-forest-green">
                En porte
              </span>
            )}
          </div>
          {opp.asset_name && (
            <p className="mt-0.5 truncate text-sm text-ink-tertiary">
              {opp.asset_name}
            </p>
          )}
        </div>
        <ActionPill action={opp.user_action} />
      </div>

      <div className="mb-4 flex items-center gap-4">
        <ScoreGauge value={score} />
        <div className="flex flex-1 flex-col gap-2">
          <ScoreBar label="Technique" value={techScore} />
          <ScoreBar label="Fondamental" value={fundScore} />
        </div>
      </div>

      <dl className="mb-4 grid grid-cols-3 gap-3 border-t border-border-subtle pt-3 text-sm">
        <DataPoint
          label="5 jours"
          value={fmtPct(opp.chg_5d_pct)}
          accent={signedAccent(opp.chg_5d_pct)}
        />
        <DataPoint
          label="Plus haut 52s"
          value={fmtPct(opp.dist_52w_high_pct)}
          accent="muted"
        />
        <DataPoint
          label="RSI"
          value={
            opp.rsi_14 != null
              ? `${Math.round(opp.rsi_14)}${
                  opp.rsi_label ? ` · ${opp.rsi_label}` : ""
                }`
              : "—"
          }
          accent={
            opp.rsi_label === "Survendu"
              ? "positive"
              : opp.rsi_label === "Suracheté"
                ? "negative"
                : "muted"
          }
        />
      </dl>

      {opp.earnings_imminent && opp.next_earnings_date && (
        <div className="mb-3 rounded-md bg-bg-alert px-3 py-2 text-xs text-ink-primary">
          Résultats dans {opp.days_to_earnings}j —{" "}
          <span className="font-mono">{opp.next_earnings_date}</span>
        </div>
      )}

      <button
        onClick={onAction}
        className="w-full rounded-lg bg-ink-primary py-3 text-sm font-medium text-white transition-colors hover:bg-ink-primary/90"
      >
        {ctaLabel(opp.user_action)}
      </button>
    </article>
  );
}

// =====================================================================
// Atoms
// =====================================================================

function ActionPill({ action }: { action: UserAction }) {
  const styles = actionStyles(action);
  return (
    <span
      className={[
        "shrink-0 rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-eyebrow",
        styles.bg,
        styles.text,
      ].join(" ")}
    >
      {action}
    </span>
  );
}

function ScoreGauge({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const color =
    value >= 70 ? "#2D5F3F" : value >= 50 ? "#A0843D" : "#7A3838";

  return (
    <div className="relative h-[64px] w-[64px] shrink-0">
      <svg
        viewBox="0 0 64 64"
        className="h-full w-full -rotate-90"
        aria-hidden
      >
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="#E8E2D4"
          strokeWidth="5"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 600ms ease-out",
            vectorEffect: "non-scaling-stroke",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-lg font-normal leading-none text-ink-primary">
          {Math.round(value)}
        </span>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const color =
    v >= 70 ? "#2D5F3F" : v >= 50 ? "#5C8A6F" : v >= 30 ? "#A0843D" : "#7A3838";
  return (
    <div className="flex items-center gap-2">
      <span className="w-[88px] text-xs text-ink-secondary">{label}</span>
      <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-border-subtle">
        <div
          className="h-full rounded-full"
          style={{
            width: `${v}%`,
            backgroundColor: color,
            transition: "width 600ms ease-out",
          }}
        />
      </div>
      <span className="w-8 text-right font-mono text-xs text-ink-primary">
        {Math.round(v)}
      </span>
    </div>
  );
}

function DataPoint({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "positive" | "negative" | "muted";
}) {
  const colorClass =
    accent === "positive"
      ? "text-forest-green"
      : accent === "negative"
        ? "text-burgundy"
        : "text-ink-primary";
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-eyebrow text-ink-tertiary">
        {label}
      </dt>
      <dd className={`mt-0.5 font-mono text-sm ${colorClass}`}>{value}</dd>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-lg border border-burgundy/30 bg-bg-alert p-4">
      <p className="text-sm font-medium text-ink-primary">
        Erreur de chargement
      </p>
      <p className="mt-1 text-xs text-ink-secondary">{message}</p>
    </div>
  );
}

function EmptyState({ filter }: { filter: UserAction | "all" }) {
  const msg =
    filter === "all"
      ? "Aucune opportunité active. Le moteur scanne 42 actifs en continu."
      : `Aucune opportunité dans la catégorie « ${filter} » pour l'instant.`;
  return (
    <div className="rounded-lg border border-dashed border-border-subtle p-8 text-center">
      <p className="text-sm text-ink-secondary">{msg}</p>
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-[210px] animate-pulse rounded-lg border border-border-subtle bg-bg-surface"
        />
      ))}
    </ul>
  );
}

function PageSkeleton() {
  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[440px] px-5 pb-24 pt-8">
        <div className="mb-6 h-[80px] animate-pulse rounded bg-border-subtle/50" />
        <SkeletonList />
      </div>
    </main>
  );
}

// =====================================================================
// Helpers
// =====================================================================

function actionsHeadline(data: DashboardResponse | null): string {
  if (!data) return "Aucune action";
  const { n_acheter, n_renforcer, n_surveiller } = data.meta;
  const parts: string[] = [];
  if (n_acheter > 0) parts.push(`${n_acheter} à acheter`);
  if (n_renforcer > 0) parts.push(`${n_renforcer} à renforcer`);
  if (n_surveiller > 0) parts.push(`${n_surveiller} à surveiller`);
  if (parts.length === 0) return "Rien à faire aujourd'hui";
  return parts.join(" · ");
}

function humanRegime(regime: string): string {
  const map: Record<string, string> = {
    BULL_STRONG: "Hausse forte",
    BULL_LIGHT: "Hausse modérée",
    NEUTRAL: "Neutre",
    BEAR_LIGHT: "Baisse modérée",
    BEAR_STRONG: "Baisse forte",
    STRESS: "Stress",
  };
  return map[regime] ?? regime;
}

function ctaLabel(action: UserAction): string {
  switch (action) {
    case "Acheter":
      return "Acheter";
    case "À renforcer":
      return "Renforcer";
    case "Surveiller":
      return "Voir le détail";
    case "À alléger":
      return "Alléger";
    case "Vendre":
      return "Vendre";
  }
}

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function signedAccent(v: number | null): "positive" | "negative" | "muted" {
  if (v == null) return "muted";
  if (v > 0.5) return "positive";
  if (v < -0.5) return "negative";
  return "muted";
}

function actionStyles(action: UserAction): { bg: string; text: string } {
  switch (action) {
    case "Acheter":
      return { bg: "bg-forest-green", text: "text-white" };
    case "À renforcer":
      return { bg: "bg-bg-pour", text: "text-forest-green" };
    case "Surveiller":
      return { bg: "bg-bg-contre", text: "text-ink-primary" };
    case "À alléger":
      return { bg: "bg-bg-alert", text: "text-amber" };
    case "Vendre":
      return { bg: "bg-burgundy", text: "text-white" };
  }
}
