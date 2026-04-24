import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      alertId,
      executionPrice,
      executionQuantity,
      executionAmount,
    }: {
      alertId?: string;
      executionPrice?: number | null;
      executionQuantity?: number | null;
      executionAmount?: number | null;
    } = body ?? {};

    if (!alertId) {
      return NextResponse.json(
        { error: "alertId est requis" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc("fn_log_execute_alert_v3", {
      p_alert_id: alertId,
      p_execution_price: executionPrice ?? null,
      p_execution_quantity: executionQuantity ?? null,
      p_execution_amount: executionAmount ?? null,
    });

    if (error) {
      return NextResponse.json(
        { error: `Erreur exécution alerte: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erreur inconnue sur execute";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}