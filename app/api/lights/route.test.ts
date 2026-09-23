import assert from "node:assert/strict";
import { test } from "node:test";
import https from "node:https";
import { GET, POST } from "./route";

test("light API returns typed request failures without contacting a bridge", async t => {
  t.mock.method(https, "request", () => { throw new Error("Bridge offline"); });
  const response = await GET();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Bridge offline" });
});

test("light API handles unknown errors and leaves unrecognized commands unchanged", async t => {
  t.mock.method(https, "request", () => { throw "offline"; });
  assert.deepEqual(await (await GET()).json(), { error: "Unknown error" });
  const request = new Request("http://localhost/api/lights", { method: "POST", body: JSON.stringify({ command: "not a light command" }) });
  const response = await POST(request);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: false, message: "Unknown command" });
});
