import { spawn } from "node:child_process";

// 🔧 Helper exécution script
function runScript(script) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const proc = spawn("node", [script], {
      stdio: "inherit",
      shell: true,
    });

    proc.on("close", (code) => {
      const duration = ((Date.now() - start) / 1000).toFixed(2);

      if (code === 0) {
        console.log(`✔ ${script} completed in ${duration}s\n`);
        resolve();
      } else {
        reject(new Error(`${script} failed with code ${code}`));
      }
    });
  });
}

// 🧠 PIPELINE NEXIAL
async function main() {
  console.log("🚀 NEXIAL PIPELINE START\n");

  try {
    console.log("1️⃣ Market data update...");
    await runScript("scripts/update-market-data.mjs");

    console.log("2️⃣ Generate alerts...");
    await runScript("scripts/generate-alerts.mjs");

    console.log("3️⃣ Send alerts...");
    await runScript("scripts/send-alerts.mjs");

    console.log("✅ NEXIAL PIPELINE COMPLETED");
  } catch (err) {
    console.error("❌ PIPELINE FAILED");
    console.error(err.message);
    process.exit(1);
  }
}

main();