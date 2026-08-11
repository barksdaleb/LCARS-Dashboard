import WaterGuruAPI from "./client";

export class WaterGuruClient {
  private api: WaterGuruAPI;

constructor() {
  const username = process.env.WATERGURU_EMAIL;
  const password = process.env.WATERGURU_PASSWORD;

  console.log("======== WATERGURU DEBUG ========");
  console.log("EMAIL:", username);
  console.log("PASSWORD FOUND:", !!password);
  console.log("=================================");

  if (!username || !password) {
    throw new Error(
      "Missing WATERGURU_EMAIL or WATERGURU_PASSWORD in .env.local"
    );
  }

  this.api = new WaterGuruAPI({
    username,
    password,
  });
}

  async getDashboard() {
    return await this.api.getDashboard();
  }
}