import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildLadderPlans, type LadderSourceEvent } from "@/lib/ladderBuilder";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "nx" },
    auth: { persistSession: false },
  });
}

function mapEvent(row: Record<string, unknown>, atrByEvent: Map<string, number>): LadderSourceEvent | null {
  const id = typeof row.id === "string" ? row.id : null;
  const ticker = typeof row.ticker === "string" ? row.ticker : null;
  const price = typeof row.price === "number" ? row.price : null;
  if (!id || !ticker || price == null) return null;

  return {
    id,
    ticker,
    price,
    asset_id: typeof row.asset_id === "string" ? row.asset_id : null,
    atr: atrByEvent.get(id) ?? null,
  };
}

async function readEvents(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event_id");
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 1), 50);
  let query = sb()
    .from("flash_drop_events")
    .select("id, asset_id, ticker, price, detected_at")
    .not("price", "is", null)
    .order("detected_at", { ascending: false })
    .limit(limit);

  if (eventId) query = query.eq("id", eventId);
  return query;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("event_id");
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 1), 50);
    let query = sb()
      .from("ladder_plans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (eventId) query = query.eq("flash_drop_event_id", eventId);
    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01") return NextResponse.json({ plans: [] });
      throw error;
    }

    return NextResponse.json({ plans: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/flash-drops/ladders GET] error:", err);
    return NextResponse.json({ error: message, plans: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const atrByEvent = new Map<string, number>(
      Object.entries(body?.atr_by_event || {})
        .filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1])),
    );
    const eventsRes = await readEvents(req);

    if (eventsRes.error) {
      if (eventsRes.error.code === "42P01") return NextResponse.json({ inserted: 0, plans: [] });
      throw eventsRes.error;
    }

    const events = (eventsRes.data || [])
      .map((row) => mapEvent(row as Record<string, unknown>, atrByEvent))
      .filter((event): event is LadderSourceEvent => event !== null);
    const plans = buildLadderPlans(events);

    if (plans.length === 0) return NextResponse.json({ inserted: 0, plans: [] });

    const { data, error } = await sb()
      .from("ladder_plans")
      .upsert(plans, { onConflict: "flash_drop_event_id", ignoreDuplicates: true })
      .select("*");

    if (error) throw error;

    return NextResponse.json({
      inserted: data?.length || 0,
      planned: plans.length,
      plans: data || [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/flash-drops/ladders POST] error:", err);
    return NextResponse.json({ error: message, inserted: 0, plans: [] }, { status: 500 });
  }
}
