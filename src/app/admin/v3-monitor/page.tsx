"use client";

/**
 * /admin/v3-monitor — Couche 2 admin moteur (privé)
 * Source : public.fn_get_v3_monitor_dashboard(window_days)
 * Vocabulaire : Bien calibré / Trop d'alertes / Trop peu d'alertes / À mesurer
 * Auth gate : seul Olivier (user_id 4c1610db-25cd-4eca-b16a-b5bb4898f4ff)
 * Session 009 — Sprint 1.3
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const OWNER_USER_ID = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

type Meta = {
  snapshot_at: string;
  window_days: number;
  total_active: number;
  total_alerts: number;
};

type Regime = {
  current: string;
  confidence: number;
  risk_appetite: string;
  recommendation: string;
  sizing_multiplier: number;
};

type PerfRow = {
  alert_kind: string;
  n_alerts: number;
  n_wins: number;
  n_partial: number;
  n_stop_loss: number;
  n_too_early: number;
  n_active_now: number;
  avg_peak_gain: number | null;
  avg_trough_dd: number | null;
  reward_risk_ratio: number | null;
};

type HealthVerdict = "HEALTHY" | "NOISY" | "LOW_VOLUME" | "WARMING_UP";

type HealthRow = {
  alert_kind: string;
  n_total: number;
  n_dismissed: number;
  n_last_24h: number;
  n_last_7d: number;
  n_last_30d: number;
  pct_dismissed: number;
  health_verdict: HealthVerdict;
};

type Suggestion = {
  alert_kind: string;
  health_verdict: HealthVerdict;
  n_observed: number;
  hit_rate_pct: number | null;
  reward_risk: number | null;
  avg_peak_pct: number | null;
  dismiss_rate_pct: number | null;
  recommendation: string;
  proposed_id: string | null;
};

type SweetSpot = {
  alert_kind: string;
  sector: string;
  n_alerts: number;
  n_wins: number;
  avg_peak_gain_pct: number | null;
};

type DashboardResponse = {
  meta: Meta;
  regime: Regime;
  perf: PerfRow[];
  health: HealthRow[];
  suggestions: Suggestion[];
  sweet_spots: SweetSpot[];
};

type Tab = "performance" | "suggestions" | "sweet_spots";

export default function V3MonitorPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [windowDays, setWindowDays] = useState<number>(30);
  const [tab, setTab] = useState<Tab>("performance");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return;
      if (!user) {
        router.replace("/login?next=/admin/v3-monitor");
        return;
      }
      if (user.id !== OWNER_USER_ID) {
        router.replace("/");
        return;
      }
      setAuthorized(true);
    });
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "fn_get_v3_monitor_dashboard",
        { window_days: windowDays }
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
  }, [supabase, authorized, windowDays]);

  if (!authorized) return <main className="min-h-screen bg-canvas" />;

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[440px] px-5 pb-24 pt-8">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink-tertiary">
          Admin · Moteur d&apos;alertes V3
        </p>

        <section
          className="mt-3 overflow-hidden rounded-xl p-6 text-white"
          style={{
            background:
              "linear-gradient(135deg, #1F4530 0%, #2D5F3F 60%, #5C8A6F 100%)",
          }}
        >
          <p className="text-[11px] uppercase tracking-eyebrow opacity-80">
            État du moteur
          </p>
          <h1 className="font-display mt-1 text-[28px] font-normal leading-[1.1] tracking-display">
            {loading
              ? "Chargement…"
              : data
                ? heroHeadline(data)
                : "Indisponible"}
          </h1>
          {data && !loading && (
            <p className="mt-2 text-sm opacity-90">
              {data.meta.total_active} alertes actives ·{" "}
              {data.meta.total_alerts} sur {data.meta.window_days}j ·{" "}
              <span className="font-mono">
                {humanRegime(data.regime.current)}
              </span>{" "}
              (conf {data.regime.confidence})
            </p>
          )}
        </section>

        <div className="mt-4 flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setWindowDays(d)}
              className={[
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                windowDays === d
                  ? "bg-ink-primary text-white"
                  : "border border-border-subtle bg-bg-surface text-ink-secondary",
              ].join(" ")}
            >
              {d}j
            </button>
          ))}
        </div>

        {error && <ErrorBanner message={error} />}

        {data && !loading && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatTile
              label="Meilleur R/R"
              value={
                bestRR(data.perf)?.reward_risk_ratio != null
                  ? `${bestRR(data.perf)!.reward_risk_ratio!.toFixed(2)}x`
                  : "—"
              }
              sub={
                bestRR(data.perf) ? humanKind(bestRR(data.perf)!.alert_kind) : "—"
              }
              tone="positive"
            />
            <StatTile
              label="Plus bavard"
              value={
                noisiest(data.health)
                  ? `${noisiest(data.health)!.pct_dismissed.toFixed(0)}% écartés`
                  : "—"
              }
              sub={
                noisiest(data.health)
                  ? humanKind(noisiest(data.health)!.alert_kind)
                  : "—"
              }
              tone="negative"
            />
            <StatTile
              label="Sweet spot"
              value={
                data.sweet_spots[0]
                  ? `${(data.sweet_spots[0].avg_peak_gain_pct ?? 0).toFixed(1)}%`
                  : "—"
              }
              sub={data.sweet_spots[0]?.sector ?? "—"}
              tone="positive"
            />
            <StatTile
              label="Suggestions"
              value={String(data.suggestions.length)}
              sub={
                data.suggestions.length > 0 ? "à examiner" : "rien à faire"
              }
              tone="muted"
            />
          </div>
        )}

        {data && !loading && (
          <div className="mt-6">
            <div className="flex gap-1 border-b border-border-subtle">
              {(
                [
                  ["performance", "Performance"],
                  ["suggestions", "Suggestions"],
                  ["sweet_spots", "Sweet spots"],
                ] as [Tab, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={[
                    "border-b-2 px-3 py-2 text-sm transition-colors",
                    tab === id
                      ? "border-ink-primary text-ink-primary"
                      : "border-transparent text-ink-tertiary hover:text-ink-secondary",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {tab === "performance" && <PerformanceTab perf={data.perf} />}
              {tab === "suggestions" && (
                <SuggestionsTab suggestions={data.suggestions} />
              )}
              {tab === "sweet_spots" && (
                <SweetSpotsTab spots={data.sweet_spots} />
              )}
            </div>
          </div>
        )}

        {loading && <PageLoadingPlaceholder />}
      </div>
    </main>
  );
}

function PerformanceTab({ perf }: { perf: PerfRow[] }) {
  if (perf.length === 0)
    return <EmptyMessage msg="Aucune performance à afficher sur cette fenêtre." />;
  return (
    <ul className="flex flex-col gap-3">
      {perf.map((row) => (
        <li
          key={row.alert_kind}
          className="rounded-lg border border-border-subtle bg-bg-surface p-4"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-ink-primary">
              {humanKind(row.alert_kind)}
            </h3>
            <span className="font-mono text-xs text-ink-tertiary">
              {row.n_alerts} alertes
            </span>
          </div>
          <dl className="grid grid-cols-3 gap-3 text-xs">
            <PerfStat
              label="Pic moyen"
              value={fmtPct(row.avg_peak_gain)}
              accent={signedAccent(row.avg_peak_gain)}
            />
            <PerfStat
              label="DD moyen"
              value={fmtPct(row.avg_trough_dd)}
              accent={signedAccent(row.avg_trough_dd)}
            />
            <PerfStat
              label="R/R"
              value={
                row.reward_risk_ratio != null
                  ? `${row.reward_risk_ratio.toFixed(2)}x`
                  : "—"
              }
              accent={
                row.reward_risk_ratio != null && row.reward_risk_ratio >= 1.5
                  ? "positive"
                  : "muted"
              }
            />
            <PerfStat
              label="Wins"
              value={`${row.n_wins}/${row.n_alerts}`}
              accent="muted"
            />
            <PerfStat
              label="Stop loss"
              value={String(row.n_stop_loss)}
              accent={row.n_stop_loss > 0 ? "negative" : "muted"}
            />
            <PerfStat
              label="En cours"
              value={String(row.n_active_now)}
              accent="muted"
            />
          </dl>
        </li>
      ))}
    </ul>
  );
}

function SuggestionsTab({ suggestions }: { suggestions: Suggestion[] }) {
  if (suggestions.length === 0)
    return <EmptyMessage msg="Aucune suggestion. Le moteur est bien calibré." />;
  return (
    <ul className="flex flex-col gap-3">
      {suggestions.map((s, i) => (
        <li
          key={`${s.alert_kind}-${i}`}
          className="rounded-lg border border-border-subtle bg-bg-surface p-4"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-ink-primary">
              {humanKind(s.alert_kind)}
            </h3>
            <VerdictPill verdict={s.health_verdict} />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
            {humanizeSuggestion(s.recommendation)}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-tertiary">
            <span>
              {s.n_observed} obs ·{" "}
              {s.dismiss_rate_pct != null
                ? `${s.dismiss_rate_pct.toFixed(0)}% écartés`
                : "0% écartés"}
            </span>
            {s.reward_risk != null && (
              <span className="font-mono">R/R {s.reward_risk.toFixed(2)}x</span>
            )}
            {s.avg_peak_pct != null && (
              <span className="font-mono">pic {s.avg_peak_pct.toFixed(1)}%</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function SweetSpotsTab({ spots }: { spots: SweetSpot[] }) {
  if (spots.length === 0)
    return (
      <EmptyMessage msg="Pas encore assez de données pour identifier des sweet spots." />
    );
  return (
    <ul className="flex flex-col gap-3">
      {spots.map((s, i) => (
        <li
          key={`${s.sector}-${s.alert_kind}-${i}`}
          className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-surface p-4"
        >
          <div>
            <p className="text-sm font-medium text-ink-primary">{s.sector}</p>
            <p className="text-xs text-ink-tertiary">{humanKind(s.alert_kind)}</p>
          </div>
          <div className="text-right">
            <p
              className={`font-mono text-base ${
                (s.avg_peak_gain_pct ?? 0) > 0
                  ? "text-forest-green"
                  : "text-ink-primary"
              }`}
            >
              {fmtPct(s.avg_peak_gain_pct)}
            </p>
            <p className="text-[11px] text-ink-tertiary">
              {s.n_wins}/{s.n_alerts} wins
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "positive" | "negative" | "muted";
}) {
  const valColor =
    tone === "positive"
      ? "text-forest-green"
      : tone === "negative"
        ? "text-burgundy"
        : "text-ink-primary";
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-4">
      <p className="text-[10px] uppercase tracking-eyebrow text-ink-tertiary">
        {label}
      </p>
      <p className={`font-display mt-1 text-xl font-normal ${valColor}`}>
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] text-ink-tertiary">{sub}</p>
    </div>
  );
}

function PerfStat({
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
      <dd className={`mt-0.5 font-mono ${colorClass}`}>{value}</dd>
    </div>
  );
}

function VerdictPill({ verdict }: { verdict: HealthVerdict }) {
  const map: Record<HealthVerdict, { label: string; bg: string; text: string }> = {
    HEALTHY: { label: "Bien calibré", bg: "bg-bg-pour", text: "text-forest-green" },
    NOISY: { label: "Trop d'alertes", bg: "bg-bg-alert", text: "text-amber" },
    LOW_VOLUME: {
      label: "Trop peu d'alertes",
      bg: "bg-bg-contre",
      text: "text-ink-secondary",
    },
    WARMING_UP: {
      label: "À mesurer",
      bg: "bg-border-subtle/60",
      text: "text-ink-tertiary",
    },
  };
  const s = map[verdict] ?? map.WARMING_UP;
  return (
    <span
      className={`shrink-0 rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-eyebrow ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-lg border border-burgundy/30 bg-bg-alert p-4">
      <p className="text-sm font-medium text-ink-primary">Erreur de chargement</p>
      <p className="mt-1 text-xs text-ink-secondary">{message}</p>
    </div>
  );
}

function EmptyMessage({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border-subtle p-8 text-center">
      <p className="text-sm text-ink-secondary">{msg}</p>
    </div>
  );
}

function PageLoadingPlaceholder() {
  return (
    <div className="mt-6 flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[100px] animate-pulse rounded-lg border border-border-subtle bg-bg-surface"
        />
      ))}
    </div>
  );
}

function heroHeadline(data: DashboardResponse): string {
  const noisy = data.health.filter((h) => h.health_verdict === "NOISY").length;
  const lowvol = data.health.filter(
    (h) => h.health_verdict === "LOW_VOLUME"
  ).length;
  if (noisy === 0 && lowvol === 0) return "Bien calibré";
  if (noisy > 0 && lowvol === 0) return `${noisy} signaux trop bavards`;
  if (lowvol > 0 && noisy === 0) return `${lowvol} signaux trop discrets`;
  return `${noisy + lowvol} ajustements possibles`;
}

function humanKind(kind: string): string {
  const map: Record<string, string> = {
    BUY_ZONE_ENTERED: "Entrée en zone d'achat",
    HOT_PULLBACK_ENTERED: "Pullback chaud",
    WATCH_PULLBACK_ENTERED: "Pullback à surveiller",
    REVERSAL_HIGH: "Retournement fort",
    REVERSAL_MEDIUM: "Retournement moyen",
    BOTTOM_FORMING: "Formation de plus bas",
    FLASH_DROP: "Chute éclair",
    ZONE_EXITED_UP: "Sortie de zone",
  };
  return map[kind] ?? kind;
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

function humanizeSuggestion(reco: string): string {
  return reco
    .replace(/^DURCIR\s*:\s*/i, "Rendre plus exigeant — ")
    .replace(/^ASSOUPLIR\s*:\s*/i, "Élargir la détection — ")
    .replace(/Seuil confluence_score\s*:/i, "Seuil :");
}

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function signedAccent(
  v: number | null
): "positive" | "negative" | "muted" {
  if (v == null) return "muted";
  if (v > 0) return "positive";
  if (v < 0) return "negative";
  return "muted";
}

function bestRR(perf: PerfRow[]): PerfRow | null {
  return (
    perf
      .filter((p) => p.reward_risk_ratio != null)
      .sort(
        (a, b) => (b.reward_risk_ratio ?? 0) - (a.reward_risk_ratio ?? 0)
      )[0] ?? null
  );
}

function noisiest(health: HealthRow[]): HealthRow | null {
  return (
    health
      .filter((h) => h.n_total >= 3)
      .sort((a, b) => b.pct_dismissed - a.pct_dismissed)[0] ?? null
  );
}
