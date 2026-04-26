import dotenv from "dotenv";

if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: ".env.local" });
}

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegram(chatId, message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML"
    })
  });
}

async function main() {
  console.log("Checking alerts...");

  const { data: notifications } = await supabase
    .from("user_notifications")
    .select("*")
    .eq("status", "PENDING");

  if (!notifications || notifications.length === 0) {
    console.log("No alerts.");
    return;
  }

  const { data: channels } = await supabase
    .from("user_channels")
    .select("*");

  const map = {};
  channels.forEach(c => map[c.user_id] = c.telegram_chat_id);

  for (const n of notifications) {
    const chatId = map[n.user_id];
    if (!chatId) continue;

    await sendTelegram(chatId, `🔥 NEXIAL ALERT\n\n${n.message}`);

    await supabase
      .from("user_notifications")
      .update({ status: "SENT" })
      .eq("id", n.id);

    console.log("Sent:", n.ticker);
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});