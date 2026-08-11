import { JackeryClient } from "../app/lib/jackery/client";

async function main() {
  const client = new JackeryClient(
    process.env.JACKERY_EMAIL!,
    process.env.JACKERY_PASSWORD!
  );

  await client.testConnection();
}

main().catch(console.error);