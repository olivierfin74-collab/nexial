import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildOpportunityFeedItem, rankOpportunityFeed } from "@/lib/opportunityFeed";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

function addTicker(set: Set<string>, value: unknown) {
  if (typeof value === "string" && value) set.add(value.toUpperCase());
}

function isTier1(value: unknown) {
  return typeof value === "string" && ["TIER1", "TIER_1", "TIER1_CORE", "CORE", "QUALITY"].includes(value.toUpperCase());
}

async function loadContext(supabase: ReturnType<typeof sb>) {
  const watchlistTickers = new Set<string>();
  const portfolioTickers = new Set<string>();
  const tier1Tickers = new Set<string>();
  const names = new Map<string, string>();

  const portfolioRes = await supabase.rpc("fn_get_positions_for_user", {
    p_user_id: USER_ID_DEV,
    p_account_filter: null,
    p_limit: 300,
  });
  if (!portfolioRes.error) {
    for (const row of portfolioRes.data || []) {
      addTicker(portfolioTickers, row.ticker);
      if (typeof row.ticker === "string" && typeof row.asset_name === "string") names.set(row.ticker.toUpperCase(), row.asset_name);
    }
  }

  const watchlistsRes = await supabase.rpc("fn_get_watchlists_for_user", {
    p_user_id: USER_ID_DEV,
  });
  if (!watchlistsRes.error) {
    for (const watchlist of (watchlistsRes.data || []).slice(0, 20)) {
      const payloadRes = await supabase.rpc("fn_get_watchlist_payload_for_user", {
        p_user_id: USER_ID_DEV,
        p_watchlist_id: watchlist.id,
        p_limit: 300,
      });
      if (payloadRes.error) continue;

      const watchlistTier1 = isTier1(watchlist.tier) || isTier1(watchlist.kind) || isTier1(watchlist.name);
      for (const item of payloadRes.data || []) {
        addTicker(watchlistTickers, item.ticker);
        if (typeof item.ticker === "string" && typeof item.asset_name === "string") names.set(item.ticker.toUpperCase(), item.asset_name);
        if (watchlistTier1 || isTier1(item.tier) || isTier1(item.priority_tier)) addTicker(tier1Tickers, item.ticker);
      }
    }
  }

  return { watchlistTickers, portfolioTickers, tier1Tickers, names };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 20), 1), 50);
    const supabase = sb();

    const [eventsRes, laddersRes, regimeRes, context] = await Promise.all([
      supabase.from("flash_drop_events").select("*").order("detected_at", { ascending: false }).limit(100),
      supabase.from("ladder_plans").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("vw_latest_market_regime").select("*").maybeSingle(),
      loadContext(supabase),
    ]);

    if (eventsRes.error && eventsRes.error.code !== "42P01") throw eventsRes.error;
    if (laddersRes.error && laddersRes.error.code !== "42P01") throw laddersRes.error;
    if (regimeRes.error && !["42P01", "PGRST116"].includes(regimeRes.error.code || "")) throw regimeRes.error;

    const regime = typeof regimeRes.data?.regime === "string" ? regimeRes.data.regime : "NEUTRAL";
    const laddersByEvent = new Map(
      (laddersRes.data || []).map((plan) => [plan.flash_drop_event_id, plan]),
    );

    const items = (eventsRes.data || []).map((event) => {
      const ticker = String(event.ticker || "UNKNOWN").toUpperCase();
      const ladder = laddersByEvent.get(event.id);

      return buildOpportunityFeedItem({
        id: event.id,
        ticker,
        name: context.names.get(ticker) || null,
        price: event.price,
        intraday_change_pct: event.intraday_change_pct,
        close_to_close_pct: event.close_to_close_pct,
        price_vs_vwap_pct: event.price_vs_vwap_pct,
        signal_strength: event.signal_strength,
        trigger_reason: event.trigger_reason,
        in_watchlist: context.watchlistTickers.has(ticker),
        in_portfolio: context.portfolioTickers.has(ticker),
        is_tier1_watchlist: context.tier1Tickers.has(ticker),
        regime,
        ladder: ladder ? {
          z1_price: ladder.z1_price,
          z2_price: ladder.z2_price,
          z3_price: ladder.z3_price,
          z1_weight: ladder.z1_weight,
          z2_weight: ladder.z2_weight,
          z3_weight: ladder.z3_weight,
        } : null,
      });
    });

    return NextResponse.json({
      items: rankOpportunityFeed(items).slice(0, limit),
      regime,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/opportunities/feed GET] error:", err);
    return NextResponse.json({ error: message, items: [], regime: "NEUTRAL" }, { status: 500 });
  }
}
