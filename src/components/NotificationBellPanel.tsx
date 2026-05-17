"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, X } from "lucide-react";

type AlertRow = Record<string, unknown>;
type NormalizedAlert = ReturnType<typeof normalizeAlert>;

const DISMISSED_STORAGE_KEY = "nexial:dismissed_notifications:v1";
const DEBUG_LOCAL_ALERT_ID = "debug-local-alert-v1";
const DEBUG_BUILD_MARKER = "NOTIF DEBUG BUILD 3";

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

function stableKeyPart(input: unknown, fallback: string) {
  const raw = text(input, fallback).trim();
  return raw || fallback;
}

function normalizeStorageKey(input: unknown) {
  const raw = text(input, "").trim();
  return raw || null;
}

function stableFallbackKey(parts: unknown[]) {
  return parts
    .map((part, index) => stableKeyPart(part, index === 0 ? "asset" : index === 1 ? "alert" : "unknown"))
    .join("-");
}

function readDismissedNotifications() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = window.localStorage.getItem(DISMISSED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0));
  } catch {
    return new Set<string>();
  }
}

function writeDismissedNotifications(keys: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(keys)));
  } catch {
    // Local dismissal is best-effort; notifications must remain usable if storage is unavailable.
  }
}

async function clearPwaAppBadge() {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & {
    clearAppBadge?: () => Promise<void>;
    setAppBadge?: (contents?: number) => Promise<void>;
  };

  try {
    if (nav.clearAppBadge) {
      await nav.clearAppBadge();
      return;
    }
    if (nav.setAppBadge) await nav.setAppBadge(0);
  } catch {
    // PWA app badge support is optional and may be blocked by the browser.
  }
}

function shortKey(input: string | null) {
  if (!input) return "-";
  return input.length > 18 ? `${input.slice(0, 18)}...` : input;
}

function readStorageDebug(lastAction = "none", lastDismissedKey: string | null = null) {
  if (typeof window === "undefined") {
    return {
      lastAction,
      lastDismissedKey: shortKey(lastDismissedKey),
      storagePresent: false,
      dismissedCount: 0,
    };
  }

  const dismissed = readDismissedNotifications();
  return {
    lastAction,
    lastDismissedKey: shortKey(lastDismissedKey),
    storagePresent: window.localStorage.getItem(DISMISSED_STORAGE_KEY) != null,
    dismissedCount: dismissed.size,
  };
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
  const id = text(value(row, ["id", "alert_id", "investment_alert_id", "notification_id", "alert_uuid", "source_alert_id"]), "");
  const ticker = text(value(row, ["ticker", "symbol", "asset_ticker"]), "");
  const kind = text(value(row, ["alert_kind", "kind", "type", "alert_type"]), "");
  const price = formatPrice(value(row, ["live_price", "current_price", "price", "last_price"]));
  const delta = formatPct(value(row, ["delta_pct", "price_change_pct", "change_pct", "change_1d_pct"]));
  const createdAt = value(row, ["created_at", "detected_at", "updated_at", "signal_date"]);
  const label = text(value(row, ["label", "title", "headline", "message"]), "");
  const fallbackKey = stableFallbackKey([ticker, kind || label, createdAt || price || label || delta || severity]);
  const localKeys = [
    value(row, ["id"]),
    value(row, ["alert_id"]),
    value(row, ["investment_alert_id"]),
    value(row, ["notification_id"]),
    value(row, ["alert_uuid"]),
    value(row, ["source_alert_id"]),
    fallbackKey,
  ].map(normalizeStorageKey).filter((key): key is string => Boolean(key));
  const stableKey = localKeys[0] || fallbackKey;
  const hasDisplayContent = Boolean(id || ticker || kind || createdAt || price || delta || label);
  if (!hasDisplayContent) return null;
  return {
    id,
    localKey: stableKey,
    localKeys,
    ticker: text(ticker, "Alerte").toUpperCase(),
    kind: text(kind || label, "Signal"),
    status,
    severity,
    price,
    delta,
    createdAt,
    detailHref: id ? `/aujourdhui?alert=${encodeURIComponent(id)}` : null,
  };
}

export default function NotificationBellPanel({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [debugInfo, setDebugInfo] = useState(() => readStorageDebug());

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
    const dismissed = readDismissedNotifications();
    setDismissedKeys(dismissed);
    setDebugInfo(readStorageDebug("mount", Array.from(dismissed).at(-1) || null));
    const timeout = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const normalizedAlerts = useMemo(
    () => {
      const debugAlert: AlertRow = {
        id: DEBUG_LOCAL_ALERT_ID,
        asset: "TEST",
        ticker: "TEST",
        alertKind: "DEBUG_ALERT",
        alert_kind: "DEBUG_ALERT",
        label: "Alerte test locale",
        message: "Test bouton Vu / Ignorer",
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        status: "NEW",
        severity: "INFO",
      };

      return [debugAlert, ...alerts]
        .map(normalizeAlert)
        .filter((row): row is NonNullable<NormalizedAlert> => Boolean(row))
        .filter((row) => row.status === "NEW" || row.status === "SEEN");
    },
    [alerts],
  );

  const activeAlerts = useMemo(
    () => normalizedAlerts.filter((row) => !row.localKeys.some((key) => dismissedKeys.has(key))),
    [dismissedKeys, normalizedAlerts],
  );
  const rawCount = normalizedAlerts.length;
  const activeCount = activeAlerts.length;

  const handleDismiss = (alert: NonNullable<NormalizedAlert>, reason: "seen" | "dismissed") => {
    const next = new Set(dismissedKeys);
    alert.localKeys.forEach((key) => next.add(key));
    const nextActiveCount = normalizedAlerts.filter((row) => !row.localKeys.some((key) => next.has(key))).length;
    setDismissedKeys(next);
    writeDismissedNotifications(next);
    setDebugInfo(readStorageDebug(`${reason}/${alert.ticker}`, alert.localKey));
    if (nextActiveCount <= 0) void clearPwaAppBadge();
  };

  const actionButtonStyle = (danger = false) => ({
    border: danger ? "none" : `1px solid ${T.border}`,
    background: danger ? "transparent" : T.bgSurface,
    color: danger ? T.burgundy : T.ink,
    borderRadius: 8,
    minHeight: 44,
    minWidth: 52,
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 750,
    cursor: "pointer",
    opacity: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
    zIndex: 3,
    pointerEvents: "auto" as const,
    touchAction: "manipulation" as const,
    userSelect: "none" as const,
    WebkitTapHighlightColor: "rgba(95,34,34,0.14)",
  });

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
        {activeCount > 0 && (
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
            {compact ? Math.min(activeCount, 9) : ""}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(10,10,10,0.32)",
            padding: 12,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            pointerEvents: "auto",
          }}
        >
          <section
            style={{
              position: "relative",
              zIndex: 1001,
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
                  Notifications · Notif v2 · {DEBUG_BUILD_MARKER}
                </div>
                <h2 style={{ margin: "3px 0 0", fontSize: 20, lineHeight: 1.1, color: T.ink }}>
                  Dernières alertes
                </h2>
              </div>
              <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCanvas, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </header>

            <div style={{ display: "grid", gap: 8, padding: 12 }}>
              <div style={{ padding: "6px 8px", color: T.amber, fontSize: 11, fontWeight: 800 }}>
                Debug local alert active
              </div>
              <div
                data-notification-debug="build-3"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 4,
                  padding: 8,
                  borderRadius: 8,
                  border: `1px dashed ${T.border}`,
                  background: T.bgSoft,
                  color: T.muted,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                <span>raw alerts: {rawCount}</span>
                <span>active alerts: {activeCount}</span>
                <span>dismissed count: {debugInfo.dismissedCount}</span>
                <span>storage key: {debugInfo.storagePresent ? "yes" : "no"}</span>
                <span>last action: {debugInfo.lastAction}</span>
                <span>last key: {debugInfo.lastDismissedKey}</span>
              </div>
              {loading && <div style={{ padding: 14, color: T.muted, fontSize: 13 }}>Chargement...</div>}
              {error && <div style={{ padding: 10, borderRadius: 8, background: "#F7EAEA", color: T.burgundy, fontSize: 12, fontWeight: 700 }}>{error}</div>}
              {!loading && activeAlerts.length === 0 && (
                <div style={{ padding: 18, textAlign: "center", color: T.muted, fontSize: 13 }}>
                  Aucune alerte à traiter.
                </div>
              )}
              {activeAlerts.map((alert) => {
                const severityColor = alert.severity === "CRITICAL" || alert.severity === "HIGH" ? T.burgundy : alert.severity === "WARNING" ? T.amber : T.green;
                return (
                  <article data-notification-id={alert.localKey} key={alert.localKey} style={{ border: `1px solid ${T.border}`, borderRadius: 10, background: alert.status === "NEW" ? "#FFFDF5" : T.bgSoft, padding: 12 }}>
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
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10, position: "relative", zIndex: 2, pointerEvents: "auto" }}>
                      {alert.detailHref ? (
                        <a href={alert.detailHref} style={{ border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, textDecoration: "none", borderRadius: 8, minHeight: 44, padding: "10px 12px", fontSize: 12, fontWeight: 750, display: "inline-flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 3, pointerEvents: "auto", touchAction: "manipulation" }}>
                          Détail
                        </a>
                      ) : (
                        <button type="button" disabled title="Aucun détail disponible" style={{ border: `1px solid ${T.border}`, background: T.bgSurface, color: T.muted, borderRadius: 8, minHeight: 44, padding: "10px 12px", fontSize: 12, fontWeight: 750, cursor: "default", opacity: 0.72 }}>
                          Détail
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={false}
                        aria-label={`Marquer ${alert.ticker} comme vu`}
                        onClick={() => handleDismiss(alert, "seen")}
                        style={actionButtonStyle()}
                      >
                        Vu
                      </button>
                      <button
                        type="button"
                        disabled={false}
                        aria-label={`Ignorer ${alert.ticker}`}
                        onClick={() => handleDismiss(alert, "dismissed")}
                        style={actionButtonStyle(true)}
                      >
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
