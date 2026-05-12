import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type FlashDropAlertRow = {
  id: string;
  ticker: string;
  alert_kind: "FLASH_DROP";
  status: "NEW";
  severity: "MEDIUM" | "HIGH" | "CRITICAL";
  opportunity_score: number;
  created_at: string;
  price: number | null;
  intraday_change_pct: number | null;
  close_to_close_pct: number | null;
  price_vs_vwap_pct: number | null;
  signal_strength: "MEDIUM" | "HIGH" | "EXTREME";
  trigger_reason: string | null;
  deeplink_url: string;
  message_text: string;
};

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

function severityFor(signalStrength: string): FlashDropAlertRow["severity"] {
  if (signalStrength === "EXTREME") return "CRITICAL";
  if (signalStrength === "HIGH") return "HIGH";
  return "MEDIUM";
}

function scoreFor(signalStrength: string) {
  if (signalStrength === "EXTREME") return 90;
  if (signalStrength === "HIGH") return 75;
  return 60;
}

function directMap(row: Record<string, unknown>): FlashDropAlertRow {
  const id = String(row.id);
  const ticker = String(row.ticker || "UNKNOWN");
  const signalStrength = String(row.signal_strength || "MEDIUM") as FlashDropAlertRow["signal_strength"];
  const intraday = typeof row.intraday_change_pct === "number" ? row.intraday_change_pct : null;
  const closeToClose = typeof row.close_to_close_pct === "number" ? row.close_to_close_pct : null;
  const priceVsVwap = typeof row.price_vs_vwap_pct === "number" ? row.price_vs_vwap_pct : null;
  const primaryDrop = intraday ?? closeToClose ?? priceVsVwap;

  return {
    id,
    ticker,
    alert_kind: "FLASH_DROP",
    status: "NEW",
    severity: severityFor(signalStrength),
    opportunity_score: scoreFor(signalStrength),
    created_at: String(row.detected_at || row.created_at || new Date().toISOString()),
    price: typeof row.price === "number" ? row.price : null,
    intraday_change_pct: intraday,
    close_to_close_pct: closeToClose,
    price_vs_vwap_pct: priceVsVwap,
    signal_strength: signalStrength,
    trigger_reason: typeof row.trigger_reason === "string" ? row.trigger_reason : null,
    deeplink_url: `/aujourdhui?alert=${encodeURIComponent(id)}`,
    message_text: `${ticker} flash drop ${primaryDrop ?? "?"}% detected`,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 1), 50);
    const supabase = sb();
    const viewRes = await supabase
      .from("vw_flash_drop_actionable_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!viewRes.error) {
      return NextResponse.json({ alerts: viewRes.data || [] });
    }

    if (viewRes.error.code !== "42P01") throw viewRes.error;

    const directRes = await supabase
      .from("flash_drop_events")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(limit);

    if (directRes.error) {
      if (directRes.error.code === "42P01") return NextResponse.json({ alerts: [] });
      throw directRes.error;
    }

    return NextResponse.json({
      alerts: (directRes.data || []).map((row) => directMap(row as Record<string, unknown>)),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/flash-drops/alerts GET] error:", err);
    return NextResponse.json({ error: message, alerts: [] }, { status: 500 });
  }
}
