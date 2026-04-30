import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;

  if (!supabaseUrl || !serviceRoleKey || !telegramToken || !telegramChatId) {
    return NextResponse.json(
      { error: "Missing env variables" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from("telegram_alerts_live_v1")
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({
      success: true,
      sent: 0,
      message: "No live alert. Market above buy zones.",
    });
  }

  let sent = 0;

  for (const alert of data) {
    const response = await fetch(
      `https://api.telegram.org/bot${telegramToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: alert.telegram_message,
        }),
      }
    );

    if (response.ok) sent++;
  }

  return NextResponse.json({
    success: true,
    sent,
    alerts: data,
  });
}