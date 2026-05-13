// Pass-through to nx.fn_alerts_decisional_feed_v2 (decisional feed).
//
// Items in the returned `sections` use the FULL V2 shape
// (verdict / explanation / position / thesis / technical / actions / footer).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { DecisionalFeedPayload, ExperienceMode } from "@/types/decision";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

const VALID_MODES: ExperienceMode[] = ["BEGINNER", "STANDARD", "PRO"];

export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Supabase environment missing", feed: null },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") || USER_ID_DEV;
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
    const modeParam = searchParams.get("experience_mode");
    const experienceMode: ExperienceMode =
      modeParam && (VALID_MODES as string[]).includes(modeParam)
        ? (modeParam as ExperienceMode)
        : "STANDARD";
    const onlyActive = searchParams.get("only_active") !== "false";
    const dedupByTicker = searchParams.get("dedup_by_ticker") !== "false";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "nx" },
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("fn_alerts_decisional_feed_v2", {
      p_user_id: userId,
      p_limit: limit,
      p_experience_mode: experienceMode,
      p_only_active: onlyActive,
      p_dedup_by_ticker: dedupByTicker,
    });

    if (error) throw error;
    return NextResponse.json({
      feed: (data as DecisionalFeedPayload | null) ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/alerts/feed] error:", err);
    return NextResponse.json({ error: message, feed: null }, { status: 500 });
  }
}
