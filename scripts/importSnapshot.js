require("dotenv").config({ path: ".env.local" });

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const SNAPSHOT_FILE_PATH =
  "D:/Projet application IA/nexial/Doc/Prompt nexial sauvegarde/NEXIAL CORE PROMPT v2.0.md";

const PROJECT_CODE = "NEXIAL";
const SNAPSHOT_VERSION = "v2.0";

async function run() {
  try {
    console.log("🚀 Starting snapshot import...");

    // 1. Load env variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error("❌ NEXT_PUBLIC_SUPABASE_URL is missing in .env.local");
    }

    if (!serviceRoleKey) {
      throw new Error("❌ SUPABASE_SERVICE_ROLE_KEY is missing in .env.local");
    }

    // 2. Init Supabase
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 3. Check file exists
    if (!fs.existsSync(SNAPSHOT_FILE_PATH)) {
      throw new Error(`❌ File not found: ${SNAPSHOT_FILE_PATH}`);
    }

    // 4. Read file
    const content = fs.readFileSync(SNAPSHOT_FILE_PATH, "utf-8");

    if (!content || content.length < 100) {
      throw new Error("❌ Snapshot content seems empty or too small");
    }

    console.log("📄 Snapshot file loaded");

    // 5. Get project id
    const { data: project, error: projectError } = await supabase
      .from("dev_projects")
      .select("id")
      .eq("project_code", PROJECT_CODE)
      .single();

    if (projectError || !project) {
      throw new Error(`❌ Project not found: ${PROJECT_CODE}`);
    }

    console.log("📁 Project found:", PROJECT_CODE);

    // 6. Update snapshot
    const { error: updateError } = await supabase
      .from("dev_snapshots")
      .update({
        content_md: content,
        updated_at: new Date().toISOString(),
      })
      .eq("snapshot_version", SNAPSHOT_VERSION)
      .eq("project_id", project.id);

    if (updateError) {
      throw new Error(`❌ Update failed: ${updateError.message}`);
    }

    console.log("✅ Snapshot updated successfully");

    // 7. Quick verification
    const { data: check } = await supabase
      .from("dev_snapshots")
      .select("snapshot_version, content_md")
      .eq("snapshot_version", SNAPSHOT_VERSION)
      .eq("project_id", project.id)
      .single();

    console.log("🔍 Preview:");
    console.log(check.content_md.substring(0, 120));

    console.log("🎉 DONE");

  } catch (error) {
    console.error("🔥 ERROR:");
    console.error(error.message);
  }
}

run();