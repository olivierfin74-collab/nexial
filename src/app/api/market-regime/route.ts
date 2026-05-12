import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateMarketRegime, type MarketRegimeInput } from "@/lib/marketRegime";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

export async function GET() {
  try {
    const { data, error } = await sb()
      .from("vw_latest_market_regime")
      .select("*")
      .maybeSingle();

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST116") return NextResponse.json({ regime: null });
      throw error;
    }

    return NextResponse.json({ regime: data || null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/market-regime GET] error:", err);
    return NextResponse.json({ error: message, regime: null }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const input = await req.json().catch(() => ({})) as MarketRegimeInput;
    const regime = calculateMarketRegime(input);
    const { data, error } = await sb()
      .from("market_regime_history")
      .upsert(regime, { onConflict: "detected_date,source" })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ regime: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/market-regime POST] error:", err);
    return NextResponse.json({ error: message, regime: null }, { status: 500 });
  }
}
