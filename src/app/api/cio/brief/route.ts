import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

export async function GET() {
  try {
    const { data, error } = await sb().rpc("fn_daily_brief_olivier");
    if (error) throw error;

    return NextResponse.json({ brief: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/cio/brief] error:", err);
    return NextResponse.json({ error: message, brief: null }, { status: 500 });
  }
}
