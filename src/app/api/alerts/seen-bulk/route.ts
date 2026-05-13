// Pass-through to nx.fn_mark_alerts_seen_bulk.
//
// Marks the given alert_ids as SEEN for the user. The function is idempotent
// — calling it again on already-SEEN ids is a no-op and returns marked_seen=0.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  assertDecisionalSchemaV2,
  type MarkAlertsSeenBulkResult,
} from "@/types/decision";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

interface SeenBulkBody {
  alert_ids: string[];
  user_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Supabase environment missing", result: null },
        { status: 500 },
      );
    }

    const body = (await req.json()) as SeenBulkBody;
    const ids = Array.isArray(body?.alert_ids) ? body.alert_ids : [];
    if (ids.length === 0) {
      return NextResponse.json({
        result: {
          schema_version: "v2",
          ok: true,
          total_requested: 0,
          marked_seen: 0,
        } satisfies MarkAlertsSeenBulkResult,
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "nx" },
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("fn_mark_alerts_seen_bulk", {
      p_alert_ids: ids,
      p_user_id: body.user_id ?? USER_ID_DEV,
    });

    if (error) throw error;
    const result = (data as MarkAlertsSeenBulkResult | null) ?? null;
    assertDecisionalSchemaV2(result);
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/alerts/seen-bulk] error:", err);
    return NextResponse.json({ error: message, result: null }, { status: 500 });
  }
}
