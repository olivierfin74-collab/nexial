import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchExternalAssets } from "@/lib/providers/twelveDataSearch";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

/**
 * GET /api/assets/search?q=carrefour&limit=20
 *
 * Returns:
 * {
 *   internal: [...]   // matches from nx.assets (already in our DB)
 *   external: [...]   // matches from Twelve Data (not yet in our DB)
 *   external_search_available: boolean  // false if TWELVE_DATA_API_KEY missing
 * }
 *
 * Frontend should display internal first (instant, fully covered),
 * then external as "add to watchlist" candidates.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Number(searchParams.get("limit") || 20);

    if (!q || q.length < 2) {
      return NextResponse.json({
        internal: [],
        external: [],
        external_search_available: !!process.env.TWELVE_DATA_API_KEY,
      });
    }

    // 1. Internal search (always succeeds, instant)
    const supabase = sb();
    const { data: internalRows, error: internalErr } = await supabase.rpc(
      "fn_search_assets_internal",
      { p_query: q, p_limit: limit }
    );
    if (internalErr) throw internalErr;
    const internal = internalRows || [];

    // 2. External search (Twelve Data). Filters out tickers already in DB
    //    to avoid showing duplicates.
    const externalRaw = await searchExternalAssets(q, limit);
    const internalKeys = new Set(
      internal.map((r: any) => `${r.ticker}|${r.exchange_mic || ""}`)
    );
    const external = externalRaw.filter(
      (e) => !internalKeys.has(`${e.ticker}|${e.exchange_mic || ""}`)
    );

    return NextResponse.json({
      internal,
      external,
      external_search_available: !!process.env.TWELVE_DATA_API_KEY,
    });
  } catch (err: any) {
    console.error("[/api/assets/search] error:", err);
    return NextResponse.json(
      {
        error: err.message || "Internal error",
        internal: [],
        external: [],
        external_search_available: false,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assets/search
 * Body: { ticker, exchange_mic, asset_name, currency, exchange_region, asset_class?, sector?, data_source?, data_source_symbol?, isin? }
 *
 * Creates a user-added asset (coverage_level = NEXIAL_TRACKED).
 * Idempotent: returns existing asset_id if (ticker, exchange_mic) already exists.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const required = ["ticker", "exchange_mic", "asset_name", "currency", "exchange_region"];
    for (const k of required) {
      if (!body[k]) {
        return NextResponse.json({ error: `${k} required` }, { status: 400 });
      }
    }

    const supabase = sb();
    const { data: assetId, error } = await supabase.rpc("fn_create_user_asset", {
      p_user_id: "4c1610db-25cd-4eca-b16a-b5bb4898f4ff",
      p_ticker: body.ticker,
      p_exchange_mic: body.exchange_mic,
      p_asset_name: body.asset_name,
      p_currency: body.currency,
      p_exchange_region: body.exchange_region,
      p_asset_class: body.asset_class ?? "equity",
      p_sector: body.sector ?? null,
      p_data_source: body.data_source ?? "twelve_data",
      p_data_source_symbol: body.data_source_symbol ?? null,
      p_isin: body.isin ?? null,
    });
    if (error) throw error;

    return NextResponse.json({ asset_id: assetId });
  } catch (err: any) {
    console.error("[/api/assets/search POST] error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
