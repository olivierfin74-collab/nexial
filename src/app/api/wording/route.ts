// Pass-through to nx.fn_get_wording_dictionary.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  assertDecisionalSchemaV2,
  type WordingDictionaryPayload,
} from "@/types/decision";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Supabase environment missing", wording: null },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(req.url);
    const context = searchParams.get("context");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "nx" },
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("fn_get_wording_dictionary", {
      p_context: context ?? undefined,
    });

    if (error) throw error;
    const wording = (data as (WordingDictionaryPayload & { schema_version?: unknown }) | null) ?? null;
    assertDecisionalSchemaV2(wording);
    return NextResponse.json({ wording });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/wording] error:", err);
    return NextResponse.json({ error: message, wording: null }, { status: 500 });
  }
}
