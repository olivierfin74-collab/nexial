import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_FLASH_DROP_CONFIG,
  detectFlashDrops,
  type FlashDropCandidate,
} from "@/lib/flashDrops";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 10);
    const { data, error } = await sb()
      .from("flash_drop_events")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 50));

    if (error) {
      if (error.code === "42P01") return NextResponse.json({ events: [] });
      throw error;
    }

    return NextResponse.json({ events: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/flash-drops GET] error:", err);
    return NextResponse.json({ error: message, events: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const candidates = Array.isArray(body?.candidates) ? body.candidates as FlashDropCandidate[] : [];
    const config = {
      minMarketCap: Number(body?.config?.minMarketCap ?? DEFAULT_FLASH_DROP_CONFIG.minMarketCap),
      minVolume: Number(body?.config?.minVolume ?? DEFAULT_FLASH_DROP_CONFIG.minVolume),
    };

    const events = detectFlashDrops(candidates, config);
    if (events.length === 0) {
      return NextResponse.json({ inserted: 0, events: [] });
    }

    const { data, error } = await sb()
      .from("flash_drop_events")
      .upsert(events, { onConflict: "ticker,source,detection_bucket", ignoreDuplicates: true })
      .select("*");

    if (error) throw error;

    return NextResponse.json({
      inserted: data?.length || 0,
      events: data || [],
      detected: events.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/flash-drops POST] error:", err);
    return NextResponse.json({ error: message, inserted: 0, events: [] }, { status: 500 });
  }
}
