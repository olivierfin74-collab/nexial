// Supabase Edge Function : ibkr-flex-sync
// Récupère le Flex Query IBKR, parse le XML, envoie à nx.fn_ibkr_sync_full
// Secrets requis : IBKR_FLEX_TOKEN, IBKR_QUERY_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const USER_ID = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";
const ACCOUNT_ID_CTO = "019df844-2163-7315-be76-1cb886c8e7bd";

// IBKR Flex Web Service : 2 étapes (SendRequest -> GetStatement)
const FLEX_BASE = "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService";

function attrs(tag: string, xml: string): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const re = new RegExp(`<${tag}\\s+([^>]*?)/?>`, "g");
  let m;
  while ((m = re.exec(xml)) !== null) {
    const a: Record<string, string> = {};
    const ar = /(\w+)="([^"]*)"/g;
    let am;
    while ((am = ar.exec(m[1])) !== null) a[am[1]] = am[2];
    out.push(a);
  }
  return out;
}

Deno.serve(async () => {
  try {
    const token = Deno.env.get("IBKR_FLEX_TOKEN")!;
    const queryId = Deno.env.get("IBKR_QUERY_ID")!;

    // 1) SendRequest -> obtenir un reference code
    const r1 = await fetch(`${FLEX_BASE}/SendRequest?t=${token}&q=${queryId}&v=3`);
    const x1 = await r1.text();
    const refMatch = x1.match(/<ReferenceCode>(\d+)<\/ReferenceCode>/);
    const urlMatch = x1.match(/<Url>([^<]+)<\/Url>/);
    if (!refMatch || !urlMatch) {
      return new Response(JSON.stringify({ error: "SendRequest failed", raw: x1 }), { status: 502 });
    }
    const ref = refMatch[1];
    const baseUrl = urlMatch[1];

    // IBKR a besoin de quelques secondes pour générer le rapport
    await new Promise((res) => setTimeout(res, 5000));

    // 2) GetStatement -> récupérer le XML du rapport
    const r2 = await fetch(`${baseUrl}?t=${token}&q=${ref}&v=3`);
    const xml = await r2.text();
    if (xml.includes("<ErrorCode>")) {
      return new Response(JSON.stringify({ error: "GetStatement error", raw: xml.slice(0, 500) }), { status: 502 });
    }

    // 3) Parser les sections utiles
    const trades = attrs("Trade", xml).map((a) => ({
      assetCategory: a.assetCategory, isin: a.isin, underlyingSymbol: a.underlyingSymbol,
      symbol: a.symbol, ibExecID: a.ibExecID, ibOrderID: a.ibOrderID, buySell: a.buySell,
      quantity: a.quantity, tradePrice: a.tradePrice, currency: a.currency,
      ibCommission: a.ibCommission, ibCommissionCurrency: a.ibCommissionCurrency, dateTime: a.dateTime,
    }));
    const cashReport = attrs("CashReportCurrency", xml).map((a) => ({
      currency: a.currency, endingCash: a.endingCash,
    }));
    const openPositions = attrs("OpenPosition", xml).map((a) => ({
      assetCategory: a.assetCategory,
      isin: a.isin,
      underlyingSymbol: a.underlyingSymbol,
      symbol: a.symbol,
      conid: a.conid,
      currency: a.currency,
      position: a.position,
      costBasisPrice: a.costBasisPrice,
      markPrice: a.markPrice,
      positionValue: a.positionValue,
      fifoPnlUnrealized: a.fifoPnlUnrealized,
      reportDate: a.reportDate,
    }));
    const fxTransactions = attrs("FxTransaction", xml).map((a) => ({
      activityDescription: a.activityDescription,
      fxCurrency: a.fxCurrency,
      quantity: a.quantity,
      proceeds: a.proceeds,
      transactionID: a.transactionID,
      dateTime: a.dateTime,
    }));

    // 4) Envoyer à la fonction d'ingestion SQL
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supabase.rpc("fn_ibkr_sync_full", {
      p_user_id: USER_ID,
      p_account_id: ACCOUNT_ID_CTO,
      p_payload: { trades, cashReport, openPositions, fxTransactions },
    }, { schema: "nx" });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true, result: data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
