// Pass-through to nx.fn_set_watch_level.
// Mutation triggered by an explicit user click on a CTA — never on load.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { MutationResult, WatchLevel } from "@/types/nexial-v3";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

interface Body {
  asset_id: string;
  watch_level: WatchLevel;
  user_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { data: null, error: { code: "fetch_failed", detail: "Supabase environment missing" } },
        { status: 500 },
      );
    }

    const body = (await req.json()) as Body;
    if (!body?.asset_id) {
      return NextResponse.json(
        { data: null, error: { code: "fetch_failed", detail: "Missing asset_id" } },
        { status: 400 },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "nx" },
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("fn_set_watch_level", {
      p_asset_id: body.asset_id,
      p_watch_level: body.watch_level,
      p_user_id: body.user_id ?? USER_ID_DEV,
    });

    if (error) {
      console.error("[/api/mobile/sniper/watch-level] rpc error:", error);
      return NextResponse.json(
        { data: null, error: { code: "fetch_failed", detail: error.message } },
        { status: 502 },
      );
    }

    return NextResponse.json({ data: (data as MutationResult | null) ?? null });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/mobile/sniper/watch-level] error:", err);
    return NextResponse.json(
      { data: null, error: { code: "fetch_failed", detail } },
      { status: 500 },
    );
  }
}
