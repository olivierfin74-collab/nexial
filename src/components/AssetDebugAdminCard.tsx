"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Wrench, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type DebugPayload = Record<string, unknown> | unknown[] | string | number | boolean | null;

type SectionConfig = {
  title: string;
  keys: string[];
};

const sections: SectionConfig[] = [
  { title: "Asset", keys: ["asset", "asset_row", "asset_detail", "security"] },
  { title: "Position", keys: ["position", "positions", "portfolio"] },
  { title: "Signal", keys: ["signal", "signals", "technical_signal"] },
  { title: "Price History", keys: ["price_history", "prices", "history", "price_events"] },
  { title: "Alerts", keys: ["alerts", "active_alerts"] },
  { title: "Events", keys: ["events", "recent_events", "market_events"] },
];

function hasAdminAccess(metadata: Record<string, unknown> | undefined) {
  return (
    metadata?.role === "admin" ||
    metadata?.user_role === "admin" ||
    metadata?.is_admin === true
  );
}

function readPath(value: DebugPayload, keys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  return keys.map((key) => record[key]).find((item) => item !== undefined);
}

function sectionValue(debug: DebugPayload, section: SectionConfig) {
  const direct = readPath(debug, section.keys);
  if (direct !== undefined) return direct;
  return section.title === "Asset" ? debug : null;
}

function stringify(value: unknown) {
  if (value === null || value === undefined) return "null";
  return JSON.stringify(value, null, 2);
}

export default function AssetDebugAdminCard({ ticker }: { ticker: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkedAccess, setCheckedAccess] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<DebugPayload>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Asset: true,
    Position: true,
    Signal: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      const appMetadata = user?.app_metadata as Record<string, unknown> | undefined;
      const userMetadata = user?.user_metadata as Record<string, unknown> | undefined;
      setIsAdmin(hasAdminAccess(appMetadata) || hasAdminAccess(userMetadata));
      setCheckedAccess(true);
    }

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function loadDebug() {
    setOpen(true);
    setError(null);

    if (debug || loading) return;

    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError("Session admin introuvable.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/asset/${encodeURIComponent(ticker)}/debug`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error || "Debug lookup failed");
      }

      setDebug(body?.debug ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Debug lookup failed");
    } finally {
      setLoading(false);
    }
  }

  if (!checkedAccess || !isAdmin) return null;

  return (
    <section
      style={{
        margin: "0 20px 14px",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <button
        type="button"
        onClick={loadDebug}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          minHeight: 40,
          padding: "0 12px",
          borderRadius: 8,
          border: "1px solid #A89E84",
          background: "#FFFFFF",
          color: "#0A0A0A",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        <Wrench size={16} aria-hidden="true" />
        Debug
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Debug ${ticker}`}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(10, 10, 10, 0.42)",
            padding: 12,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 720,
              maxHeight: "86vh",
              overflow: "auto",
              borderRadius: 10,
              border: "1px solid #A89E84",
              background: "#FBF9F4",
              boxShadow: "0 24px 60px rgba(0,0,0,0.24)",
            }}
          >
            <header
              style={{
                position: "sticky",
                top: 0,
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 16px",
                borderBottom: "1px solid #D4CCB8",
                background: "#FBF9F4",
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: 12, color: "#6B6B6B", fontWeight: 700 }}>
                  Admin debug
                </p>
                <h2 style={{ margin: "2px 0 0", fontSize: 18, lineHeight: 1.2 }}>
                  {ticker.toUpperCase()}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setOpen(false)}
                style={{
                  width: 38,
                  height: 38,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  border: "1px solid #A89E84",
                  background: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div style={{ display: "grid", gap: 10, padding: 12 }}>
              {loading && (
                <p style={{ margin: 0, fontSize: 13, color: "#3A3A3A" }}>Chargement debug...</p>
              )}
              {error && (
                <p style={{ margin: 0, fontSize: 13, color: "#8A4040", fontWeight: 700 }}>
                  {error}
                </p>
              )}
              {!loading &&
                sections.map((section) => {
                  const isOpen = expanded[section.title] === true;
                  const value = sectionValue(debug, section);

                  return (
                    <article
                      key={section.title}
                      style={{
                        border: "1px solid #D4CCB8",
                        borderRadius: 8,
                        background: "#FFFFFF",
                        overflow: "hidden",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((current) => ({
                            ...current,
                            [section.title]: !isOpen,
                          }))
                        }
                        style={{
                          width: "100%",
                          minHeight: 44,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          padding: "0 12px",
                          border: 0,
                          background: "#FFFFFF",
                          cursor: "pointer",
                          textAlign: "left",
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#0A0A0A",
                        }}
                      >
                        {section.title}
                        <ChevronDown
                          size={16}
                          aria-hidden="true"
                          style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
                        />
                      </button>
                      {isOpen && (
                        <pre
                          style={{
                            margin: 0,
                            padding: 12,
                            borderTop: "1px solid #D4CCB8",
                            overflowX: "auto",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            fontSize: 11,
                            lineHeight: 1.45,
                            color: "#0A0A0A",
                            background: "#F8F5EC",
                          }}
                        >
                          {stringify(value)}
                        </pre>
                      )}
                    </article>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
