import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import APSBillHistory from "./APSBillHistory";

test("bill panel renders actual costs, observed goal progress, attribution and null demand", () => {
  const html = renderToStaticMarkup(<APSBillHistory />);
  for (const text of ["$6,008.88", "$6,361.10", "−$352.22", "-5.54%", "$226.49", "$190.45", "$416.94", "$273.51", "45.30%", "2.95%", "Show all 24 bills", "Transition", "Full post-Home-Ops", "Pre-Home-Ops", "not proof of Home Ops savings", "No demand charge on older plan", "May 22, 2026"]) {
    assert.ok(html.includes(text), `Missing expected panel content: ${text}`);
  }
  assert.ok(html.includes('role="progressbar"'));
  assert.ok(html.includes('aria-valuenow="45.3"'));
  assert.ok(html.includes('aria-pressed="false"'));
  assert.equal((html.match(/scope="row"/g) ?? []).length, 12);
  assert.doesNotMatch(html, /NaN|Infinity|undefined/);
});
