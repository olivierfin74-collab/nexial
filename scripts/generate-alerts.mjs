import dotenv from "dotenv";

if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: ".env.local" });
}

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("Generating alerts...");

  const { error } = await supabase.rpc("fn_generate_user_notifications");

  if (error) throw new Error(error.message);

  console.log("Alerts generated.");
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});