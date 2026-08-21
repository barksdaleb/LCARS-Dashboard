import { execSync } from "child_process";

import { updateWeather } from "./weather";
import { updateAPS } from "./aps";
import { printDataFreshness } from "./data-freshness";

function runCommand(
  label: string,
  command: string
) {
  console.log("");
  console.log(label);

  try {
    execSync(command, {
      stdio: "inherit",
      cwd: process.cwd(),
    });
  } catch (error) {
    console.error(
      `⚠ ${label} failed.`
    );

    throw error;
  }
}

async function updateSystem() {
  console.log("================================");
  console.log("       HOME OPS SYSTEM UPDATE");
  console.log("================================");

  // --------------------------------
  // Import newly downloaded history
  // --------------------------------

  runCommand(
    "🌡️ Importing Ecobee...",
    "npm run ecobee"
  );

  runCommand(
    "⚡ Importing APS Usage...",
    "npm run aps-import"
  );

  runCommand(
    "🧾 Importing APS Bills...",
    "npx tsx scripts/aps-bill-import.ts"
  );

  // --------------------------------
  // Update live/current intelligence
  // --------------------------------

  console.log("");
  console.log("🌤️ Updating Weather...");
  await updateWeather();

  console.log("");
  console.log("⚡ Updating APS Intelligence...");
  await updateAPS();

  // --------------------------------
  // Analyze Ecobee
  // --------------------------------

  console.log("");
  console.log("🧠 Updating HVAC Intelligence...");

  try {
    execSync(
      "npm run ecobee:analyze",
      {
        stdio: "ignore",
        cwd: process.cwd(),
      }
    );

    console.log(
      "HVAC analysis updated."
    );
  } catch (error) {
    console.error(
      "⚠ HVAC analysis failed."
    );

    throw error;
  }

  // --------------------------------
  // Calculate financial results
  // --------------------------------

  runCommand(
    "💰 Updating Savings Intelligence...",
    "npx tsx scripts/savings-analyze.ts"
  );

  // --------------------------------
  // Verify freshness
  // --------------------------------

  console.log("");
  printDataFreshness();

  console.log("");
  console.log("================================");
  console.log("✅ HOME OPS UPDATE COMPLETE");
  console.log("================================");
}

updateSystem().catch((error) => {
  console.error("");
  console.error(
    "❌ HOME OPS UPDATE FAILED"
  );

  console.error(error);

  process.exit(1);
});