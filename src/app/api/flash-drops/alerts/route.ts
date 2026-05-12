import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getFlashDropPriority, type FlashDropPriority } from "@/lib/flashDropPriority";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

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
  in_watchlist: boolean;
  in_portfolio: boolean;
  is_tier1_watchlist: boolean;
  priority: FlashDropPriority;
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

type FlashDropContext = {
  watchlistAssetIds: Set<string>;
  watchlistTickers: Set<string>;
  tier1AssetIds: Set<string>;
  tier1Tickers: Set<string>;
  portfolioAssetIds: Set<string>;
  portfolioTickers: Set<string>;
};

const emptyContext = (): FlashDropContext => ({
  watchlistAssetIds: new Set(),
  watchlistTickers: new Set(),
  tier1AssetIds: new Set(),
  tier1Tickers: new Set(),
  portfolioAssetIds: new Set(),
  portfolioTickers: new Set(),
});

function addAssetKey(set: Set<string>, value: unknown) {
  if (typeof value === "string" && value) set.add(value);
}

function addTickerKey(set: Set<string>, value: unknown) {
  if (typeof value === "string" && value) set.add(value.toUpperCase());
}

function isTier1(value: unknown) {
  return typeof value === "string" && ["TIER1", "TIER_1", "TIER1_CORE", "CORE", "QUALITY"].includes(value.toUpperCase());
}

async function loadContext(supabase: ReturnType<typeof sb>): Promise<FlashDropContext> {
  const context = emptyContext();

  const portfolioRes = await supabase.rpc("fn_get_positions_for_user", {
    p_user_id: USER_ID_DEV,
    p_account_filter: null,
    p_limit: 300,
  });

  if (!portfolioRes.error) {
    for (const row of portfolioRes.data || []) {
      addAssetKey(context.portfolioAssetIds, row.asset_id);
      addTickerKey(context.portfolioTickers, row.ticker);
    }
  }

  const watchlistsRes = await supabase.rpc("fn_get_watchlists_for_user", {
    p_user_id: USER_ID_DEV,
  });

  if (watchlistsRes.error) return context;

  for (const watchlist of (watchlistsRes.data || []).slice(0, 20)) {
    const payloadRes = await supabase.rpc("fn_get_watchlist_payload_for_user", {
      p_user_id: USER_ID_DEV,
      p_watchlist_id: watchlist.id,
      p_limit: 300,
    });
    if (payloadRes.error) continue;

    const watchlistTier1 = isTier1(watchlist.tier) || isTier1(watchlist.kind) || isTier1(watchlist.name);
    for (const item of payloadRes.data || []) {
      addAssetKey(context.watchlistAssetIds, item.asset_id);
      addTickerKey(context.watchlistTickers, item.ticker);
      if (watchlistTier1 || isTier1(item.tier) || isTier1(item.priority_tier)) {
        addAssetKey(context.tier1AssetIds, item.asset_id);
        addTickerKey(context.tier1Tickers, item.ticker);
      }
    }
  }

  return context;
}

function directMap(row: Record<string, unknown>, context: FlashDropContext): FlashDropAlertRow {
  const id = String(row.id);
  const ticker = String(row.ticker || "UNKNOWN");
  const assetId = typeof row.asset_id === "string" ? row.asset_id : null;
  const signalStrength = String(row.signal_strength || "MEDIUM") as FlashDropAlertRow["signal_strength"];
  const intraday = typeof row.intraday_change_pct === "number" ? row.intraday_change_pct : null;
  const closeToClose = typeof row.close_to_close_pct === "number" ? row.close_to_close_pct : null;
  const priceVsVwap = typeof row.price_vs_vwap_pct === "number" ? row.price_vs_vwap_pct : null;
  const primaryDrop = intraday ?? closeToClose ?? priceVsVwap;
  const opportunityScore = scoreFor(signalStrength);
  const tickerKey = ticker.toUpperCase();
  const inWatchlist = (assetId ? context.watchlistAssetIds.has(assetId) : false) || context.watchlistTickers.has(tickerKey);
  const inPortfolio = (assetId ? context.portfolioAssetIds.has(assetId) : false) || context.portfolioTickers.has(tickerKey);
  const isTier1Watchlist = (assetId ? context.tier1AssetIds.has(assetId) : false) || context.tier1Tickers.has(tickerKey);
  const priority = getFlashDropPriority({
    signal_strength: signalStrength,
    in_watchlist: inWatchlist,
    in_portfolio: inPortfolio,
    is_tier1_watchlist: isTier1Watchlist,
    opportunity_score: opportunityScore,
  });

  return {
    id,
    ticker,
    alert_kind: "FLASH_DROP",
    status: "NEW",
    severity: severityFor(signalStrength),
    opportunity_score: opportunityScore,
    created_at: String(row.detected_at || row.created_at || new Date().toISOString()),
    price: typeof row.price === "number" ? row.price : null,
    intraday_change_pct: intraday,
    close_to_close_pct: closeToClose,
    price_vs_vwap_pct: priceVsVwap,
    signal_strength: signalStrength,
    trigger_reason: typeof row.trigger_reason === "string" ? row.trigger_reason : null,
    deeplink_url: `/aujourdhui?alert=${encodeURIComponent(id)}`,
    message_text: `${ticker} flash drop ${primaryDrop ?? "?"}% detected`,
    in_watchlist: inWatchlist,
    in_portfolio: inPortfolio,
    is_tier1_watchlist: isTier1Watchlist,
    priority,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 1), 50);
    const supabase = sb();
    const context = await loadContext(supabase);
    const viewRes = await supabase
      .from("vw_flash_drop_actionable_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!viewRes.error) {
      return NextResponse.json({
        alerts: (viewRes.data || []).map((row) => directMap(row as Record<string, unknown>, context)),
      });
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
      alerts: (directRes.data || []).map((row) => directMap(row as Record<string, unknown>, context)),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/flash-drops/alerts GET] error:", err);
    return NextResponse.json({ error: message, alerts: [] }, { status: 500 });
  }
}
