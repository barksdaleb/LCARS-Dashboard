import { updateWeather } from "./weather";
import { updateAPS } from "./aps";

async function updateSystem() {
  console.log("================================");
  console.log("       BHEM SYSTEM UPDATE");
  console.log("================================");
  console.log("");

  console.log("🌤️ Updating Weather...");
  await updateWeather();

  console.log("");

  console.log("⚡ Updating APS...");
  await updateAPS();

  console.log("");

  console.log("================================");
  console.log("✅ SYSTEM UPDATE COMPLETE");
  console.log("================================");
}

updateSystem().catch(console.error);