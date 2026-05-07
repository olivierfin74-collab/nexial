// ============================================================================
// Edge Function : yahoo-scout-flash-drops
// V3 Phase L - Détection flash drops intra-day via Yahoo Finance
// ============================================================================
//
// Pipeline :
// 1. Récupère les Top losers du jour via Yahoo screener API (gratuit)
// 2. Récupère aussi les actifs Nexial en intraday quote
// 3. Filtre les drops >= -3% qui matchent un actif Nexial
// 4. Insert nx.flash_scout_snapshots
// 5. Appelle nx.fn_generate_flash_alerts() pour créer les alertes
// 6. Trigger send-flash-alert (Telegram, futur)
//
// Schedule recommandé : */30 13-21 * * 1-5 (toutes les 30 min, ouverture US)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketPreviousClose: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  averageDailyVolume3Month?: number;
  exchange?: string;
}

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

// Endpoint Yahoo non-officiel : top losers du jour US
async function fetchYahooDayLosers(): Promise<YahooQuote[]> {
  const url = "https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=true&lang=en-US&region=US&scrIds=day_losers&count=50";

  const res = await fetch(url, { headers: YAHOO_HEADERS });
  if (!res.ok) {
    console.error(`Yahoo day_losers HTTP ${res.status}`);
    return [];
  }

  const data = await res.json();
  const quotes = data?.finance?.result?.[0]?.quotes ?? [];

  return quotes.map((q: any) => ({
    symbol: q.symbol,
    regularMarketPrice: q.regularMarketPrice?.raw,
    regularMarketPreviousClose: q.regularMarketPreviousClose?.raw,
    regularMarketChange: q.regularMarketChange?.raw,
    regularMarketChangePercent: q.regularMarketChangePercent?.raw,
    regularMarketVolume: q.regularMarketVolume?.raw,
    averageDailyVolume3Month: q.averageDailyVolume3Month?.raw,
    exchange: q.exchange,
  }));
}

// Quote intraday pour un ticker spécifique (utilisé pour scanner watchlist)
async function fetchYahooQuotes(tickers: string[]): Promise<YahooQuote[]> {
  if (tickers.length === 0) return [];

  // Yahoo accepte ?symbols=AAPL,MSFT,NVDA (max ~200)
  const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${tickers.join(",")}`;

  const res = await fetch(url, { headers: YAHOO_HEADERS });
  if (!res.ok) {
    console.error(`Yahoo quotes HTTP ${res.status}`);
    return [];
  }

  const data = await res.json();
  const quotes = data?.quoteResponse?.result ?? [];

  return quotes.map((q: any) => ({
    symbol: q.symbol,
    regularMarketPrice: q.regularMarketPrice,
    regularMarketPreviousClose: q.regularMarketPreviousClose,
    regularMarketChange: q.regularMarketChange,
    regularMarketChangePercent: q.regularMarketChangePercent,
    regularMarketVolume: q.regularMarketVolume,
    averageDailyVolume3Month: q.averageDailyVolume3Month,
    exchange: q.exchange,
  }));
}

Deno.serve(async (req) => {
  const startedAt = Date.now();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // 1. Récupérer les actifs Nexial actifs (pour matcher avec Yahoo)
    const { data: assets, error: assetsErr } = await supabase
      .schema("nx")
      .from("assets")
      .select("id, ticker, data_source_symbol, exchange_region")
      .eq("is_active", true);

    if (assetsErr) throw assetsErr;

    // Map ticker -> asset_id
    const tickerToAsset = new Map<string, { id: string; ticker: string }>();
    for (const a of assets ?? []) {
      // Utiliser data_source_symbol si dispo (Yahoo format), sinon ticker
      const yahooSym = a.data_source_symbol ?? a.ticker;
      tickerToAsset.set(yahooSym.toUpperCase(), { id: a.id, ticker: a.ticker });
    }

    // 2. Scout 1 : Yahoo day_losers (US top 50)
    const losers = await fetchYahooDayLosers();
    console.log(`Yahoo day_losers : ${losers.length} candidats`);

    // 3. Scout 2 : Quotes directes pour TOUS les actifs Nexial actifs
    const allTickers = (assets ?? [])
      .map((a: any) => a.data_source_symbol ?? a.ticker)
      .filter(Boolean);

    // Batches de 50 (rate limit)
    const watchlistQuotes: YahooQuote[] = [];
    for (let i = 0; i < allTickers.length; i += 50) {
      const batch = allTickers.slice(i, i + 50);
      const quotes = await fetchYahooQuotes(batch);
      watchlistQuotes.push(...quotes);
    }
    console.log(`Yahoo watchlist quotes : ${watchlistQuotes.length}`);

    // 4. Combiner : tous les drops >= -3% (top losers ou watchlist)
    const allCandidates = [
      ...losers.map(q => ({ ...q, source: "yahoo_day_losers" })),
      ...watchlistQuotes.map(q => ({ ...q, source: "yahoo_watchlist_quote" })),
    ];

    const drops = allCandidates.filter(q =>
      q.regularMarketChangePercent != null && q.regularMarketChangePercent <= -3
    );

    console.log(`Drops detectes (>= -3%) : ${drops.length}`);

    // 5. Insert snapshots
    const snapshots = drops.map(d => {
      const sym = d.symbol?.toUpperCase();
      const matched = tickerToAsset.get(sym);

      return {
        scout_source: d.source,
        ticker: d.symbol,
        exchange: d.exchange,
        current_price: d.regularMarketPrice,
        previous_close: d.regularMarketPreviousClose,
        intraday_chg_pct: d.regularMarketChangePercent,
        volume_today: d.regularMarketVolume,
        volume_avg_20: d.averageDailyVolume3Month,
        volume_ratio: d.averageDailyVolume3Month
          ? (d.regularMarketVolume ?? 0) / d.averageDailyVolume3Month
          : null,
        asset_id: matched?.id ?? null,
        in_watchlist: !!matched,
        raw_payload: d,
      };
    });

    const { data: insertedSnapshots, error: snapErr } = await supabase
      .schema("nx")
      .from("flash_scout_snapshots")
      .insert(snapshots)
      .select("id, ticker, intraday_chg_pct, in_watchlist");

    if (snapErr) throw snapErr;

    console.log(`Snapshots inseres : ${insertedSnapshots?.length}`);

    // 6. Appeler RPC fn_generate_flash_alerts pour creer les alertes
    const { data: alerts, error: alertsErr } = await supabase
      .schema("nx")
      .rpc("fn_generate_flash_alerts", {
        p_user_id: null,
        p_lookback_minutes: 35,
        p_min_drop_pct: -3.0,
        p_validity_minutes: 90,
      });

    if (alertsErr) throw alertsErr;

    const newAlerts = (alerts ?? []).filter((a: any) => a.is_new);
    console.log(`Alertes FLASH generees : ${newAlerts.length}`);

    return new Response(
      JSON.stringify({
        ok: true,
        duration_ms: Date.now() - startedAt,
        scout: {
          day_losers_fetched: losers.length,
          watchlist_quotes_fetched: watchlistQuotes.length,
          drops_detected: drops.length,
          snapshots_inserted: insertedSnapshots?.length ?? 0,
          flash_alerts_new: newAlerts.length,
          flash_alerts_total_lookback: alerts?.length ?? 0,
        },
        new_alerts: newAlerts,
      }, null, 2),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("yahoo-scout-flash-drops error:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: String(err),
        duration_ms: Date.now() - startedAt,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
