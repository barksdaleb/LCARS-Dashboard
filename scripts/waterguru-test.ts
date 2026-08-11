import { WaterGuruAPI } from "waterguru-api-js/dist/index.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const email = process.env.WATERGURU_EMAIL!;
  const password = process.env.WATERGURU_PASSWORD!;

  console.log("Connecting to WaterGuru...");

  const api = new WaterGuruAPI(email, password);

  const dashboard = await api.getDashboard();

  console.log(JSON.stringify(dashboard, null, 2));
}

main().catch(console.error);