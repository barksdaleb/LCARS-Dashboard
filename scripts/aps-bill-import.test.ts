import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseAPSBill, parseUsageCategories, normalizeBill, reconcileBill } from "./lib/aps-bill";
import { SavingsAnalyzer } from "../app/lib/energy/SavingsAnalyzer";

const winter = `Bill Date: January 21, 2026
Billing Period: December 19, 2025 to January 21, 2026
Monthly Usage (kWh) 1241 1685 1547
On-Peak 23159 23239 80 kWh
Super Off-Peak 30920 31021 101 kWh
Off-Peak — — 1366 kWh`;

test("winter meter rows reconcile and do not confuse off-peak with super-off-peak", () => {
  const bill = parseAPSBill(winter);
  assert.equal(bill.superOffPeakKWh, 101);
  assert.equal(bill.offPeakKWh, 1366);
  assert.equal(reconcileBill(bill, winter).difference, 0);
});

test("absent seasonal usage defaults to zero even with a chart legend", () => {
  const text = winter.replace("Super Off-Peak 30920 31021 101 kWh", "On-Peak Super Off-Peak Off-Peak");
  assert.equal(parseAPSBill(text).superOffPeakKWh, 0);
});

test("meter rows accept commas, decimals, whitespace and dash placeholders", () => {
  const usage = parseUsageCategories("  On-Peak 1,000 1,100 100.25 kWh\r\n Super Off-Peak - – 1,234.50 kWh\n Off-Peak — — 500.25 kWh");
  assert.deepEqual(usage, { onPeakKWh: 100.25, offPeakKWh: 500.25, superOffPeakKWh: 1234.5 });
});

test("missing or malformed meter rows cannot falsely reconcile", () => {
  const text = winter.replace("101 kWh", "unknown kWh");
  const bill = parseAPSBill(text);
  assert.equal(bill.superOffPeakKWh, null);
  assert.equal(reconcileBill(bill, text).reconciled, false);
  assert.equal(parseUsageCategories("Super Off-Peak 0 10 10 kWh").offPeakKWh, null);
});

test("legacy history defaults only the absent field to zero", () => {
  const { superOffPeakKWh: omitted, ...legacy } = parseAPSBill(winter);
  assert.equal(omitted, 101);
  assert.equal(normalizeBill(legacy).superOffPeakKWh, 0);
  assert.equal(normalizeBill({ ...legacy, superOffPeakKWh: null }).superOffPeakKWh, null);
  assert.equal(normalizeBill({ ...legacy, superOffPeakKWh: 101 }).superOffPeakKWh, 101);
});

test("rounding is bounded by printed precision, never by a percentage of usage", () => {
  const bill = parseAPSBill(winter);
  assert.equal(reconcileBill({ ...bill, usageKWh: 1548 }, winter).reconciled, true);
  assert.equal(reconcileBill({ ...bill, usageKWh: 1550 }, winter).reconciled, false);
  const decimals = winter.replace("1241 1685 1547", "1241.00 1685.00 1547.00")
    .replace("80 kWh", "80.00 kWh").replace("101 kWh", "101.00 kWh").replace("1366 kWh", "1366.00 kWh");
  assert.equal(reconcileBill({ ...bill, usageKWh: 1547.01 }, decimals).reconciled, true);
  assert.equal(reconcileBill({ ...bill, usageKWh: 1547.03 }, decimals).reconciled, false);
  assert.equal(reconcileBill({ ...bill, onPeakKWh: NaN }, winter).reconciled, false);
});

test("savings includes super-off-peak costs and percentages with supplied plan rates", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aps-savings-test-"));
  try {
    const file = path.join(dir, "daily.csv");
    fs.writeFileSync(file, "date,onPeakKWh,offPeakKWh,superOffPeakKWh,totalKWh,demandKW\n2026-01-21,10,20,30,60,0\n");
    const analyzer = new SavingsAnalyzer(file,
      { onPeakRate: 0.3, offPeakRate: 0.1, superOffPeakRate: 0.05, demandRate: 0 },
      { onPeakRate: 0.2, offPeakRate: 0.1, superOffPeakRate: 0.02, demandRate: 0 });
    const result = analyzer.comparePlans("2026-01-21", "2026-01-21");
    assert.equal(result.superOffPeakKWh, 30);
    assert.equal(result.totalKWh, 60);
    assert.equal(result.oldPlanEnergyCost, 6.5);
    assert.equal(result.newPlanEnergyCost, 4.6);
    assert.ok(Math.abs(result.savingsPercent - (1.9 / 6.5) * 100) < 1e-10);
    assert.throws(() => new SavingsAnalyzer(file).comparePlans("2026-01-21", "2026-01-21"), /super-off-peak rate is required/);
    fs.writeFileSync(file, "date,onPeakKWh,offPeakKWh,totalKWh\n2026-07-21,10,20,30\n");
    assert.equal(new SavingsAnalyzer(file).comparePlans("2026-07-21", "2026-07-21").superOffPeakKWh, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("archived PDFs reprocess idempotently without changing the archive or legacy fields", async (t) => {
  const archive = path.resolve("data/import/aps/archive/bills");
  if (!fs.existsSync(archive)) return t.skip("Local APS PDF archive is unavailable");
  const { spawnSync } = await import("node:child_process");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aps-bill-import-test-"));
  try {
    const testArchive = path.join(dir, "data/import/aps/archive/bills");
    fs.cpSync(archive, testArchive, { recursive: true });
    const historyFile = path.join(dir, "data/history/aps/bills.json");
    fs.mkdirSync(path.dirname(historyFile), { recursive: true });
    const current = JSON.parse(fs.readFileSync("data/history/aps/bills.json", "utf8"));
    const legacy = { bills: current.bills.map((bill: Record<string, unknown>) => {
      const copy = { ...bill };
      delete copy.superOffPeakKWh;
      return copy;
    }) };
    fs.writeFileSync(historyFile, JSON.stringify(legacy));
    const run = () => spawnSync(process.execPath,
      ["--import", path.resolve("node_modules/tsx/dist/loader.mjs"), path.resolve("scripts/aps-bill-import.ts"), "--reprocess-archive"],
      { cwd: dir, encoding: "utf8" });
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    assert.doesNotMatch(first.stderr, /WARNING/);
    assert.equal((first.stdout.match(/Reconciled:/g) ?? []).length, 24);
    const result = fs.readFileSync(historyFile, "utf8");
    const bills = JSON.parse(result).bills;
    assert.equal(bills.length, 24);
    assert.equal(new Set(bills.map((b: {billingStart: string; billingEnd: string}) => `${b.billingStart}|${b.billingEnd}`)).size, 24);
    for (const bill of bills) {
      assert.equal(bill.onPeakKWh + bill.offPeakKWh + bill.superOffPeakKWh, bill.usageKWh);
      const { superOffPeakKWh, ...unchanged } = bill;
      assert.equal(typeof superOffPeakKWh, "number");
      assert.deepEqual(unchanged, legacy.bills.find((b: Record<string, unknown>) => b.billingStart === bill.billingStart && b.billingEnd === bill.billingEnd));
    }
    assert.equal(run().status, 0);
    assert.equal(fs.readFileSync(historyFile, "utf8"), result);
    assert.deepEqual(fs.readdirSync(testArchive), fs.readdirSync(archive));
    for (const file of fs.readdirSync(archive)) {
      assert.deepEqual(fs.readFileSync(path.join(testArchive, file)), fs.readFileSync(path.join(archive, file)));
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
