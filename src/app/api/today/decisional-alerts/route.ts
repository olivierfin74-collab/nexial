// Pass-through to nx.fn_inbox_decisional.
//
// The backend is the source of truth: this route does NOT transform or
// re-map the payload. It only forwards the JSON shipped by the RPC.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  assertDecisionalSchemaV2,
  type ExperienceMode,
  type InboxPayload,
} from "@/types/decision";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

const VALID_MODES: ExperienceMode[] = ["BEGINNER", "STANDARD", "PRO"];

export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Supabase environment missing", inbox: null },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") || USER_ID_DEV;
    const limit = Math.min(Number(searchParams.get("limit") || 30), 100);
    const modeParam = searchParams.get("experience_mode");
    const experienceMode: ExperienceMode =
      modeParam && (VALID_MODES as string[]).includes(modeParam)
        ? (modeParam as ExperienceMode)
        : "STANDARD";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "nx" },
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("fn_inbox_decisional", {
      p_user_id: userId,
      p_experience_mode: experienceMode,
      p_limit: limit,
    });

    if (error) throw error;
    const inbox = (data as InboxPayload | null) ?? null;
    assertDecisionalSchemaV2(inbox);
    return NextResponse.json({ inbox });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/today/decisional-alerts] error:", err);
    return NextResponse.json({ error: message, inbox: null }, { status: 500 });
  }
}
