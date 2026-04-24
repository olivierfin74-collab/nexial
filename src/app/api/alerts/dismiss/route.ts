import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { alertId }: { alertId?: string } = body ?? {};

    if (!alertId) {
      return NextResponse.json(
        { error: "alertId est requis" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc("fn_log_dismiss_alert_v2", {
      p_alert_id: alertId,
    });

    if (error) {
      return NextResponse.json(
        { error: `Erreur dismiss alerte: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erreur inconnue sur dismiss";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}