import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTradingContext, rankForTradingContext } from "@/lib/tradingContext";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 10);
    const context = getTradingContext(new Date(), searchParams.get("context"));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "nx" },
      auth: { persistSession: false },
    });

    const [opportunitiesRes, patrimoineRes] = await Promise.all([
      supabase.rpc("fn_get_today_opportunities_for_user", {
        p_user_id: USER_ID_DEV,
        p_limit: Math.max(limit * 3, limit),
      }),
      supabase.rpc("fn_get_patrimoine_summary_for_user", {
        p_user_id: USER_ID_DEV,
      }),
    ]);

    if (opportunitiesRes.error) throw opportunitiesRes.error;
    if (patrimoineRes.error) throw patrimoineRes.error;

    return NextResponse.json({
      context,
      opportunities: rankForTradingContext(opportunitiesRes.data || [], context.mode).slice(0, limit),
      patrimoine: patrimoineRes.data || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/today/dashboard] error:", err);
    return NextResponse.json(
      { error: message, opportunities: [], patrimoine: null },
      { status: 500 }
    );
  }
}
