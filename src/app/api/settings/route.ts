import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID_DEV = "4c1610db-25cd-4eca-b16a-b5bb4898f4ff";

type SettingsPatch = {
  telegram?: {
    is_active?: boolean;
    chat_id?: string | null;
    min_priority?: string;
    quiet_hours_start?: number;
    quiet_hours_end?: number;
  };
  alerts?: {
    default_filter?: string;
    default_sort?: string;
  };
  behavior?: {
    kill_switch_enabled?: boolean;
    auto_dismiss_hours?: number;
    confirm_watchlist_delete?: boolean;
  };
  system?: {
    show_technical_details?: boolean;
  };
};

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

const emptyIfMissing = (error: { code?: string } | null) => {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST116";
};

export async function GET() {
  try {
    const supabase = sb();
    const [telegramRes, guardsRes, reviewRes] = await Promise.all([
      supabase.from("telegram_subscriptions").select("*").eq("user_id", USER_ID_DEV).maybeSingle(),
      supabase.from("behavioral_guards_config").select("*").eq("user_id", USER_ID_DEV).maybeSingle(),
      supabase.from("vw_olivier_daily_review").select("*").limit(1).maybeSingle(),
    ]);

    if (telegramRes.error && !emptyIfMissing(telegramRes.error)) throw telegramRes.error;
    if (guardsRes.error && !emptyIfMissing(guardsRes.error)) throw guardsRes.error;

    return NextResponse.json({
      telegram: telegramRes.data || null,
      behavior: guardsRes.data || null,
      system: reviewRes.error ? null : reviewRes.data || null,
      user: {
        id: USER_ID_DEV,
        email: "olivier@nexial.local",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/settings GET] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as SettingsPatch;
    const supabase = sb();

    if (body.telegram) {
      const telegramPatch = {
        user_id: USER_ID_DEV,
        ...body.telegram,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("telegram_subscriptions")
        .upsert(telegramPatch, { onConflict: "user_id" });
      if (error) throw error;
    }

    const behaviorPatch = {
      ...(body.alerts ? {
        default_alert_filter: body.alerts.default_filter,
        default_alert_sort: body.alerts.default_sort,
      } : {}),
      ...(body.behavior ? body.behavior : {}),
      ...(body.system ? body.system : {}),
    };

    if (Object.keys(behaviorPatch).length > 0) {
      const { error } = await supabase
        .from("behavioral_guards_config")
        .upsert({
          user_id: USER_ID_DEV,
          ...behaviorPatch,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/settings PATCH] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
