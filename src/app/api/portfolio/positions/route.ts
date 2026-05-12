import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

const num = (...values: unknown[]) => {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

const tickerKey = (value: unknown) => String(value || "").trim().toUpperCase();

function enrichPositionWithDetail(position: Record<string, unknown>, detail: Record<string, unknown> | null) {
  if (!detail) return position;

  const quantity = num(detail.held_quantity, position.total_quantity, position.quantity);
  const totalInvested = num(detail.total_invested);
  const avgCost = quantity && quantity > 0 && totalInvested !== null
    ? totalInvested / quantity
    : num(position.avg_cost_per_unit, position.avg_cost, position.average_cost);
  const currentPrice = num(detail.current_price, position.current_price, position.last_price);
  const marketValueNative = num(detail.current_market_value) ??
    (quantity !== null && currentPrice !== null ? quantity * currentPrice : num(position.market_value_native, position.market_value));
  const pnlNative = totalInvested !== null && marketValueNative !== null
    ? marketValueNative - totalInvested
    : num(position.unrealized_pnl_native, position.unrealized_pnl);
  const pnlPct = num(detail.pnl_pct) ??
    (avgCost !== null && avgCost > 0 && currentPrice !== null ? ((currentPrice - avgCost) / avgCost) * 100 : num(position.unrealized_pnl_pct));
  const previousNative = num(position.market_value_native, position.market_value);
  const previousEur = num(position.market_value_eur);
  const fxToEur = previousNative && previousNative > 0 && previousEur !== null ? previousEur / previousNative : null;
  const currency = String(detail.currency || position.asset_currency || position.currency || "").toUpperCase();
  const marketValueEur = currency === "EUR"
    ? marketValueNative
    : fxToEur !== null && marketValueNative !== null ? marketValueNative * fxToEur : previousEur;
  const pnlEur = currency === "EUR"
    ? pnlNative
    : fxToEur !== null && pnlNative !== null ? pnlNative * fxToEur : num(position.unrealized_pnl_eur);

  return {
    ...position,
    asset_id: detail.asset_id ?? position.asset_id,
    asset_name: detail.asset_name ?? position.asset_name,
    asset_currency: detail.currency ?? position.asset_currency,
    exchange_region: detail.exchange_region ?? position.exchange_region,
    sector: detail.sector ?? position.sector,
    total_quantity: quantity ?? position.total_quantity,
    avg_cost_per_unit: avgCost ?? position.avg_cost_per_unit,
    last_price: currentPrice ?? position.last_price,
    current_price: currentPrice ?? position.current_price,
    market_value_native: marketValueNative ?? position.market_value_native,
    market_value_eur: marketValueEur ?? position.market_value_eur,
    unrealized_pnl_native: pnlNative ?? position.unrealized_pnl_native,
    unrealized_pnl_eur: pnlEur ?? position.unrealized_pnl_eur,
    unrealized_pnl_pct: pnlPct ?? position.unrealized_pnl_pct,
    perf_1d_pct: detail.perf_1d_pct ?? position.perf_1d_pct,
    price_updated_at: detail.price_updated_at ?? detail.priced_at ?? detail.updated_at ?? position.price_updated_at,
    freshness_status: detail.freshness_status ?? position.freshness_status,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountFilter = searchParams.get("account_id");
    const limit = Number(searchParams.get("limit") || 100);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "nx" },
      auth: { persistSession: false },
    });

    const [positionsRes, summaryRes] = await Promise.all([
      supabase.rpc("fn_get_positions_for_user", {
        p_user_id: USER_ID_DEV,
        p_account_filter: accountFilter,
        p_limit: limit,
      }),
      supabase.rpc("fn_get_portfolio_summary_for_user", {
        p_user_id: USER_ID_DEV,
      }),
    ]);

    if (positionsRes.error) throw positionsRes.error;
    if (summaryRes.error) throw summaryRes.error;

    const positions = positionsRes.data || [];
    const tickers = Array.from(new Set(positions.map((row: Record<string, unknown>) => tickerKey(row.ticker)).filter(Boolean)));
    const detailResults = await Promise.all(
      tickers.map(async (ticker) => {
        const { data, error } = await supabase.rpc("fn_get_asset_detail_for_user", {
          p_user_id: USER_ID_DEV,
          p_ticker: ticker,
        });
        return error ? [ticker, null] : [ticker, data || null];
      })
    );
    const detailsByTicker = new Map(detailResults as [string, Record<string, unknown> | null][]);
    const enrichedPositions = positions.map((position: Record<string, unknown>) => (
      enrichPositionWithDetail(position, detailsByTicker.get(tickerKey(position.ticker)) || null)
    ));

    return NextResponse.json({
      positions: enrichedPositions,
      summary: summaryRes.data || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/portfolio/positions] error:", err);
    return NextResponse.json(
      { error: message, positions: [], summary: null },
      { status: 500 }
    );
  }
}
