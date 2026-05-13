// Pass-through to nx.fn_decisions_to_handle.
// p_max_visible defaults to 3. No metier mapping client-side.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { DecisionsToHandlePayload } from "@/types/nexial-v3";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { data: null, error: { code: "fetch_failed", detail: "Supabase environment missing" } },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") || USER_ID_DEV;
    const maxVisibleRaw = Number(searchParams.get("max_visible") || 3);
    const maxVisible = Number.isFinite(maxVisibleRaw) && maxVisibleRaw > 0 ? Math.min(maxVisibleRaw, 20) : 3;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "nx" },
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("fn_decisions_to_handle", {
      p_user_id: userId,
      p_max_visible: maxVisible,
    });

    if (error) {
      console.error("[/api/mobile/decisions-to-handle] rpc error:", error);
      return NextResponse.json(
        { data: null, error: { code: "fetch_failed", detail: error.message } },
        { status: 502 },
      );
    }

    return NextResponse.json({ data: (data as DecisionsToHandlePayload | null) ?? null });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/mobile/decisions-to-handle] error:", err);
    return NextResponse.json(
      { data: null, error: { code: "fetch_failed", detail } },
      { status: 500 },
    );
  }
}
