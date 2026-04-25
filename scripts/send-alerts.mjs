import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!TELEGRAM_BOT_TOKEN) throw new Error("Missing TELEGRAM_BOT_TOKEN");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getPendingNotifications() {
  const { data: notifications, error } = await supabase
    .from("user_notifications")
    .select("*")
    .eq("status", "PENDING")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Fetch notifications failed: ${error.message}`);

  if (!notifications || notifications.length === 0) return [];

  const userIds = [...new Set(notifications.map(n => n.user_id))];

  const { data: channels, error: chError } = await supabase
    .from("user_channels")
    .select("user_id, telegram_chat_id")
    .in("user_id", userIds);

  if (chError) throw new Error(`Fetch channels failed: ${chError.message}`);

  const channelMap = {};
  channels.forEach(c => {
    channelMap[c.user_id] = c.telegram_chat_id;
  });

  return notifications.map(n => ({
    ...n,
    telegram_chat_id: channelMap[n.user_id]
  }));
}

async function sendTelegram(chatId, message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
  }
}

async function markAsSent(id) {
  const { error } = await supabase
    .from("user_notifications")
    .update({
      status: "SENT",
      sent_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`Mark as sent failed: ${error.message}`);
}

async function main() {
  console.log("🚀 Checking multi-user alerts...");

  const alerts = await getPendingNotifications();

  if (alerts.length === 0) {
    console.log("No pending alerts.");
    return;
  }

  for (const alert of alerts) {
    const chatId = alert.telegram_chat_id;

    if (!chatId) {
      console.log(`⚠️ No Telegram linked for user ${alert.user_id}`);
      continue;
    }

    const message = `🔥 <b>NEXIAL ALERT</b>\n\n${alert.message}`;

    try {
      await sendTelegram(chatId, message);
      await markAsSent(alert.id);

      console.log(`✅ Alert sent → user ${alert.user_id} (${alert.ticker})`);
    } catch (err) {
      console.error(`❌ Failed sending alert ${alert.id}`);
      console.error(err.message);
    }
  }

  console.log("🎯 Done.");
}

main().catch((err) => {
  console.error("❌ Global failure:");
  console.error(err.message);
  process.exit(1);
});