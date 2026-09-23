import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import SystemStatusBar from "./SystemStatusBar";

test("status clock preserves its server hydration placeholder", () => {
  const html = renderToStaticMarkup(<SystemStatusBar />);
  assert.ok(html.includes("--:--:--"));
  assert.ok(html.includes("ALL SYSTEMS ONLINE"));
  assert.doesNotMatch(html, /Invalid Date|NaN/);
});
