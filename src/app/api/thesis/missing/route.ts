// Pass-through to nx.fn_positions_without_thesis.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { PositionsWithoutThesisPayload } from "@/types/decision";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Supabase environment missing", positions: null },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") || USER_ID_DEV;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "nx" },
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("fn_positions_without_thesis", {
      p_user_id: userId,
    });

    if (error) throw error;
    return NextResponse.json({
      positions: (data as PositionsWithoutThesisPayload | null) ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/thesis/missing] error:", err);
    return NextResponse.json(
      { error: message, positions: null },
      { status: 500 },
    );
  }
}
