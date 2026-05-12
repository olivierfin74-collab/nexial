import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

export const dynamic = "force-dynamic";

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

function fallbackFreshness(message: string) {
  return {
    status: "stale",
    badge: "\u26A0\uFE0F stale",
    label: "\u26A0\uFE0F stale",
    message,
    last_pipeline_run: null,
    flash_scout_freshness: message,
    stale_tickers: [],
    details: {
      last_pipeline_run: null,
      flash_scout_freshness: message,
      source: "fallback",
    },
  };
}

export async function GET() {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        freshness: fallbackFreshness("Configuration Supabase indisponible. Freshness non verifiee."),
      });
    }

    const { data, error } = await sb().rpc("fn_system_freshness_badge", {
      p_user_id: USER_ID_DEV,
    });

    if (error) {
      console.error("[/api/system/freshness-badge] rpc error:", error);
      return NextResponse.json({
        freshness: fallbackFreshness("RPC freshness indisponible. Verifier le pipeline et les logs Supabase."),
      });
    }

    return NextResponse.json({ freshness: data || null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Freshness indisponible";
    console.error("[/api/system/freshness-badge] error:", err);
    return NextResponse.json({
      freshness: fallbackFreshness(`Freshness indisponible: ${message}`),
    });
  }
}
