import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

console.log("BOOT update-market-data-nx v37 (option-z-mode-gating)");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const TWELVE_API_KEY = Deno.env.get("TWELVE_DATA_API_KEY") ?? Deno.env.get("TWELVE_API_KEY");

const MAX_PER_RUN = 25;
const DELAY_MS = 800;
const INNER_DELAY = 150;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type IngestionMode = "eod_full" | "intraday_live_only";

function jr(b: unknown, s = 200) { return new Response(JSON.stringify(b, null, 2), { status: s, headers: { "Content-Type": "application/json" } }); }
function today() { return new Date().toISOString().slice(0, 10); }
function toN(v: unknown): number | null { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; }

// Nexial ADR-33 guard: prices_daily / market_data_daily are EOD-only.
// Defensive re-check at each daily callsite so a future refactor cannot silently
// reintroduce the 18/05/2026 intraday-into-daily incident.
function ensureDailyWriteAllowed(mode: IngestionMode, callsite: string): void {
  if (mode === "intraday_live_only") {
    throw new Error(
      `GUARD VIOLATION (callsite=${callsite}): ` +
      `Attempted daily-table write in intraday_live_only mode. ` +
      `See Nexial ADR-33. prices_daily/market_data_daily = EOD only.`,
    );
  }
}

async function fJ(u: URL) { const r = await fetch(u.toString()); const t = await r.text(); try { return JSON.parse(t); } catch { return { status: "error", message: "INVALID_JSON", raw: t }; } }

function sess(qj: any, sp: string) { if (qj?.is_market_open === true) return "REGULAR"; if (sp === "time_series_1min_prepost") return "INTRADAY_OR_EXTENDED"; return "EXTENDED_OR_CLOSED"; }
function sessNx(s: string) { if (s === "REGULAR") return "regular"; if (s === "INTRADAY_OR_EXTENDED") return "after_hours"; return "closed"; }
function eds(sp: string, tj: any) { if (sp === "time_series_1min_prepost") return "RELIABLE"; if (tj?.status === "error" && tj?.code === 403 && typeof tj?.message === "string" && tj.message.toLowerCase().includes("pre-market")) return "UNAVAILABLE_ON_PLAN"; if (sp === "price_fallback") return "LIMITED_FALLBACK"; return "UNKNOWN"; }

async function fetchLive(asset: any) {
  const ts = new URL("https://api.twelvedata.com/time_series");
  ts.searchParams.set("symbol", asset.data_source_symbol);
  ts.searchParams.set("interval", "1min"); ts.searchParams.set("outputsize", "1");
  ts.searchParams.set("prepost", "true"); ts.searchParams.set("apikey", TWELVE_API_KEY ?? "");
  const pr = new URL("https://api.twelvedata.com/price");
  pr.searchParams.set("symbol", asset.data_source_symbol); pr.searchParams.set("apikey", TWELVE_API_KEY ?? "");
  const qu = new URL("https://api.twelvedata.com/quote");
  qu.searchParams.set("symbol", asset.data_source_symbol); qu.searchParams.set("apikey", TWELVE_API_KEY ?? "");

  const tsJ = await fJ(ts);
  await sleep(INNER_DELAY);
  const qJ = await fJ(qu);
  const qE = qJ?.status === "error";
  const pc = qE ? null : toN(qJ?.previous_close);
  const op = qE ? null : toN(qJ?.open);
  const cur = qE ? asset.currency : qJ?.currency ?? asset.currency;

  let lp: number | null = null; let sp = "none"; let pfJ: any = null;
  if (tsJ?.status !== "error") { const lt = tsJ?.values?.[0]; lp = toN(lt?.close) ?? toN(lt?.price) ?? toN(lt?.open); if (lp) sp = "time_series_1min_prepost"; }
  if (!lp) { await sleep(INNER_DELAY); pfJ = await fJ(pr); if (pfJ?.status !== "error") { lp = toN(pfJ?.price); if (lp) sp = "price_fallback"; } }

  const e = eds(sp, tsJ);
  if (!lp) return { ok: false, reason: "NO_VALID_LIVE", extendedDataStatus: e };

  const cAbs = pc && pc > 0 ? lp - pc : null;
  const cPct = pc && pc > 0 ? ((lp - pc) / pc) * 100 : null;
  const ls = sess(qJ, sp);
  return { ok: true, lastPrice: lp, previousClose: pc, openPrice: op, changeAbs: cAbs, changePct: cPct, currency: cur, marketSession: ls, nxSession: sessNx(ls), sourcePriority: sp, extendedDataStatus: e, raw: { source_priority: sp, time_series: tsJ, quote: qE ? null : qJ, price_fallback: pfJ } };
}

serve(async (req) => {
  try {
    const startedAt = new Date().toISOString();
    const priceDate = today();
    const body = await req.json().catch(() => ({}));
    const max = Number(body.max) || MAX_PER_RUN;
    const delay = Number(body.delay) || DELAY_MS;

    const rawMode = body.mode;
    const mode: IngestionMode = (rawMode ?? "eod_full") as IngestionMode;
    if (mode !== "eod_full" && mode !== "intraday_live_only") {
      return jr({
        status: "ERROR",
        reason: "Invalid mode: must be 'eod_full' or 'intraday_live_only'",
        received: rawMode,
      }, 400);
    }
    const isIntraday = mode === "intraday_live_only";
    console.log(`[update-market-data-nx] mode=${rawMode ?? "eod_full(default)"} max=${max} delay=${delay}`);

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return jr({ status: "ERROR", reason: "MISSING_SUPABASE_ENV" }, 500);
    if (!TWELVE_API_KEY) return jr({ status: "ERROR", reason: "MISSING_TWELVE_API_KEY" }, 500);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Lecture watchlist via RPC bridge (vw_watchlist_active est dans nx, pas accessible via .from())
    const wl = await sb.rpc("fn_get_watchlist_active");
    if (wl.error) return jr({ status: "ERROR", step: "LOAD_WL_RPC", error: wl.error.message }, 500);

    const assets = (wl.data ?? []).map((r: any) => ({ id: r.asset_id, ticker: r.ticker, currency: r.currency, data_source_symbol: r.data_source_symbol, provider_symbol: r.data_source_symbol })).slice(0, max);

    const results: any[] = [];
    let nLO = 0, nLF = 0, nDO = 0, nDF = 0, lLO = 0, lDO = 0;

    for (let i = 0; i < assets.length; i++) {
      const a = assets[i];
      const now = new Date().toISOString();
      const f = await fetchLive(a);

      if (!f.ok) { results.push({ ticker: a.ticker, status: "REJECTED", reason: f.reason, extended_data_status: f.extendedDataStatus ?? "UNKNOWN" }); if (i < assets.length - 1) await sleep(delay); continue; }

      const llp = { asset_id: a.id, ticker: a.ticker, provider_symbol: a.provider_symbol, last_price: f.lastPrice, previous_close: f.previousClose, open_price: f.openPrice, change_abs: f.changeAbs, change_pct: f.changePct, currency: f.currency ?? a.currency, market_session: f.marketSession, provider: "twelve_data", extended_data_status: f.extendedDataStatus, raw_data: f.raw, updated_at: now };
      const llr = await sb.from("market_data_live_v1").upsert(llp, { onConflict: "asset_id" });
      if (llr.error) { results.push({ ticker: a.ticker, status: "LIVE_LEGACY_UPSERT_ERROR", reason: llr.error.message }); if (i < assets.length - 1) await sleep(delay); continue; }
      lLO++;

      try {
        const { error: ne } = await sb.rpc("upsert_prices_live", { quotes: [{ asset_id: a.id, last_price: f.lastPrice, change_today_abs: f.changeAbs, change_today_pct: f.changePct, session: f.nxSession, quote_at: now }] });
        if (ne) { console.error(`[nx] live ${a.ticker}:`, ne.message); nLF++; } else nLO++;
      } catch (e) { console.error(`[nx] live ex ${a.ticker}:`, e); nLF++; }

      if (!isIntraday) {
        ensureDailyWriteAllowed(mode, "market_data_daily_legacy");
        const ed = await sb.from("market_data_daily").select("id").eq("asset_id", a.id).eq("price_date", priceDate).limit(1);
        if (ed.error) { results.push({ ticker: a.ticker, status: "DAILY_LEGACY_CHECK_ERROR", reason: ed.error.message }); if (i < assets.length - 1) await sleep(delay); continue; }
        const eid = ed.data?.[0]?.id;
        let lde: string | null = null;
        if (eid) { const r = await sb.from("market_data_daily").update({ close_price: f.lastPrice, currency: f.currency ?? a.currency, created_at: now }).eq("id", eid); if (r.error) lde = r.error.message; }
        else { const r = await sb.from("market_data_daily").insert({ asset_id: a.id, price_date: priceDate, close_price: f.lastPrice, currency: f.currency ?? a.currency, created_at: now }); if (r.error) lde = r.error.message; }
        if (lde) { results.push({ ticker: a.ticker, status: "DAILY_LEGACY_WRITE_ERROR", reason: lde }); if (i < assets.length - 1) await sleep(delay); continue; }
        lDO++;

        try {
          ensureDailyWriteAllowed(mode, "nx_prices_daily");
          const { error: nde } = await sb.rpc("upsert_prices_daily", { daily_prices: [{ asset_id: a.id, price_date: priceDate, close: f.lastPrice, open: f.openPrice, data_source: "twelve_data" }] });
          if (nde) { console.error(`[nx] daily ${a.ticker}:`, nde.message); nDF++; } else nDO++;
        } catch (e) { console.error(`[nx] daily ex ${a.ticker}:`, e); nDF++; }
      } else {
        console.log(`[intraday_live_only] Skipped both daily writes for asset ${a.id} (${a.ticker})`);
      }

      results.push({ ticker: a.ticker, status: "OK_UPDATED", price: f.lastPrice, previous_close: f.previousClose, change_pct: f.changePct, currency: f.currency ?? a.currency, session_legacy: f.marketSession, session_nx: f.nxSession, source_priority: f.sourcePriority, extended_data_status: f.extendedDataStatus, daily_skipped: isIntraday });
      if (i < assets.length - 1) await sleep(delay);
    }

    const upd = results.filter((r) => r.status === "OK_UPDATED");
    const rej = results.filter((r) => r.status === "REJECTED");
    const fail = results.filter((r) => !["OK_UPDATED", "REJECTED"].includes(r.status));

    return jr({ status: "DONE", version: "v37-nx-option-z-mode-gating", mode, daily_writes_skipped: isIntraday, started_at: startedAt, finished_at: new Date().toISOString(), price_date: priceDate, assets_loaded: assets.length, updated_count: upd.length, rejected_count: rej.length, failed_count: fail.length, legacy_writes: { live_ok: lLO, daily_ok: lDO }, nx_writes: { live_ok: nLO, live_failed: nLF, daily_ok: nDO, daily_failed: nDF }, tickers_fetched: assets.map((a: any) => a.ticker), results });
  } catch (err) {
    console.error("[FATAL]", err);
    return jr({ status: "FATAL_ERROR", error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
