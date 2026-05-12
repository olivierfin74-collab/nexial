"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, X } from "lucide-react";

type AlertRow = Record<string, unknown>;

const T = {
  bgCanvas: "#FBF9F4",
  bgSurface: "#FFFFFF",
  bgSoft: "#F8F5EC",
  border: "#D4CCB8",
  ink: "#0A0A0A",
  muted: "#6B6B6B",
  green: "#1F4A2E",
  burgundy: "#5F2222",
  amber: "#8B5E0A",
};

function value(row: AlertRow, keys: string[]) {
  return keys.map((key) => row[key]).find((item) => item !== undefined && item !== null && String(item).trim() !== "");
}

function text(input: unknown, fallback = "-") {
  if (typeof input === "string" && input.trim()) return input;
  if (typeof input === "number" && Number.isFinite(input)) return String(input);
  return fallback;
}

function numberValue(input: unknown) {
  const n = Number(input);
  return Number.isFinite(n) ? n : null;
}

function formatPrice(input: unknown) {
  const n = numberValue(input);
  return n == null ? null : n.toFixed(n >= 100 ? 2 : 3);
}

function formatPct(input: unknown) {
  const n = numberValue(input);
  if (n == null) return null;
  const normalized = Math.abs(n) <= 1 ? n * 100 : n;
  return `${normalized > 0 ? "+" : ""}${normalized.toFixed(1)}%`;
}

function relativeTime(input: unknown) {
  if (typeof input !== "string") return "-";
  const time = new Date(input).getTime();
  if (Number.isNaN(time)) return "-";
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 1) return "maintenant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.round(hours / 24)} j`;
}

function normalizeAlert(row: AlertRow) {
  const status = text(value(row, ["status"]), "NEW").toUpperCase();
  const severity = text(value(row, ["severity", "priority"]), "INFO").toUpperCase();
  const price = formatPrice(value(row, ["live_price", "current_price", "price", "last_price"]));
  const delta = formatPct(value(row, ["delta_pct", "price_change_pct", "change_pct", "change_1d_pct"]));
  return {
    id: text(value(row, ["id", "alert_id"]), ""),
    ticker: text(value(row, ["ticker", "symbol", "asset_ticker"]), "ASSET").toUpperCase(),
    kind: text(value(row, ["alert_kind", "kind", "type", "alert_type"]), "ALERT"),
    status,
    severity,
    price,
    delta,
    createdAt: value(row, ["created_at", "detected_at", "updated_at"]),
  };
}

export default function NotificationBellPanel({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications/alerts?limit=12");
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || `HTTP ${response.status}`);
      setAlerts(Array.isArray(body?.alerts) ? body.alerts : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Alertes indisponibles");
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

  const rows = useMemo(
    () => alerts.map(normalizeAlert).filter((row) => row.status === "NEW" || row.status === "SEEN"),
    [alerts],
  );
  const newCount = rows.filter((row) => row.status === "NEW").length;

  const runAction = async (alertId: string, action: "mark_seen" | "dismiss") => {
    if (!alertId) return;
    setBusyId(alertId);
    try {
      const response = await fetch("/api/notifications/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, action }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || `HTTP ${response.status}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen(true)}
        style={{
          position: "relative",
          width: compact ? 38 : 42,
          height: compact ? 38 : 42,
          borderRadius: compact ? 8 : "50%",
          border: compact ? `1px solid ${T.border}` : `1.5px solid ${T.ink}`,
          background: T.bgSurface,
          color: T.ink,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Bell size={compact ? 16 : 17} strokeWidth={2} />
        {newCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: compact ? -4 : 7,
              right: compact ? -4 : 8,
              minWidth: compact ? 18 : 8,
              height: compact ? 18 : 8,
              padding: compact ? "0 4px" : 0,
              borderRadius: 999,
              background: T.burgundy,
              color: "#FFFFFF",
              border: `2px solid ${T.bgCanvas}`,
              fontSize: 10,
              fontWeight: 800,
              lineHeight: compact ? "14px" : "4px",
            }}
          >
            {compact ? Math.min(newCount, 9) : ""}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            background: "rgba(10,10,10,0.32)",
            padding: 12,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          <section
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              maxHeight: "82vh",
              marginTop: 56,
              overflow: "auto",
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: T.bgSurface,
              boxShadow: "0 24px 60px rgba(10,10,10,0.22)",
            }}
          >
            <header style={{ position: "sticky", top: 0, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 14, borderBottom: `1px solid ${T.border}`, background: T.bgSurface }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 850, textTransform: "uppercase", color: T.muted, letterSpacing: "0.08em" }}>
                  Notifications
                </div>
                <h2 style={{ margin: "3px 0 0", fontSize: 20, lineHeight: 1.1, color: T.ink }}>
                  Dernieres alertes
                </h2>
              </div>
              <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCanvas, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </header>

            <div style={{ display: "grid", gap: 8, padding: 12 }}>
              {loading && <div style={{ padding: 14, color: T.muted, fontSize: 13 }}>Chargement...</div>}
              {error && <div style={{ padding: 10, borderRadius: 8, background: "#F7EAEA", color: T.burgundy, fontSize: 12, fontWeight: 700 }}>{error}</div>}
              {!loading && rows.length === 0 && (
                <div style={{ padding: 18, textAlign: "center", color: T.muted, fontSize: 13 }}>
                  Aucune alerte active.
                </div>
              )}
              {rows.map((alert) => {
                const isBusy = busyId === alert.id;
                const severityColor = alert.severity === "CRITICAL" || alert.severity === "HIGH" ? T.burgundy : alert.severity === "WARNING" ? T.amber : T.green;
                return (
                  <article key={alert.id || `${alert.ticker}-${alert.createdAt}`} style={{ border: `1px solid ${T.border}`, borderRadius: 10, background: alert.status === "NEW" ? "#FFFDF5" : T.bgSoft, padding: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "64px 1fr auto", gap: 8, alignItems: "start" }}>
                      <strong style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 13 }}>{alert.ticker}</strong>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{alert.kind}</div>
                        <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 7, fontSize: 11, color: T.muted }}>
                          <span>{relativeTime(alert.createdAt)}</span>
                          {alert.price && <span>prix {alert.price}</span>}
                          {alert.delta && <span style={{ color: alert.delta.startsWith("-") ? T.burgundy : T.green, fontWeight: 800 }}>{alert.delta}</span>}
                        </div>
                      </div>
                      <span style={{ borderRadius: 999, background: `${severityColor}14`, color: severityColor, padding: "3px 7px", fontSize: 10, fontWeight: 850 }}>
                        {alert.severity}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                      <a href={alert.id ? `/aujourdhui?alert=${encodeURIComponent(alert.id)}` : "/aujourdhui"} style={{ border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, textDecoration: "none", borderRadius: 7, padding: "7px 9px", fontSize: 12, fontWeight: 750 }}>
                        Detail
                      </a>
                      {alert.status === "NEW" && (
                        <button type="button" disabled={isBusy} onClick={() => runAction(alert.id, "mark_seen")} style={{ border: `1px solid ${T.border}`, background: T.bgSurface, borderRadius: 7, padding: "7px 9px", fontSize: 12, fontWeight: 750, cursor: isBusy ? "default" : "pointer", opacity: isBusy ? 0.6 : 1 }}>
                          Vu
                        </button>
                      )}
                      <button type="button" disabled={isBusy} onClick={() => runAction(alert.id, "dismiss")} style={{ border: "none", background: "transparent", color: T.burgundy, borderRadius: 7, padding: "7px 9px", fontSize: 12, fontWeight: 750, cursor: isBusy ? "default" : "pointer", opacity: isBusy ? 0.6 : 1 }}>
                        Ignorer
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
