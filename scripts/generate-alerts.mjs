import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL in .env.local");
}

if (!SUPABASE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function countPendingAlerts() {
  const { count, error } = await supabase
    .from("notification_queue_live")
    .select("*", { count: "exact", head: true })
    .eq("status", "PENDING");

  if (error) {
    throw new Error(`Pending alerts count failed: ${error.message}`);
  }

  return count ?? 0;
}

async function generateAlertQueue() {
  const { error } = await supabase.rpc("fn_generate_notification_queue_live");

  if (error) {
    throw new Error(`RPC fn_generate_notification_queue_live failed: ${error.message}`);
  }
}

async function main() {
  console.log("Generating Nexial alert queue...");

  const before = await countPendingAlerts();

  await generateAlertQueue();

  const after = await countPendingAlerts();
  const created = Math.max(after - before, 0);

  console.log(`Pending alerts before: ${before}`);
  console.log(`Pending alerts after: ${after}`);
  console.log(`New alerts created: ${created}`);
  console.log("Generate alerts completed.");
}

main().catch((error) => {
  console.error("Generate alerts failed:");
  console.error(error.message);
  process.exit(1);
});