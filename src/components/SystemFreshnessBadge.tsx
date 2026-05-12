"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

type FreshnessRecord = Record<string, unknown>;

const palette = {
  ok: {
    label: "A jour",
    border: "#B7D6BE",
    bg: "#EEF7EF",
    color: "#1F4A2E",
  },
  stale: {
    label: "Données de clôture",
    border: "#E5C878",
    bg: "#FFF8E6",
    color: "#7A5A00",
  },
  pipeline: {
    label: "Mise à jour en attente",
    border: "#E2A15D",
    bg: "#FFF1E2",
    color: "#8A4B0B",
  },
};

function asObject(value: unknown): FreshnessRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as FreshnessRecord : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function payload(raw: unknown): FreshnessRecord {
  if (Array.isArray(raw)) return asObject(raw[0]);
  return asObject(raw);
}

function firstValue(record: FreshnessRecord, keys: string[]) {
  return keys.map((key) => record[key]).find((value) => value !== undefined && value !== null);
}

function text(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "OK" : "Non";
  return fallback;
}

function friendlyError(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw || raw.toLowerCase() === "internal error" || raw.startsWith("HTTP ")) {
    return "Erreur de refresh";
  }
  if (!raw || raw.toLowerCase() === "internal error") {
    return "Données de fraîcheur indisponibles";
  }
  if (raw.startsWith("HTTP ")) {
    return "Pipeline freshness temporairement indisponible";
  }
  return raw;
}

function displayText(value: unknown, fallback = "-") {
  const valueText = friendlyError(text(value, fallback));
  const raw = valueText.toLowerCase();
  if (raw.includes("pipeline")) return "Mise à jour en attente";
  if (raw.includes("stale") || raw.includes("delay") || raw.includes("warn")) {
    return isMarketOpen() ? "Mise à jour en attente" : "Données de clôture";
  }
  return valueText;
}

function optionalMessage(value: unknown) {
  const raw = text(value, "");
  return raw ? friendlyError(raw) : "";
}

function fallbackRecord(message: string): FreshnessRecord {
  return {
    status: "stale",
    badge: "Erreur de refresh",
    label: "Erreur de refresh",
    message,
    last_pipeline_run: null,
    flash_scout_freshness: message,
    stale_tickers: [],
    details: {
      last_pipeline_run: null,
      flash_scout_freshness: message,
      source: "frontend_fallback",
    },
  };
}

function formatTime(value: unknown) {
  if (typeof value !== "string") return text(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeStatus(record: FreshnessRecord): keyof typeof palette {
  const raw = String(firstValue(record, ["overall_status", "status", "badge"]) || "").toLowerCase();
  if (raw.includes("pipeline")) return "pipeline";
  if (raw.includes("stale") || raw.includes("warn") || raw.includes("delay")) return "stale";
  return "ok";
}

function parisNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
}

function isMarketOpen(date = parisNow()) {
  const day = date.getDay();
  const minutes = date.getHours() * 60 + date.getMinutes();
  return day >= 1 && day <= 5 && minutes >= 9 * 60 && minutes < 22 * 60;
}

function hasRefreshError(record: FreshnessRecord, details: FreshnessRecord, message: string, error: string | null) {
  const source = String(firstValue(details, ["source"]) || "").toLowerCase();
  const raw = [
    firstValue(record, ["status", "badge", "label", "error"]),
    firstValue(details, ["status", "error"]),
    message,
    error,
  ].map((value) => String(value || "").toLowerCase()).join(" ");
  return Boolean(error)
    || source.includes("fallback")
    || raw.includes("internal error")
    || raw.includes("rpc")
    || raw.includes("indisponible")
    || raw.includes("failed")
    || raw.includes("error");
}

function userLabel(record: FreshnessRecord, details: FreshnessRecord, message: string, error: string | null) {
  if (hasRefreshError(record, details, message, error)) return "Erreur de refresh";
  const status = normalizeStatus(record);
  if (status === "ok") return "À jour";
  return isMarketOpen() ? "Mise à jour en attente" : "Données de clôture";
}

function userExplanation(label: string, technicalMessage: string) {
  if (label === "Erreur de refresh") return technicalMessage || "Le contrôle de fraîcheur est temporairement indisponible.";
  if (label === "Mise à jour en attente") return "Les marchés semblent ouverts; les dernières données attendent un refresh.";
  if (label === "Données de clôture") return "Marché fermé: les données affichées correspondent probablement à la dernière clôture disponible.";
  return "Les dernières données disponibles sont fraîches.";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 3 }}>
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#6B6B6B", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.35, color: "#0A0A0A", fontWeight: 650 }}>
        {value}
      </div>
    </div>
  );
}

export default function SystemFreshnessBadge() {
  const [freshness, setFreshness] = useState<FreshnessRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/system/freshness-badge");
      const body = await response.json();
      if (!response.ok) {
        const message = friendlyError(body?.error || `HTTP ${response.status}`);
        setFreshness(fallbackRecord(message));
        setError(message);
        return;
      }
      const nextFreshness = payload(body?.freshness);
      setFreshness(Object.keys(nextFreshness).length > 0
        ? nextFreshness
        : fallbackRecord("Données de fraîcheur indisponibles"));
    } catch (err) {
      const message = friendlyError(err instanceof Error ? err.message : null);
      setFreshness(fallbackRecord(message));
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const view = useMemo(() => {
    const record = freshness || {};
    const status = error ? "stale" : normalizeStatus(record);
    const details = asObject(firstValue(record, ["details", "freshness", "pipeline_freshness"]));
    const staleTickers = asArray(firstValue(record, ["stale_tickers", "tickers_stale"]));
    const technicalMessage = optionalMessage(firstValue(record, ["message", "error"]) ?? firstValue(details, ["message", "error"]));
    const label = loading && !freshness ? "..." : userLabel(record, details, technicalMessage, error);
    return {
      status,
      tone: palette[status],
      label,
      lastPipelineRun: formatTime(firstValue(record, ["last_pipeline_run", "pipeline_last_run", "last_run_at"]) ?? firstValue(details, ["last_pipeline_run", "last_run_at"])),
      flashScoutFreshness: displayText(firstValue(record, ["flash_scout_freshness", "flash_scout_status"]) ?? firstValue(details, ["flash_scout_freshness", "flash_scout_status"])),
      message: loading && !freshness ? "" : userExplanation(label, technicalMessage),
      staleTickers: staleTickers.map((item) => text(item)).filter((item) => item !== "-").slice(0, 8),
    };
  }, [error, freshness, loading]);

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="État des données"
        aria-label="État des données"
        style={{
          minHeight: 32,
          maxWidth: 148,
          borderRadius: 999,
          border: `1px solid ${view.tone.border}`,
          background: view.tone.bg,
          color: view.tone.color,
          padding: "0 9px",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          fontWeight: 850,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 999, background: view.tone.color, flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{view.label}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Détails de fraîcheur des données"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: "rgba(10,10,10,0.28)",
            padding: 14,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              marginTop: 78,
              width: "100%",
              maxWidth: 380,
              borderRadius: 10,
              border: "1px solid #D4CCB8",
              background: "#FFFFFF",
              boxShadow: "0 18px 54px rgba(10,10,10,0.18)",
              padding: 14,
            }}
          >
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 850, textTransform: "uppercase", color: "#6B6B6B", letterSpacing: "0.08em" }}>
                  Fraîcheur des données
                </div>
                <div style={{ marginTop: 3, fontSize: 18, fontWeight: 850, color: view.tone.color }}>
                  {view.label}
                </div>
              </div>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setOpen(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  border: "1px solid #D4CCB8",
                  background: "#FBF9F4",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </header>

            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
              {(error || view.message) && (
                <div style={{ borderRadius: 8, background: "#F7EAEA", color: "#7A2E2E", padding: 10, fontSize: 12, fontWeight: 700 }}>
                  {error || view.message}
                </div>
              )}
              <DetailRow label="Dernier pipeline" value={view.lastPipelineRun} />
              <DetailRow label="Flash scout" value={view.flashScoutFreshness} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#6B6B6B", letterSpacing: "0.06em" }}>
                  Tickers à rafraîchir
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>
                  {view.staleTickers.length === 0 ? (
                    <span style={{ fontSize: 13, color: "#6B6B6B" }}>Aucun ticker à rafraîchir.</span>
                  ) : view.staleTickers.map((ticker) => (
                    <span
                      key={ticker}
                      style={{
                        borderRadius: 999,
                        border: "1px solid #E5C878",
                        background: "#FFF8E6",
                        color: "#7A5A00",
                        padding: "4px 7px",
                        fontSize: 11,
                        fontWeight: 850,
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                      }}
                    >
                      {ticker}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
