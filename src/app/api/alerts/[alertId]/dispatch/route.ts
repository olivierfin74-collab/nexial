// Pass-through to nx.fn_dispatch_alert_action.
//
// Dispatches a backend-driven action_code to the appropriate side-effect
// (mark SEEN / DISMISSED, return a redirect target). The frontend NEVER
// decides what an action_code means — it forwards it verbatim.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  assertDecisionalSchemaV2,
  type ActionCode,
  type DispatchAlertActionResult,
} from "@/types/decision";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

interface DispatchBody {
  action_code: ActionCode;
  user_id?: string;
  payload?: Record<string, unknown>;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ alertId: string }> },
) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Supabase environment missing", dispatch: null },
        { status: 500 },
      );
    }

    const { alertId } = await params;
    if (!alertId) {
      return NextResponse.json(
        { error: "Missing alertId", dispatch: null },
        { status: 400 },
      );
    }

    const body = (await req.json()) as DispatchBody;
    if (!body?.action_code) {
      return NextResponse.json(
        { error: "Missing action_code", dispatch: null },
        { status: 400 },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "nx" },
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("fn_dispatch_alert_action", {
      p_alert_id: alertId,
      p_action_code: body.action_code,
      p_user_id: body.user_id ?? USER_ID_DEV,
      p_payload: body.payload ?? {},
    });

    if (error) throw error;
    const dispatch = (data as DispatchAlertActionResult | null) ?? null;
    assertDecisionalSchemaV2(dispatch);
    return NextResponse.json({ dispatch });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/alerts/[alertId]/dispatch] error:", err);
    return NextResponse.json({ error: message, dispatch: null }, { status: 500 });
  }
}
