import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

function supabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Supabase environment missing", alerts: [] }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
    const client = supabase();

    const live = await client.rpc("fn_alerts_with_live_price", {
      p_user_id: USER_ID_DEV,
    });

    if (!live.error) {
      const rows = Array.isArray(live.data) ? live.data : live.data ? [live.data] : [];
      return NextResponse.json({ alerts: rows.slice(0, limit) });
    }

    const fallback = await client
      .from("investment_alerts")
      .select("id,ticker,alert_kind,status,severity,opportunity_score,price,current_price,created_at,updated_at")
      .in("status", ["NEW", "SEEN"])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (fallback.error) throw fallback.error;
    return NextResponse.json({ alerts: fallback.data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/today/alerts] error:", err);
    return NextResponse.json({ error: message, alerts: [] }, { status: 500 });
  }
}
