import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

type ManualPricePayload = {
  ticker?: string;
  price?: number;
  priceDate?: string;
  currency?: string;
};

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

export async function GET() {
  try {
    const supabase = sb();
    const { data, error } = await supabase.rpc("fn_assets_needing_manual_pricing");
    if (error) throw error;

    return NextResponse.json({ assets: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/pricing/manual GET] error:", err);
    return NextResponse.json({ error: message, assets: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ManualPricePayload;
    const ticker = String(body.ticker || "").trim().toUpperCase();
    const currency = String(body.currency || "").trim().toUpperCase();
    const price = Number(body.price);
    const priceDate = String(body.priceDate || "").trim();

    if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });
    if (!currency) return NextResponse.json({ error: "currency required" }, { status: 400 });
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "price must be positive" }, { status: 400 });
    }
    if (!priceDate || Number.isNaN(new Date(priceDate).getTime())) {
      return NextResponse.json({ error: "priceDate required" }, { status: 400 });
    }

    const supabase = sb();
    const { data, error } = await supabase.rpc("fn_record_manual_price", {
      p_user_id: USER_ID_DEV,
      p_ticker: ticker,
      p_price: price,
      p_price_date: priceDate,
      p_currency: currency,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, result: data || null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/pricing/manual POST] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
