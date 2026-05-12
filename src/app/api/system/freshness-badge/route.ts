import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

export async function GET() {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Supabase environment missing", freshness: null }, { status: 500 });
    }

    const { data, error } = await sb().rpc("fn_system_freshness_badge", {
      p_user_id: USER_ID_DEV,
    });

    if (error) throw error;

    return NextResponse.json({ freshness: data || null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/system/freshness-badge] error:", err);
    return NextResponse.json({ error: message, freshness: null }, { status: 500 });
  }
}
