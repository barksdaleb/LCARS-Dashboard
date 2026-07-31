import https from "https";

type LightAction =
  | { type: "on" }
  | { type: "off" }
  | { type: "color"; color: "red" | "blue" | "purple" | "orange" | "white" }
  | { type: "brightness"; value: number }
  | { type: "scene"; scene: "bridge" | "alert" | "movie" };

// =======================
// PARSE COMMAND
// =======================
function parseCommand(raw: string): LightAction | null {
  const cmd = raw.toLowerCase();

  if (cmd.includes("bridge mode")) return { type: "scene", scene: "bridge" };
  if (cmd.includes("red alert")) return { type: "scene", scene: "alert" };
  if (cmd.includes("movie mode")) return { type: "scene", scene: "movie" };

  if (cmd.includes("lights on") || cmd === "on") return { type: "on" };
  if (cmd.includes("lights off") || cmd === "off") return { type: "off" };

  if (cmd.includes("red")) return { type: "color", color: "red" };
  if (cmd.includes("blue")) return { type: "color", color: "blue" };
  if (cmd.includes("purple")) return { type: "color", color: "purple" };
  if (cmd.includes("orange")) return { type: "color", color: "orange" };
  if (cmd.includes("white")) return { type: "color", color: "white" };

  const dimMatch = cmd.match(/(\d{1,3})\s*percent/);
  if (cmd.includes("dim") && dimMatch) {
    return {
      type: "brightness",
      value: Math.max(1, Math.min(100, Number(dimMatch[1]))),
    };
  }

  return null;
}

// =======================
// HUE STATE
// =======================
function hueStateForAction(action: LightAction) {
  switch (action.type) {
    case "on":
      return { on: true };

    case "off":
      return { on: false };

    case "brightness":
      return {
        on: true,
        bri: Math.round((action.value / 100) * 254),
      };

    case "color":
      if (action.color === "red") return { on: true, hue: 0, sat: 254, bri: 254 };
      if (action.color === "blue") return { on: true, hue: 46920, sat: 254, bri: 254 };
      if (action.color === "purple") return { on: true, hue: 56100, sat: 254, bri: 254 };
      if (action.color === "orange") return { on: true, hue: 8000, sat: 254, bri: 254 };
      return { on: true, sat: 0, bri: 254 };

    case "scene":
      if (action.scene === "bridge") {
        return { on: true, hue: 8000, sat: 180, bri: 180 };
      }

      if (action.scene === "movie") {
        return { on: true, hue: 8000, sat: 120, bri: 60 };
      }

      // red alert fallback
      return { on: true, hue: 0, sat: 254, bri: 254 };
  }
}

// =======================
// HUE REQUEST
// =======================
function hueRequest(path: string, method = "GET", body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const ip = process.env.HUE_BRIDGE_IP!;
    const key = process.env.HUE_APP_KEY!;

    const data = body ? JSON.stringify(body) : undefined;

    const options: https.RequestOptions = {
      hostname: ip,
      path: `/api/${key}${path}`,
      method,
      rejectUnauthorized: false,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let response = "";

      res.on("data", (chunk) => (response += chunk));

      res.on("end", () => {
        try {
          resolve(JSON.parse(response));
        } catch {
          resolve(response);
        }
      });
    });

    req.on("error", reject);

    if (data) req.write(data);

    req.end();
  });
}

// =======================
// APPLY ACTION
// =======================
async function applyHueAction(action: LightAction, command: string) {
  const cmd = command.toLowerCase();

  const roomMap: Record<string, string[]> = {
    office: ["1", "2", "3"],

    carter: ["11", "12", "13", "14", "15"],

    hall: ["16"],
    laundry: ["17"],
    garage: ["18"],

    kitchen: ["43", "45", "46", "49", "50", "51", "68"],

    frontRoom: ["48", "52", "54", "55", "57"],

    // 🔥 FIXED dining (no entry bleed)
    dining: ["30", "31", "33", "37", "39"],

    guest: ["40", "41", "42"],

    master: ["44", "58", "59", "60", "61", "62", "63"],

    entry: ["53", "65"],
  };

  let ids: string[] = roomMap.office;

  for (const room in roomMap) {
    if (cmd.includes(room.toLowerCase())) {
      ids = roomMap[room];
      break;
    }
  }

  const state = hueStateForAction(action);

  // 🔥 sequential = reliable
  for (const id of ids) {
    await hueRequest(`/lights/${id}/state`, "PUT", state);
  }

  return {
    ok: true,
    lightsAffected: ids.length,
  };
}

// =======================
// GET
// =======================
export async function GET() {
  try {
    const lights = await hueRequest("/lights");

    return Response.json({
      hueConfigured: true,
      lights,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// =======================
// POST
// =======================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const command = String(body.command || "");

    const action = parseCommand(command);

    if (!action) {
      return Response.json({ ok: false, message: "Unknown command" });
    }

    const result = await applyHueAction(action, command);

    return Response.json({
      ok: true,
      result,
      message: "Command acknowledged.",
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}