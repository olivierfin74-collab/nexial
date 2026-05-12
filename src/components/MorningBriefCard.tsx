"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

type BriefRecord = Record<string, unknown>;

const T = {
  bgCanvas: "#FBF9F4",
  bgSurface: "#FFFFFF",
  bgSoft: "#F3EFE4",
  border: "#D4CCB8",
  ink: "#0A0A0A",
  muted: "#6B6B6B",
  green: "#1F4A2E",
  burgundy: "#7A2E2E",
};

function asObject(value: unknown): BriefRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as BriefRecord : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getBriefPayload(raw: unknown): BriefRecord {
  if (Array.isArray(raw)) return asObject(raw[0]);
  return asObject(raw);
}

function firstValue(record: BriefRecord | undefined, keys: string[]): unknown {
  if (!record) return undefined;
  return keys.map((key) => record[key]).find((value) => value !== undefined && value !== null);
}

function stringValue(value: unknown, fallback = "Non disponible") {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return fallback;
}

function formatPct(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  return `${normalized > 0 ? "+" : ""}${normalized.toFixed(1)}%`;
}

function isParisMorningWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  return Number.isFinite(hour) && hour >= 6 && hour < 12;
}

function formatParisTime(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function SummaryBlock({ label, value, tone }: { label: string; value: string; tone?: "risk" | "green" }) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        background: T.bgSurface,
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          color: tone === "risk" ? T.burgundy : T.muted,
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 6, fontSize: 15, lineHeight: 1.35, color: tone === "green" ? T.green : T.ink, fontWeight: 750 }}>
        {value}
      </div>
    </div>
  );
}

function TopMovers({ value }: { value: unknown }) {
  const movers = asArray(value).slice(0, 4);

  if (movers.length === 0) {
    return <div style={{ fontSize: 13, color: T.muted }}>Aucun mouvement majeur detecte.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {movers.map((item, index) => {
        const row = asObject(item);
        const ticker = stringValue(firstValue(row, ["ticker", "symbol", "asset_ticker", "name"]), "Asset");
        const move = formatPct(firstValue(row, ["change_pct", "move_pct", "pct_change", "performance_pct"]));
        const reason = stringValue(firstValue(row, ["reason", "summary", "label", "direction"]), "");

        return (
          <div
            key={`${ticker}-${index}`}
            style={{
              display: "grid",
              gridTemplateColumns: "72px 1fr auto",
              alignItems: "center",
              gap: 8,
              minHeight: 34,
              fontSize: 13,
            }}
          >
            <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontWeight: 800 }}>{ticker}</span>
            <span style={{ color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {reason || "Mouvement overnight"}
            </span>
            <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontWeight: 800, color: move?.startsWith("-") ? T.burgundy : T.green }}>
              {move || "-"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OvernightActivity({ value }: { value: unknown }) {
  if (typeof value === "string" && value.trim()) {
    return <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: T.ink }}>{value}</p>;
  }

  const rows = asArray(value).slice(0, 4);
  if (rows.length === 0) {
    const record = asObject(value);
    const summary = firstValue(record, ["summary", "text", "description", "activity"]);
    return <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: T.ink }}>{stringValue(summary, "Pas d'activite overnight notable.")}</p>;
  }

  return (
    <div style={{ display: "grid", gap: 7 }}>
      {rows.map((item, index) => {
        const row = asObject(item);
        const text = stringValue(firstValue(row, ["summary", "text", "description", "event", "label"]), "Evenement overnight");
        return <div key={index} style={{ fontSize: 13, lineHeight: 1.4, color: T.ink }}>{text}</div>;
      })}
    </div>
  );
}

export default function MorningBriefCard() {
  const [inWindow, setInWindow] = useState(() => isParisMorningWindow());
  const [brief, setBrief] = useState<BriefRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setInWindow(isParisMorningWindow()), 60_000);
    return () => window.clearTimeout(timeout);
  }, []);

  const load = useCallback(async () => {
    if (!isParisMorningWindow()) {
      setInWindow(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/cio/morning-brief");
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || `HTTP ${response.status}`);
      setBrief(getBriefPayload(body?.brief));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement brief du matin");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!inWindow) return;
    const timeout = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [inWindow, load]);

  const view = useMemo(() => {
    const regime = asObject(firstValue(brief || {}, ["market_regime_detail", "market_regime"]));
    const regimeValue = firstValue(brief || {}, ["market_regime", "regime"]) ?? firstValue(regime, ["regime", "market_regime"]);
    return {
      marketRegime: stringValue(regimeValue, "NEUTRAL"),
      cioVerdict: stringValue(firstValue(brief || {}, ["cio_verdict", "verdict", "cio_recommendation", "recommendation"]), "Verdict CIO indisponible."),
      topMovers: firstValue(brief || {}, ["top_movers", "movers", "topMovers", "market_movers"]),
      overnightActivity: firstValue(brief || {}, ["overnight_activity", "overnight_summary", "overnight", "overnight_events"]),
      riskPosture: stringValue(firstValue(brief || {}, ["risk_posture", "riskPosture", "risk_level", "portfolio_risk"]), "Posture risque indisponible."),
      updatedAt: formatParisTime(firstValue(brief || {}, ["generated_at", "updated_at", "created_at"])),
    };
  }, [brief]);

  if (!inWindow) return null;

  return (
    <section style={{ maxWidth: 440, margin: "0 auto", padding: "14px 14px 10px" }}>
      <div
        style={{
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          background: T.bgCanvas,
          padding: 14,
          boxShadow: "0 10px 28px rgba(10,10,10,0.06)",
        }}
      >
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 850, textTransform: "uppercase", color: T.green, letterSpacing: "0.08em" }}>
              CIO morning review
            </div>
            <h2 style={{ margin: "5px 0 0", fontFamily: "var(--font-fraunces), serif", fontSize: 24, lineHeight: 1.05, color: T.ink }}>
              Bonjour Olivier - Brief du matin
            </h2>
            <div style={{ marginTop: 6, fontSize: 12, color: T.muted }}>
              Visible 06:00-12:00 Europe/Paris{view.updatedAt ? ` - maj ${view.updatedAt}` : ""}
            </div>
          </div>
          <button
            type="button"
            aria-label="Rafraichir le brief du matin"
            onClick={load}
            disabled={loading}
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: T.bgSurface,
              color: T.green,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.65 : 1,
              flexShrink: 0,
            }}
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
        </header>

        {loading && !brief && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: T.bgSoft, fontSize: 13, color: T.muted }}>
            Chargement du brief deterministe...
          </div>
        )}
        {error && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "#F7EAEA", fontSize: 13, color: T.burgundy, fontWeight: 700 }}>
            {error}
          </div>
        )}

        {brief && !error && (
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <div style={{ display: "grid", gap: 10 }}>
              <SummaryBlock label="Market regime" value={view.marketRegime} tone="green" />
              <SummaryBlock label="CIO verdict" value={view.cioVerdict} />
              <SummaryBlock label="Risk posture" value={view.riskPosture} tone="risk" />
            </div>

            <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, background: T.bgSurface, padding: 12 }}>
              <div style={{ marginBottom: 8, fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: T.muted, letterSpacing: "0.06em" }}>
                Top movers
              </div>
              <TopMovers value={view.topMovers} />
            </div>

            <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, background: T.bgSurface, padding: 12 }}>
              <div style={{ marginBottom: 8, fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: T.muted, letterSpacing: "0.06em" }}>
                Overnight activity
              </div>
              <OvernightActivity value={view.overnightActivity} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
