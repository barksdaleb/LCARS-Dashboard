export type APSBill = {
  billDate: string | null;
  billingStart: string | null;
  billingEnd: string | null;
  servicePlan: string | null;

  usageKWh: number | null;
  onPeakKWh: number | null;
  offPeakKWh: number | null;
  superOffPeakKWh: number | null;

  peakDemandKW: number | null;
  demandCharge: number | null;

  peakDemandDate: string | null;
  peakDemandWindow: string | null;

  energyUsageCost: number | null;
  totalEnergyCost: number | null;

  lastYearUsageKWh: number | null;
  lastYearTotalCost: number | null;

  averageTemperature: number | null;
  daysInBillingPeriod: number | null;
};

export type APSBillHistory = {
  bills: APSBill[];
};

function money(value: string): number {
  return Number(value.replace(/[$,]/g, ""));
}

function number(value: string): number {
  return Number(value.replace(/,/g, ""));
}

export function parseAPSBill(text: string): APSBill {
  // ----------------------------------------------------
  // Empty bill record
  // ----------------------------------------------------

  const bill: APSBill = {
    billDate: null,
    billingStart: null,
    billingEnd: null,
    servicePlan: null,

    usageKWh: null,
    onPeakKWh: null,
    offPeakKWh: null,
    superOffPeakKWh: 0,

    peakDemandKW: null,
    demandCharge: null,

    peakDemandDate: null,
    peakDemandWindow: null,

    energyUsageCost: null,
    totalEnergyCost: null,

    lastYearUsageKWh: null,
    lastYearTotalCost: null,

    averageTemperature: null,
    daysInBillingPeriod: null,
  };

  // ----------------------------------------------------
  // Bill date
  // ----------------------------------------------------

  const billDateMatch =
    text.match(
      /Bill Date:\s+([A-Za-z]+ \d{1,2}, \d{4})/
    );

  if (billDateMatch) {
    bill.billDate =
      billDateMatch[1];
  }

  // ----------------------------------------------------
  // Billing period
  // ----------------------------------------------------

  const billingPeriodMatch =
    text.match(
      /Billing Period:\s+([A-Za-z]+ \d{1,2}, \d{4}) to ([A-Za-z]+ \d{1,2}, \d{4})/
    );

  if (billingPeriodMatch) {
    bill.billingStart =
      billingPeriodMatch[1];

    bill.billingEnd =
      billingPeriodMatch[2];
  }

  // ----------------------------------------------------
  // Service plan
  // ----------------------------------------------------

  const servicePlanMatch =
    text.match(
      /Service Plan:\s+([^\n]+)/
    );

  if (servicePlanMatch) {
    bill.servicePlan =
      servicePlanMatch[1].trim();
  }

  // ----------------------------------------------------
  // Monthly usage comparison
  //
  // APS order:
  // Last Month / Last Year / This Month
  // ----------------------------------------------------

  const usageMatch =
    text.match(
      /Monthly Usage \(kWh\)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)/
    );

  if (usageMatch) {
    bill.lastYearUsageKWh =
      number(usageMatch[2]);

    bill.usageKWh =
      number(usageMatch[3]);
  }

  Object.assign(bill, parseUsageCategories(text));

  // ----------------------------------------------------
  // Peak demand
  // ----------------------------------------------------

  const demandMatch =
    text.match(
      /On-Peak Demand\s+[—-]+\s+[—-]+\s+([\d.]+)\s+kW/
    );

  if (demandMatch) {
    bill.peakDemandKW =
      number(demandMatch[1]);
  }

  // ----------------------------------------------------
  // Demand charge
  // ----------------------------------------------------

  const demandChargeMatch =
    text.match(
      /On-Peak Demand \$([\d,.]+)/
    );

  if (demandChargeMatch) {
    bill.demandCharge =
      money(demandChargeMatch[1]);
  }

  // ----------------------------------------------------
  // Demand-setting date and hour
  // ----------------------------------------------------

  const peakPeriodMatch =
    text.match(
      /On-Peak Demand ([A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?) ([^\n]+)/
    );

  if (peakPeriodMatch) {
    bill.peakDemandDate =
      peakPeriodMatch[1];

    bill.peakDemandWindow =
      peakPeriodMatch[2].trim();
  }

  // ----------------------------------------------------
  // Energy usage cost
  // ----------------------------------------------------

  const energyCostMatch =
    text.match(
      /energy usage costs this month are \$([\d,.]+)/
    );

  if (energyCostMatch) {
    bill.energyUsageCost =
      money(energyCostMatch[1]);
  }

  // ----------------------------------------------------
  // Total cost comparison
  //
  // APS order:
  // Last Month / Last Year / This Month
  // ----------------------------------------------------

  const totalCostMatch =
    text.match(
      /Total Cost\s+\$([\d,.]+)\s+\$([\d,.]+)\s+\$([\d,.]+)/
    );

  if (totalCostMatch) {
    bill.lastYearTotalCost =
      money(totalCostMatch[2]);

    bill.totalEnergyCost =
      money(totalCostMatch[3]);
  }

  // ----------------------------------------------------
  // Average temperature
  // ----------------------------------------------------

  const tempMatch =
    text.match(
      /Average Temperature\s+(\d+)°F\s+(\d+)°F\s+(\d+)°F/
    );

  if (tempMatch) {
    bill.averageTemperature =
      number(tempMatch[3]);
  }

  // ----------------------------------------------------
  // Billing-period days
  // ----------------------------------------------------

  const daysMatch =
    text.match(
      /Days in Billing Period\s+(\d+)\s+(\d+)\s+(\d+)/
    );

  if (daysMatch) {
    bill.daysInBillingPeriod =
      number(daysMatch[3]);
  }

  return bill;
}

// Anchor to the meter row so Off-Peak cannot match inside Super Off-Peak.
function usageToken(text: string, category: string): string | undefined {
  const cell = String.raw`(?:[\d,]+(?:\.\d+)?|[—–-]+)`;
  return text.match(new RegExp(
    String.raw`^\s*${category}\s+${cell}\s+${cell}\s+([\d,]+(?:\.\d+)?)\s+kWh\b`,
    "mi",
  ))?.[1];
}

export function parseUsageCategories(text: string) {
  const read = (category: string) => {
    const token = usageToken(text, category);
    return token === undefined ? null : number(token);
  };
  const superOffPeakKWh = read("Super Off-Peak");
  // A missing category is zero; a present but unreadable meter row is unknown.
  const hasSuperRow = /^\s*Super Off-Peak\s+(?:[\d—–-]|[^\n]*\bkWh\b)/mi.test(text);
  return {
    onPeakKWh: read("On-Peak"),
    offPeakKWh: read("Off-Peak"),
    superOffPeakKWh: superOffPeakKWh ?? (hasSuperRow ? null : 0),
  };
}

export function normalizeBill(
  bill: Omit<APSBill, "superOffPeakKWh"> & { superOffPeakKWh?: number | null },
): APSBill {
  // Only legacy absence defaults to zero. Preserve explicit parse failures.
  return { ...bill, superOffPeakKWh: bill.superOffPeakKWh === undefined ? 0 : bill.superOffPeakKWh };
}

export function reconcileBill(bill: APSBill, text: string) {
  const values = [bill.onPeakKWh, bill.offPeakKWh, bill.superOffPeakKWh, bill.usageKWh];
  const totalToken = text.match(/Monthly Usage \(kWh\)\s+[\d,.]+\s+[\d,.]+\s+([\d,.]+)/)?.[1];
  const tokens = ["On-Peak", "Off-Peak", "Super Off-Peak"].map(c => usageToken(text, c));
  tokens.push(totalToken);
  // Each displayed value can round by half its last printed unit. An absent
  // category is exactly zero and contributes no rounding allowance.
  const tolerance = tokens.reduce((sum, token) => {
    if (token === undefined) return sum;
    const decimals = token.split(".")[1]?.length ?? 0;
    return sum + 0.5 * 10 ** -decimals;
  }, 0);
  if (values.some(v => v === null || !Number.isFinite(v) || v < 0)) {
    return { difference: null, tolerance, reconciled: false };
  }
  const difference = Number((bill.onPeakKWh! + bill.offPeakKWh! + bill.superOffPeakKWh! - bill.usageKWh!).toFixed(10));
  return { difference, tolerance, reconciled: Math.abs(difference) <= tolerance + 1e-9 };
}
