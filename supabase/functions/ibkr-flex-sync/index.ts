// supabase/functions/ibkr-flex-sync/index.ts
//
// IBKR Flex Web Service → Nexial sync (READ-ONLY ABSOLU, ne passe jamais d'ordre).
// L'Edge est MINCE : appelle Flex, parse le XML, délègue toute l'écriture aux RPC nx.*.
//
// Prérequis Supabase :
//   - Schéma `nx` exposé dans Settings → API → Exposed schemas (VÉRIFIÉ exposé le 2026-06-10).
//   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY auto-injectés dans l'Edge runtime.
//   - La Flex Query (côté IBKR) doit activer : OpenPositions, Trades, CashReport,
//     et les transactions de change (selon config : Trades assetCategory=CASH).
//
// Deux modes d'invocation :
//   - MODE PILOTE  : POST body { user_id, account_id, connection_id, token, query_id }
//                    (déclenché per-user depuis l'app — comportement nominal).
//   - MODE CRON    : appel server-to-server SANS body (jobid 58–62). On retombe sur les
//                    secrets d'env (compte CTO Olivier par défaut). NE PAS modifier les crons.
//   Secrets requis pour le mode cron :
//     IBKR_FLEX_TOKEN, IBKR_QUERY_ID, NEXIAL_DEFAULT_USER_ID, NEXIAL_DEFAULT_CTO_ID
//
// NB parsing : extraction par REGEX (et non parseur DOM). Le parseur deno.land/x/xml
// matérialise tout le statement en mémoire et fait OOM (WORKER_RESOURCE_LIMIT) sur le
// statement réel du CTO. La regex (approche éprouvée en v5) reste sous la limite worker.

import { createClient } from "jsr:@supabase/supabase-js@2";

const FLEX = "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService";

// --- helpers ---------------------------------------------------------------
const num = (v: unknown): number | null => (v == null || v === "" ? null : Number(v));
const attr = (o: any, k: string) => (o?.[k] ?? null);

// Extraction légère : retourne un tableau de maps d'attributs pour chaque <tag .../>.
// Les éléments Flex (OpenPosition, Trade, CashReportCurrency, FlexStatement) sont
// auto-fermants → un seul niveau, pas d'imbrication à gérer.
function attrsOf(tag: string, xml: string): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const re = new RegExp(`<${tag}\\b([^>]*?)/?>`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const a: Record<string, string> = {};
    const ar = /([\w:]+)="([^"]*)"/g;
    let am: RegExpExecArray | null;
    while ((am = ar.exec(m[1])) !== null) a[am[1]] = am[2];
    out.push(a);
  }
  return out;
}

// Durcissement des dates IBKR — JAMAIS de date brute envoyée à une RPC.
// IBKR Flex "reportDate" : "YYYYMMDD" → "YYYY-MM-DD" (cible DATE). Tolère déjà-tiret.
function ibDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  const m = String(v).trim().match(/^(\d{4})-?(\d{2})-?(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

// IBKR Flex "dateTime" : "YYYYMMDD;HHMMSS" (ou variantes " "/"T", heure optionnelle)
// → ISO 8601 UTC (cible TIMESTAMPTZ). NB : l'horodatage Flex est naïf ; on l'interprète
// en UTC conformément à la tâche. Si la Flex Query est configurée dans un autre fuseau,
// régler le fuseau de la Query côté IBKR sur UTC (recommandé) plutôt que de décaler ici.
function ibDateTime(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})[;\sT]?(\d{2}):?(\d{2}):?(\d{2})?/);
  if (m) {
    const [, y, mo, d, h, mi, se] = m;
    return `${y}-${mo}-${d}T${h}:${mi}:${se ?? "00"}Z`;
  }
  const d = ibDate(s);                 // date seule → minuit UTC
  return d ? `${d}T00:00:00Z` : null;
}

async function flexSendRequest(token: string, queryId: string): Promise<string> {
  const r = await fetch(`${FLEX}/SendRequest?t=${token}&q=${queryId}&v=3`);
  const xml = await r.text();
  const ref = xml.match(/<ReferenceCode>(\d+)<\/ReferenceCode>/)?.[1];
  if (!ref) {
    const code = xml.match(/<ErrorCode>([^<]*)<\/ErrorCode>/)?.[1];
    const msg = xml.match(/<ErrorMessage>([^<]*)<\/ErrorMessage>/)?.[1];
    throw new Error(`Flex SendRequest failed: ${code ?? "?"} ${msg ?? "?"} | raw: ${xml.slice(0, 200)}`);
  }
  return ref;
}

async function flexGetStatement(token: string, refCode: string): Promise<string> {
  // polling : la génération du statement est asynchrone côté IBKR
  for (let i = 0; i < 12; i++) {
    const r = await fetch(`${FLEX}/GetStatement?t=${token}&q=${refCode}&v=3`);
    const xml = await r.text();
    if (xml.includes("<FlexQueryResponse")) return xml;          // prêt
    if (xml.includes("Statement generation in progress")) {       // pas encore prêt
      await new Promise((res) => setTimeout(res, 5000));
      continue;
    }
    throw new Error(`Flex GetStatement error: ${xml.slice(0, 300)}`);
  }
  throw new Error("Flex GetStatement timed out");
}

// --- handler ---------------------------------------------------------------
Deno.serve(async (req) => {
  try {
    // Body tolérant : les crons appellent SANS corps → req.json() lèverait. On retombe sur {}.
    let body: any = {};
    try { body = (await req.json()) ?? {}; } catch { body = {}; }

    // Résolution body → env. Body fourni = MODE PILOTE ; sinon = MODE CRON (défauts CTO).
    const token = body.token ?? Deno.env.get("IBKR_FLEX_TOKEN");
    const query_id = body.query_id ?? Deno.env.get("IBKR_QUERY_ID");
    const user_id = body.user_id ?? Deno.env.get("NEXIAL_DEFAULT_USER_ID");
    const account_id = body.account_id ?? Deno.env.get("NEXIAL_DEFAULT_CTO_ID");
    const connection_id = body.connection_id ?? null;
    const mode = body.token || body.query_id ? "pilote" : "cron";

    // 400 UNIQUEMENT si, après fallback, token OU query_id manquent encore.
    if (!token || !query_id) {
      return Response.json(
        { ok: false, error: "missing token/query_id (ni body ni secrets d'env)" },
        { status: 400 },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { db: { schema: "nx" } }, // cible le schéma nx pour les .rpc
    );

    // 1) Flex : SendRequest → GetStatement (polling)
    const refCode = await flexSendRequest(token, query_id);
    const xml = await flexGetStatement(token, refCode);

    // 2) Extraction des sections (regex, sans DOM)
    const accountId = attrsOf("FlexStatement", xml)[0]?.accountId ?? null;
    const positions = attrsOf("OpenPosition", xml);
    const trades = attrsOf("Trade", xml);
    const cashRows = attrsOf("CashReportCurrency", xml);

    const batchId = crypto.randomUUID();
    const summary = { positions: 0, unmapped_pos: 0, fills: 0, fx: 0, cash: 0, closed: 0 };

    // 3) POSITIONS (snapshot) — ADAPTER les noms d'attributs à votre Flex Query
    for (const p of positions) {
      const { data: res } = await supabase.rpc("fn_upsert_ibkr_position", {
        p_user_id: user_id, p_account_id: account_id,
        p_symbol: attr(p, "symbol"), p_isin: attr(p, "isin"), p_conid: attr(p, "conid"),
        p_currency: attr(p, "currency"),
        p_quantity: num(attr(p, "position")),
        p_cost_basis_price: num(attr(p, "costBasisPrice")),
        p_mark_price: num(attr(p, "markPrice")),
        p_position_value: num(attr(p, "positionValue")),
        p_unrealized_pnl: num(attr(p, "fifoPnlUnrealized")),
        p_report_date: ibDate(attr(p, "reportDate")),   // "YYYYMMDD" → DATE "YYYY-MM-DD"
        p_batch_id: batchId, p_raw: p,
      });
      res === "unmapped" ? summary.unmapped_pos++ : summary.positions++;
    }

    // 3b) positions disparues du flux → quantité 0
    const { data: closed } = await supabase.rpc("fn_close_absent_ibkr_positions", {
      p_user_id: user_id, p_account_id: account_id, p_current_batch_id: batchId,
    });
    summary.closed = closed ?? 0;

    // 4) FILLS (append idempotent) — section Trades (assetCategory action/STK)
    for (const t of trades) {
      if (attr(t, "assetCategory") === "CASH") continue; // les FX sont traités plus bas
      await supabase.rpc("fn_ingest_ibkr_fill", {
        p_user_id: user_id, p_account_id: account_id,
        p_symbol: attr(t, "symbol"), p_isin: attr(t, "isin"), p_conid: attr(t, "conid"),
        p_exec_id: attr(t, "ibExecID") ?? attr(t, "tradeID"),
        p_order_id_ext: attr(t, "ibOrderID"),
        p_side: attr(t, "buySell"),
        p_quantity: num(attr(t, "quantity")),
        p_fill_price: num(attr(t, "tradePrice")),
        p_currency: attr(t, "currency"),
        p_commission: num(attr(t, "ibCommission")),
        p_commission_currency: attr(t, "ibCommissionCurrency"),
        p_executed_at: ibDateTime(attr(t, "dateTime")),  // "YYYYMMDD;HHMMSS" → ISO 8601 UTC
        p_batch_id: batchId, p_raw: t,
      });
      summary.fills++;
    }

    // 5) FX CONVERSIONS — délégué à nx.fn_ingest_fx_from_flex (réplique EXACTE de la logique
    //    v4, idempotent avec les 132 lignes historiques). Section FxTransaction, comme v5.
    //    Activable via secret IBKR_FX_INGEST_ENABLED=true. La RPC filtre 'CASH:%', dédoublonne
    //    par md5(dateTime|fxCurrency|quantity|proceeds) et oriente from/to elle-même.
    //
    //    ⚠️ STRINGS BRUTS OBLIGATOIRES : dateTime / quantity / proceeds sont passés TELS QUELS
    //    depuis le XML — AUCUN reformatage (pas de num(), pas de ibDateTime()). Le md5 du dedup
    //    porte sur ces strings ; les reformater ferait diverger la clé → doublons. C'est
    //    l'INVERSE de positions/fills, où l'on DOIT durcir les dates. La conversion de date est
    //    faite par la RPC en interne.
    const fxEnabled = Deno.env.get("IBKR_FX_INGEST_ENABLED") === "true";
    let fxResult: any = null;
    if (fxEnabled) {
      const fxTransactions = attrsOf("FxTransaction", xml).map((a) => ({
        activityDescription: attr(a, "activityDescription"),
        fxCurrency: attr(a, "fxCurrency"),
        quantity: attr(a, "quantity"),       // BRUT — ne pas convertir
        proceeds: attr(a, "proceeds"),       // BRUT — ne pas convertir
        transactionID: attr(a, "transactionID"),
        dateTime: attr(a, "dateTime"),       // BRUT — ne pas convertir
      }));
      const { data } = await supabase.rpc("fn_ingest_fx_from_flex", {
        p_user_id: user_id, p_account_id: account_id,
        p_fx_transactions: fxTransactions, p_batch_id: batchId,
      });
      fxResult = data;
      summary.fx = data?.fx_inserted ?? 0;
    }

    // 6) CASH par devise (UPSERT) — section CashReport
    for (const c of cashRows) {
      const ccy = attr(c, "currency");
      if (!ccy || ccy === "BASE_SUMMARY") continue;
      await supabase.rpc("fn_upsert_account_cash", {
        p_account_id: account_id, p_currency: ccy,
        p_balance: num(attr(c, "endingCash")),
      });
      summary.cash++;
    }

    // 7) Marquer la connexion CONNECTED (can_read=true, can_trade JAMAIS).
    //    fn_mark_broker_connection_connected a DEUX surcharges (4 et 5 params).
    //    On passe EXPLICITEMENT les 5 clés nommées pour cibler la surcharge 5-params
    //    (la seule qui déclare p_external_account_id) et lever toute ambiguïté PostgREST.
    if (connection_id) {
      await supabase.rpc("fn_mark_broker_connection_connected", {
        p_connection_id: connection_id,
        p_vault_secret_id: null,     // brancher le stockage Vault des credentials si souhaité
        p_vault_refresh_id: null,
        p_external_account_id: accountId,
        p_expires_at: null,
      });
    }

    return Response.json({ ok: true, mode, batch_id: batchId, fx_ingest_enabled: fxEnabled, fx_result: fxResult, summary });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
});
