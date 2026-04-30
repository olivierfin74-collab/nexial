import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

console.log("BOOT OK - update-market-data MASTER v5 EXTENDED READY");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const TWELVE_API_KEY =
  Deno.env.get("TWELVE_DATA_API_KEY") ??
  Deno.env.get("TWELVE_API_KEY");

const DEFAULT_MAX_ASSETS_PER_RUN = 25;
const DEFAULT_DELAY_MS = 800;
const INTERNAL_DELAY_MS = 150;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function fetchJson(url: URL) {
  const response = await fetch(url.toString());
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      status: "error",
      message: "INVALID_JSON",
      raw: text,
    };
  }
}

function computeChange(lastPrice: number, previousClose: number | null) {
  if (!previousClose || previousClose <= 0) {
    return {
      changeAbs: null,
      changePct: null,
    };
  }

  const changeAbs = lastPrice - previousClose;
  const changePct = (changeAbs / previousClose) * 100;

  return {
    changeAbs,
    changePct,
  };
}

function classifySession(quoteJson: any, sourcePriority: string) {
  if (quoteJson?.is_market_open === true) return "REGULAR";

  if (sourcePriority === "time_series_1min_prepost") {
    return "INTRADAY_OR_EXTENDED";
  }

  return "EXTENDED_OR_CLOSED";
}

function classifyExtendedDataStatus(sourcePriority: string, tsJson: any) {
  if (sourcePriority === "time_series_1min_prepost") {
    return "RELIABLE";
  }

  if (
    tsJson?.status === "error" &&
    tsJson?.code === 403 &&
    typeof tsJson?.message === "string" &&
    tsJson.message.toLowerCase().includes("pre-market")
  ) {
    return "UNAVAILABLE_ON_PLAN";
  }

  if (sourcePriority === "price_fallback") {
    return "LIMITED_FALLBACK";
  }

  return "UNKNOWN";
}

function getTimeSeriesDebug(tsJson: any) {
  return {
    status: tsJson?.status ?? "OK",
    code: tsJson?.code ?? null,
    message: tsJson?.message ?? null,
    meta_symbol: tsJson?.meta?.symbol ?? null,
    meta_interval: tsJson?.meta?.interval ?? null,
    meta_exchange: tsJson?.meta?.exchange ?? null,
    meta_type: tsJson?.meta?.type ?? null,
    values_count: Array.isArray(tsJson?.values) ? tsJson.values.length : 0,
    latest_datetime: tsJson?.values?.[0]?.datetime ?? null,
    latest_open: tsJson?.values?.[0]?.open ?? null,
    latest_high: tsJson?.values?.[0]?.high ?? null,
    latest_low: tsJson?.values?.[0]?.low ?? null,
    latest_close: tsJson?.values?.[0]?.close ?? null,
  };
}

async function fetchTwelveLive(asset: any) {
  const timeSeriesUrl = new URL("https://api.twelvedata.com/time_series");
  timeSeriesUrl.searchParams.set("symbol", asset.provider_symbol);
  timeSeriesUrl.searchParams.set("interval", "1min");
  timeSeriesUrl.searchParams.set("outputsize", "1");
  timeSeriesUrl.searchParams.set("prepost", "true");
  timeSeriesUrl.searchParams.set("apikey", TWELVE_API_KEY ?? "");

  const priceUrl = new URL("https://api.twelvedata.com/price");
  priceUrl.searchParams.set("symbol", asset.provider_symbol);
  priceUrl.searchParams.set("apikey", TWELVE_API_KEY ?? "");

  const quoteUrl = new URL("https://api.twelvedata.com/quote");
  quoteUrl.searchParams.set("symbol", asset.provider_symbol);
  quoteUrl.searchParams.set("apikey", TWELVE_API_KEY ?? "");

  const tsJson = await fetchJson(timeSeriesUrl);
  const tsDebug = getTimeSeriesDebug(tsJson);

  await sleep(INTERNAL_DELAY_MS);

  const quoteJson = await fetchJson(quoteUrl);
  const quoteHasError = quoteJson?.status === "error";

  const previousClose = quoteHasError ? null : toNumber(quoteJson?.previous_close);
  const openPrice = quoteHasError ? null : toNumber(quoteJson?.open);
  const currency = quoteHasError ? asset.currency : quoteJson?.currency ?? asset.currency;

  let livePrice: number | null = null;
  let sourcePriority = "none";
  let sourceError: unknown = null;
  let priceFallbackJson: any = null;

  if (tsJson?.status !== "error") {
    const latest = tsJson?.values?.[0];

    livePrice =
      toNumber(latest?.close) ??
      toNumber(latest?.price) ??
      toNumber(latest?.open);

    if (livePrice) {
      sourcePriority = "time_series_1min_prepost";
    }
  } else {
    sourceError = tsJson;
  }

  if (!livePrice) {
    await sleep(INTERNAL_DELAY_MS);

    priceFallbackJson = await fetchJson(priceUrl);

    if (priceFallbackJson?.status !== "error") {
      livePrice = toNumber(priceFallbackJson?.price);

      if (livePrice) {
        sourcePriority = "price_fallback";
      }
    } else {
      sourceError = priceFallbackJson;
    }
  }

  const extendedDataStatus = classifyExtendedDataStatus(sourcePriority, tsJson);

  if (!livePrice) {
    return {
      ok: false,
      reason: "NO_VALID_LIVE_OR_INTRADAY_PRICE",
      extendedDataStatus,
      raw: {
        source_priority: sourcePriority,
        extended_data_status: extendedDataStatus,
        source_error: sourceError,
        time_series_debug: tsDebug,
        time_series: tsJson,
        quote: quoteHasError ? null : quoteJson,
        quote_error: quoteHasError ? quoteJson : null,
        price_fallback: priceFallbackJson,
      },
    };
  }

  const { changeAbs, changePct } = computeChange(livePrice, previousClose);

  return {
    ok: true,
    lastPrice: livePrice,
    previousClose,
    openPrice,
    changeAbs,
    changePct,
    currency,
    marketSession: classifySession(quoteJson, sourcePriority),
    sourcePriority,
    extendedDataStatus,
    timeSeriesDebug: tsDebug,
    raw: {
      source_priority: sourcePriority,
      extended_data_status: extendedDataStatus,
      time_series_debug: tsDebug,
      time_series: tsJson,
      quote: quoteHasError ? null : quoteJson,
      quote_error: quoteHasError ? quoteJson : null,
      price_fallback: priceFallbackJson,
      source_error: sourceError,
    },
  };
}

serve(async (req) => {
  try {
    const startedAt = new Date().toISOString();
    const priceDate = todayUtcDate();

    const body = await req.json().catch(() => ({}));

    const maxAssetsPerRun =
      Number(body.max) || DEFAULT_MAX_ASSETS_PER_RUN;

    const delayMs =
      Number(body.delay) || DEFAULT_DELAY_MS;

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return jsonResponse(
        {
          status: "ERROR",
          reason: "MISSING_SUPABASE_ENV",
        },
        500,
      );
    }

    if (!TWELVE_API_KEY) {
      return jsonResponse(
        {
          status: "ERROR",
          reason: "MISSING_TWELVE_API_KEY",
        },
        500,
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const watchlistResponse = await supabase
      .from("market_data_watchlist_v1")
      .select("ticker, is_active, priority")
      .eq("is_active", true)
      .order("priority", { ascending: true });

    if (watchlistResponse.error) {
      return jsonResponse(
        {
          status: "ERROR",
          step: "LOAD_WATCHLIST",
          error: watchlistResponse.error.message,
        },
        500,
      );
    }

    const tickers = [
      ...new Set(
        (watchlistResponse.data ?? [])
          .map((row: any) => row.ticker)
          .filter(Boolean),
      ),
    ];

    const assetsResponse = await supabase
      .from("assets_v1")
      .select(
        "id,ticker,provider_symbol,currency,market_data_enabled,market_data_provider",
      )
      .in("ticker", tickers)
      .eq("market_data_enabled", true)
      .eq("market_data_provider", "twelve_data")
      .not("provider_symbol", "is", null)
      .order("ticker", { ascending: true });

    if (assetsResponse.error) {
      return jsonResponse(
        {
          status: "ERROR",
          step: "LOAD_ASSETS",
          error: assetsResponse.error.message,
        },
        500,
      );
    }

    const assets = (assetsResponse.data ?? []).slice(0, maxAssetsPerRun);
    const results: any[] = [];

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const loopNowIso = new Date().toISOString();

      const fetched = await fetchTwelveLive(asset);

      if (!fetched.ok) {
        results.push({
          ticker: asset.ticker,
          provider_symbol: asset.provider_symbol,
          status: "REJECTED",
          reason: fetched.reason,
          extended_data_status: fetched.extendedDataStatus ?? "UNKNOWN",
          debug: fetched.raw,
        });

        if (i < assets.length - 1) await sleep(delayMs);
        continue;
      }

      const livePayload = {
        asset_id: asset.id,
        ticker: asset.ticker,
        provider_symbol: asset.provider_symbol,
        last_price: fetched.lastPrice,
        previous_close: fetched.previousClose,
        open_price: fetched.openPrice,
        change_abs: fetched.changeAbs,
        change_pct: fetched.changePct,
        currency: fetched.currency ?? asset.currency,
        market_session: fetched.marketSession,
        provider: "twelve_data",
        extended_data_status: fetched.extendedDataStatus,
        raw_data: fetched.raw,
        updated_at: loopNowIso,
      };

      const liveResponse = await supabase
        .from("market_data_live_v1")
        .upsert(livePayload, { onConflict: "asset_id" });

      if (liveResponse.error) {
        results.push({
          ticker: asset.ticker,
          status: "LIVE_UPSERT_ERROR",
          reason: liveResponse.error.message,
        });

        if (i < assets.length - 1) await sleep(delayMs);
        continue;
      }

      const existingDailyResponse = await supabase
        .from("market_data_daily")
        .select("id")
        .eq("asset_id", asset.id)
        .eq("price_date", priceDate)
        .limit(1);

      if (existingDailyResponse.error) {
        results.push({
          ticker: asset.ticker,
          status: "DAILY_CHECK_ERROR",
          reason: existingDailyResponse.error.message,
        });

        if (i < assets.length - 1) await sleep(delayMs);
        continue;
      }

      const existingDailyId = existingDailyResponse.data?.[0]?.id;

      if (existingDailyId) {
        const dailyUpdateResponse = await supabase
          .from("market_data_daily")
          .update({
            close_price: fetched.lastPrice,
            currency: fetched.currency ?? asset.currency,
            created_at: loopNowIso,
          })
          .eq("id", existingDailyId);

        if (dailyUpdateResponse.error) {
          results.push({
            ticker: asset.ticker,
            status: "DAILY_UPDATE_ERROR",
            reason: dailyUpdateResponse.error.message,
          });

          if (i < assets.length - 1) await sleep(delayMs);
          continue;
        }
      } else {
        const dailyInsertResponse = await supabase
          .from("market_data_daily")
          .insert({
            asset_id: asset.id,
            price_date: priceDate,
            close_price: fetched.lastPrice,
            currency: fetched.currency ?? asset.currency,
            created_at: loopNowIso,
          });

        if (dailyInsertResponse.error) {
          results.push({
            ticker: asset.ticker,
            status: "DAILY_INSERT_ERROR",
            reason: dailyInsertResponse.error.message,
          });

          if (i < assets.length - 1) await sleep(delayMs);
          continue;
        }
      }

      results.push({
        ticker: asset.ticker,
        provider_symbol: asset.provider_symbol,
        status: "OK_UPDATED",
        price: fetched.lastPrice,
        previous_close: fetched.previousClose,
        change_pct: fetched.changePct,
        currency: fetched.currency ?? asset.currency,
        session: fetched.marketSession,
        source_priority: fetched.sourcePriority,
        extended_data_status: fetched.extendedDataStatus,

        time_series_status: fetched.timeSeriesDebug?.status ?? null,
        time_series_code: fetched.timeSeriesDebug?.code ?? null,
        time_series_message: fetched.timeSeriesDebug?.message ?? null,
        time_series_values_count: fetched.timeSeriesDebug?.values_count ?? 0,
        time_series_latest_datetime: fetched.timeSeriesDebug?.latest_datetime ?? null,
        time_series_latest_close: fetched.timeSeriesDebug?.latest_close ?? null,
      });

      if (i < assets.length - 1) await sleep(delayMs);
    }

    const updated = results.filter((r) => r.status === "OK_UPDATED");
    const rejected = results.filter((r) => r.status === "REJECTED");
    const failed = results.filter(
      (r) => !["OK_UPDATED", "REJECTED"].includes(r.status),
    );

    return jsonResponse({
      status: "DONE",
      version: "update-market-data-master-v5-extended-ready",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      price_date: priceDate,
      api_key_exists: !!TWELVE_API_KEY,
      watchlist_count: tickers.length,
      assets_loaded: assets.length,
      fetched_this_run: assets.length,
      max_assets_per_run: maxAssetsPerRun,
      delay_ms: delayMs,
      updated_count: updated.length,
      rejected_count: rejected.length,
      failed_count: failed.length,
      tickers_fetched: assets.map((a: any) => a.ticker),
      results,
    });
  } catch (error) {
    console.error("[FATAL]", error);

    return jsonResponse(
      {
        status: "FATAL_ERROR",
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});