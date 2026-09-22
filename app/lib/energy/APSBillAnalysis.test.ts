import assert from "node:assert/strict";
import { test } from "node:test";
import history from "../../../data/history/aps/bills.json";
import { analyzeAPSBills, billDateISO, classifyBill, usageMix, type BillInput } from "./APSBillAnalysis";

const sample: BillInput = {
  billDate: "September 21, 2026", billingStart: "August 19, 2026", billingEnd: "September 21, 2026",
  totalEnergyCost: 80, lastYearTotalCost: 100, usageKWh: 60, lastYearUsageKWh: 70,
  onPeakKWh: 10, offPeakKWh: 20, superOffPeakKWh: 30, peakDemandKW: null, demandCharge: null,
};

test("24 actual bills produce the expected rolling annual costs and usage", () => {
  const original = JSON.stringify(history);
  const result = analyzeAPSBills(history.bills);
  assert.equal(JSON.stringify(history), original, "analysis must not sort/mutate the source history");
  assert.equal(result.rolling.startMonth, "2025-10");
  assert.equal(result.rolling.endMonth, "2026-09");
  assert.equal(result.rolling.currentCost, 6008.88);
  assert.equal(result.rolling.priorCost, 6361.10);
  assert.equal(result.rolling.costDifference, -352.22);
  assert.equal(result.rolling.costDifferencePercent, -5.54);
  assert.equal(result.rolling.currentKWh, 32731);
  assert.equal(result.rolling.priorKWh, 33541);
  assert.equal(result.rolling.kWhDifference, -810);
  assert.equal(result.rolling.archivedPriorCount, 12);
  assert.equal(result.allHistoryMix.totalKWh, 66272);
});

test("all 12 current monthly comparisons match actual prior bills", () => {
  const rows = analyzeAPSBills([...history.bills].reverse()).current;
  assert.deepEqual(rows.map(b => b.costDifference), [-80.67, 73.26, -31.51, -13.41, 5.97, 110.65, 115.21, 34.70, 24.01, -173.49, -190.45, -226.49]);
  assert.deepEqual(rows.map(b => b.kWhDifference), [-534, 386, -235, -138, -50, 511, 543, 80, -1, -1145, -243, 16]);
  assert.ok(rows.every(b => b.priorCostSource === "archived bill"));
});

test("transition reduction is separate from cumulative full-post reduction and annual goal", () => {
  const { homeOps, goal } = analyzeAPSBills(history.bills);
  assert.deepEqual(homeOps, {
    preCount: 22, transitionCount: 1, postCount: 1,
    cumulativeReduction: 226.49, transitionReduction: 190.45, includingTransitionReduction: 416.94,
  });
  assert.equal(goal.percent, 45.30);
  assert.equal(goal.remaining, 273.51);
  assert.equal(goal.start, "2026-07-29");
  assert.equal(goal.end, "2027-07-29");
});

test("classification uses service dates, including exact launch boundaries", () => {
  assert.equal(classifyBill("2026-06-29", "2026-07-29"), "pre");
  assert.equal(classifyBill("2026-07-22", "2026-08-19"), "transition");
  assert.equal(classifyBill("2026-07-29", "2026-08-29"), "post");
  const bill = analyzeAPSBills([{ ...sample, billDate: "August 2, 2026", billingStart: "June 22, 2026", billingEnd: "July 22, 2026" }]);
  assert.equal(bill.rows[0].phase, "pre", "a late issue date cannot make a pre-launch service period post-launch");
});

test("archived actual totals take precedence over printed comparison and energy-only costs", () => {
  const result = analyzeAPSBills([
    { ...sample, lastYearTotalCost: 999, lastYearUsageKWh: 999 },
    { ...sample, billDate: "September 21, 2025", billingStart: "August 19, 2025", billingEnd: "September 21, 2025", totalEnergyCost: 90, usageKWh: 65 },
  ]);
  assert.equal(result.rows[1].costDifference, -10);
  assert.equal(result.rows[1].kWhDifference, -5);
  assert.equal(result.rows[0].priorCostSource, "bill-reported prior year");
  assert.equal(result.rows[0].peakDemandKW, null);
  assert.equal(result.rows[0].demandCharge, null);
});

test("usage mix includes all three categories and is weighted by energy", () => {
  assert.deepEqual(usageMix([sample]), {
    onPeakKWh: 10, offPeakKWh: 20, superOffPeakKWh: 30, totalKWh: 60,
    onPeakPercent: 16.67, offPeakPercent: 33.33, superOffPeakPercent: 50,
  });
  const mixed = usageMix([sample, { ...sample, onPeakKWh: 90, offPeakKWh: 0, superOffPeakKWh: 0 }]);
  assert.equal(mixed.onPeakPercent, 66.67);
  const rolling = analyzeAPSBills(history.bills).rolling.mix;
  assert.equal(rolling.superOffPeakKWh, 964);
  assert.equal(rolling.superOffPeakPercent, 2.95);
  assert.equal(usageMix([{ ...sample, superOffPeakKWh: undefined }]).superOffPeakPercent, 0);
  assert.equal(usageMix([{ ...sample, superOffPeakKWh: null }]).onPeakPercent, null);
  assert.equal(usageMix([{ ...sample, onPeakKWh: 0, offPeakKWh: 0, superOffPeakKWh: 0 }]).onPeakPercent, null);
});

test("increases reduce cumulative results and progress never overflows the meter", () => {
  const increased = analyzeAPSBills([{ ...sample, totalEnergyCost: 120 }]);
  assert.equal(increased.homeOps.cumulativeReduction, -20);
  assert.equal(increased.goal.percent, -4);
  assert.equal(increased.goal.progressPercent, 0);
  assert.equal(increased.goal.remaining, 520);
  const exceeded = analyzeAPSBills([{ ...sample, lastYearTotalCost: 700 }]);
  assert.equal(exceeded.goal.percent, 124);
  assert.equal(exceeded.goal.progressPercent, 100);
  assert.equal(exceeded.goal.remaining, 0);
});

test("annual goal excludes bill periods crossing the first anniversary", () => {
  const result = analyzeAPSBills([sample, { ...sample, billDate: "August 19, 2027", billingStart: "July 22, 2027", billingEnd: "August 19, 2027" }]);
  assert.equal(result.homeOps.cumulativeReduction, 40);
  assert.equal(result.goal.observedReduction, 20);
});

test("missing values and months remain unavailable rather than becoming zero or older months", () => {
  const result = analyzeAPSBills(history.bills.filter(b => b.billDate !== "December 19, 2025"));
  assert.equal(result.current.length, 11);
  assert.equal(result.rolling.currentCost, null);
  assert.equal(result.rolling.costDifference, null);
  const unknown = analyzeAPSBills([{ ...sample, lastYearTotalCost: null, lastYearUsageKWh: null }]);
  assert.equal(unknown.rows[0].priorCostSource, "unavailable");
  assert.equal(unknown.homeOps.cumulativeReduction, null);
  assert.equal(unknown.goal.percent, null);
  assert.equal(unknown.rows[0].kWhDifference, null);
  assert.equal(analyzeAPSBills([{ ...sample, lastYearTotalCost: 0 }]).rows[0].costDifferencePercent, null);
  assert.equal(analyzeAPSBills([]).rolling.currentCost, null);
});

test("duplicate months and invalid dates are rejected", () => {
  assert.throws(() => analyzeAPSBills([sample, sample]), /Multiple APS bills/);
  assert.throws(() => billDateISO("February 30, 2026"), /Invalid APS billing date/);
  assert.throws(() => billDateISO(null), /Invalid APS billing date/);
  assert.equal(billDateISO("July 29, 2026"), "2026-07-29");
});
