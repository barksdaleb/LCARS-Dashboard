import assert from "node:assert/strict";
import { test } from "node:test";
import crypto from "node:crypto";
import { JackeryClient } from "./client";

test("connection test sends encrypted credentials and accepts a valid token", async t => {
  t.mock.method(globalThis, "fetch", async (input: URL, init: RequestInit) => {
    assert.equal(input.origin + input.pathname, "https://iot.jackeryapp.com/v1/auth/login");
    assert.equal(init.method, "POST");
    assert.ok(init.body instanceof FormData);
    assert.ok(init.signal);
    assert.equal(input.searchParams.has("password"), false);
    const encrypted = input.searchParams.get("aesEncryptData");
    assert.ok(encrypted);
    const cipher = crypto.createDecipheriv("aes-128-ecb", Buffer.from("1234567890123456"), null);
    const payload = JSON.parse(Buffer.concat([cipher.update(Buffer.from(encrypted, "base64")), cipher.final()]).toString());
    assert.equal(payload.account, "test@example.com");
    assert.equal(payload.password, "test-password");
    assert.equal(payload.registerAppId, "com.hbxn.jackery");
    assert.match(payload.macId, /^2[0-9a-f]{32}$/);
    assert.ok(input.searchParams.get("rsaForAesKey"));
    return Response.json({ code: 0, token: "test-token" });
  });
  assert.equal(await new JackeryClient("test@example.com", "test-password").testConnection(), true);
});

test("connection test rejects missing credentials without network access", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected request"); });
  await assert.rejects(new JackeryClient("", "").testConnection(), /email and password are required/);
  assert.equal(fetch.mock.callCount(), 0);
});

test("connection test rejects HTTP failures, rejected logins and malformed responses", async t => {
  const responses = [new Response("denied", { status: 403 }), Response.json({ code: 1, token: "invalid" }), Response.json({ code: 0 }), Response.json(null)];
  t.mock.method(globalThis, "fetch", async () => responses.shift()!);
  const client = new JackeryClient("test@example.com", "test-password");
  await assert.rejects(client.testConnection(), /HTTP 403/);
  for (let i = 0; i < 3; i++) await assert.rejects(client.testConnection(), /no valid authentication token/);
});
