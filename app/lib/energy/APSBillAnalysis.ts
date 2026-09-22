export const HOME_OPS_START = "2026-07-29";
export const ANNUAL_GOAL = 500;

export type BillInput = {
  billDate: string | null;
  billingStart: string | null;
  billingEnd: string | null;
  totalEnergyCost: number | null;
  lastYearTotalCost: number | null;
  usageKWh: number | null;
  lastYearUsageKWh: number | null;
  onPeakKWh: number | null;
  offPeakKWh: number | null;
  superOffPeakKWh?: number | null;
  peakDemandKW: number | null;
  demandCharge: number | null;
};
export type BillPhase = "pre" | "transition" | "post";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Parse calendar dates in UTC so classification cannot shift with browser timezone.
export function billDateISO(value: string | null): string {
  const iso = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const named = value?.match(/^([A-Za-z]+) (\d{1,2}), (\d{4})$/);
  const year = Number(iso?.[1] ?? named?.[3]);
  const month = iso ? Number(iso[2]) - 1 : months.indexOf(named?.[1] ?? "");
  const day = Number(iso?.[3] ?? named?.[2]);
  const date = new Date(Date.UTC(year, month, day));
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    throw new Error(`Invalid APS billing date: ${value}`);
  }
  return date.toISOString().slice(0, 10);
}

export function classifyBill(start: string, end: string): BillPhase {
  // Meter intervals are [start, end); adjacent bills share their boundary date.
  if (end <= HOME_OPS_START) return "pre";
  if (start >= HOME_OPS_START) return "post";
  return "transition";
}

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const known = (value: number | null | undefined): value is number => typeof value === "number" && Number.isFinite(value);
const cents = (value: number) => Math.round(value * 100);
const difference = (current: number | null, prior: number | null) =>
  known(current) && known(prior) ? (cents(current) - cents(prior)) / 100 : null;
const percent = (change: number | null, baseline: number | null) =>
  known(change) && known(baseline) && baseline > 0 ? round(change / baseline * 100) : null;
const sum = (values: (number | null)[]): number | null =>
  values.every(known) ? values.reduce((total, value) => total + cents(value), 0) / 100 : null;

export function usageMix(bills: readonly BillInput[]) {
  const onPeakKWh = sum(bills.map(b => b.onPeakKWh));
  const offPeakKWh = sum(bills.map(b => b.offPeakKWh));
  // Legacy omission means zero; an explicit null is still unknown.
  const superOffPeakKWh = sum(bills.map(b => b.superOffPeakKWh === undefined ? 0 : b.superOffPeakKWh));
  const totalKWh = sum([onPeakKWh, offPeakKWh, superOffPeakKWh]);
  return {
    onPeakKWh, offPeakKWh, superOffPeakKWh, totalKWh,
    onPeakPercent: percent(onPeakKWh, totalKWh),
    offPeakPercent: percent(offPeakKWh, totalKWh),
    superOffPeakPercent: percent(superOffPeakKWh, totalKWh),
  };
}

function monthNumber(iso: string) {
  return Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
}
function monthLabel(value: number) {
  return `${Math.floor(value / 12)}-${String(value % 12 + 1).padStart(2, "0")}`;
}

export function analyzeAPSBills(input: readonly BillInput[]) {
  const bills = input.map(bill => {
    const start = billDateISO(bill.billingStart);
    const end = billDateISO(bill.billingEnd);
    if (start >= end) throw new Error(`Invalid APS billing interval: ${start} to ${end}`);
    return { ...bill, start, end, issued: billDateISO(bill.billDate ?? bill.billingEnd), month: monthNumber(end) };
  }).sort((a, b) => a.end.localeCompare(b.end));
  const byMonth = new Map(bills.map(bill => [bill.month, bill]));
  // Never silently count duplicates or guess between multiple bills in a month.
  if (byMonth.size !== bills.length) throw new Error("Multiple APS bills in one billing-end month require review.");

  const rows = bills.map(bill => {
    const prior = byMonth.get(bill.month - 12);
    const priorCost = prior?.totalEnergyCost ?? bill.lastYearTotalCost;
    const priorKWh = prior?.usageKWh ?? bill.lastYearUsageKWh;
    const costDifference = difference(bill.totalEnergyCost, priorCost);
    const kWhDifference = difference(bill.usageKWh, priorKWh);
    return {
      ...bill,
      phase: classifyBill(bill.start, bill.end),
      priorCost,
      priorKWh,
      priorCostSource: known(prior?.totalEnergyCost) ? "archived bill" : known(priorCost) ? "bill-reported prior year" : "unavailable",
      costDifference,
      costDifferencePercent: percent(costDifference, priorCost),
      kWhDifference,
      kWhDifferencePercent: percent(kWhDifference, priorKWh),
      observedReduction: costDifference === null ? null : -costDifference,
      mix: usageMix([bill]),
    };
  });
  const latestMonth = bills.at(-1)?.month;
  const current = latestMonth === undefined ? [] : rows.filter(b => b.month >= latestMonth - 11);
  const prior = latestMonth === undefined ? [] : rows.filter(b => b.month >= latestMonth - 23 && b.month <= latestMonth - 12);
  // Missing months must not be hidden by pulling older bills into the window.
  const currentCost = current.length === 12 ? sum(current.map(b => b.totalEnergyCost)) : null;
  const priorCost = current.length === 12 ? sum(current.map(b => b.priorCost)) : null;
  const costDifference = difference(currentCost, priorCost);
  const currentKWh = current.length === 12 ? sum(current.map(b => b.usageKWh)) : null;
  const priorKWh = current.length === 12 ? sum(current.map(b => b.priorKWh)) : null;
  const post = rows.filter(b => b.phase === "post");
  const transition = rows.filter(b => b.phase === "transition");
  const cumulativeReduction = sum(post.map(b => b.observedReduction));
  const transitionReduction = sum(transition.map(b => b.observedReduction));
  // The first annual goal is measured from launch to its first anniversary.
  // Only whole bill periods inside that window count; never prorate actual bills.
  const goalEnd = "2027-07-29";
  const goalBills = post.filter(b => b.end <= goalEnd);
  const goalReduction = sum(goalBills.map(b => b.observedReduction));
  const goalPercent = percent(goalReduction, ANNUAL_GOAL);
  return {
    startDate: HOME_OPS_START,
    through: bills.at(-1)?.end ?? null,
    rows,
    current,
    rolling: {
      startMonth: latestMonth === undefined ? null : monthLabel(latestMonth - 11),
      endMonth: latestMonth === undefined ? null : monthLabel(latestMonth),
      priorStartMonth: latestMonth === undefined ? null : monthLabel(latestMonth - 23),
      priorEndMonth: latestMonth === undefined ? null : monthLabel(latestMonth - 12),
      billCount: current.length,
      archivedPriorCount: prior.length,
      currentCost, priorCost, costDifference,
      costDifferencePercent: percent(costDifference, priorCost),
      currentKWh, priorKWh,
      kWhDifference: difference(currentKWh, priorKWh),
      mix: usageMix(current),
      priorMix: usageMix(prior),
    },
    allHistoryMix: usageMix(bills),
    homeOps: {
      preCount: rows.filter(b => b.phase === "pre").length,
      transitionCount: transition.length,
      postCount: post.length,
      cumulativeReduction,
      transitionReduction,
      includingTransitionReduction: sum([cumulativeReduction, transitionReduction]),
    },
    goal: {
      amount: ANNUAL_GOAL,
      start: HOME_OPS_START,
      end: goalEnd,
      billCount: goalBills.length,
      observedReduction: goalReduction,
      percent: goalPercent,
      progressPercent: goalPercent === null ? 0 : Math.max(0, Math.min(100, goalPercent)),
      remaining: goalReduction === null ? null : Math.max(0, difference(ANNUAL_GOAL, goalReduction)!),
    },
  };
}

export type APSBillAnalysis = ReturnType<typeof analyzeAPSBills>;
