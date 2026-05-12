import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

async function fallbackAlerts(limit: number) {
  return sb()
    .from("investment_alerts")
    .select("id,ticker,alert_kind,kind,status,severity,priority,opportunity_score,price,current_price,price_change_pct,delta_pct,created_at")
    .in("status", ["NEW", "SEEN"])
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Supabase environment missing", alerts: [] }, { status: 500 });
    }

    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 12), 30);
    const supabase = sb();
    const live = await supabase.rpc("fn_alerts_with_live_price", {
      p_user_id: USER_ID_DEV,
    });

    if (!live.error) {
      const rows = Array.isArray(live.data) ? live.data : live.data ? [live.data] : [];
      return NextResponse.json({ alerts: rows.slice(0, limit) });
    }

    const fallback = await fallbackAlerts(limit);
    if (fallback.error) throw fallback.error;
    return NextResponse.json({ alerts: fallback.data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/notifications/alerts GET] error:", err);
    return NextResponse.json({ error: message, alerts: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Supabase environment missing" }, { status: 500 });
    }

    const body = await req.json();
    const alertId = typeof body?.alertId === "string" ? body.alertId : "";
    const action = typeof body?.action === "string" ? body.action : "";

    if (!alertId) {
      return NextResponse.json({ error: "alertId required" }, { status: 400 });
    }

    const supabase = sb();
    if (action === "mark_seen") {
      const { error } = await supabase.rpc("fn_mark_alert_seen", { p_alert_id: alertId });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "dismiss") {
      const { error } = await supabase.rpc("fn_dismiss_alert", {
        p_alert_id: alertId,
        p_reason: "notification_bell_dismiss",
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/notifications/alerts POST] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
