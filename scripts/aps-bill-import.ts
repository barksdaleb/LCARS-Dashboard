import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";

// ======================================================
// APS Bill Types
// ======================================================

type APSBill = {
  billDate: string | null;
  billingStart: string | null;
  billingEnd: string | null;
  servicePlan: string | null;

  usageKWh: number | null;
  onPeakKWh: number | null;
  offPeakKWh: number | null;

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

type APSBillHistory = {
  bills: APSBill[];
};

// ======================================================
// Helpers
// ======================================================

function money(value: string): number {
  return Number(value.replace(/[$,]/g, ""));
}

function number(value: string): number {
  return Number(value.replace(/,/g, ""));
}

// ======================================================
// Main
// ======================================================

async function main() {
  const importDir = path.join(
    process.cwd(),
    "data/import/aps"
  );

  const archiveDir = path.join(
    importDir,
    "archive/bills"
  );

  const historyDir = path.join(
    process.cwd(),
    "data/history/aps"
  );

  const historyFile = path.join(
    historyDir,
    "bills.json"
  );

  fs.mkdirSync(archiveDir, {
    recursive: true,
  });

  fs.mkdirSync(historyDir, {
    recursive: true,
  });

  // ------------------------------------------------------
  // Load existing bill history
  // ------------------------------------------------------

  let history: APSBillHistory = {
    bills: [],
  };

  if (fs.existsSync(historyFile)) {
    history = JSON.parse(
      fs.readFileSync(historyFile, "utf8")
    );
  }

  // ------------------------------------------------------
  // Find APS bill PDFs
  // ------------------------------------------------------

  const files = fs
    .readdirSync(importDir)
    .filter((file) =>
      file.toLowerCase().endsWith(".pdf")
    );

  if (!files.length) {
    console.log("No APS bill PDF files found.");
    return;
  }

  console.log("");
  console.log("========================================");
  console.log("       APS BILL IMPORTER");
  console.log("========================================");
  console.log("");

  // ------------------------------------------------------
  // Process each PDF
  // ------------------------------------------------------

  for (const file of files) {
    const filename = path.join(
      importDir,
      file
    );

    console.log(`Processing: ${file}`);

    const buffer =
      fs.readFileSync(filename);

    const parser = new PDFParse({
      data: buffer,
    });

    const result =
      await parser.getText();

    const text = result.text;

    await parser.destroy();

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
        /Monthly Usage \(kWh\)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/
      );

    if (usageMatch) {
      bill.lastYearUsageKWh =
        number(usageMatch[2]);

      bill.usageKWh =
        number(usageMatch[3]);
    }

    // ----------------------------------------------------
    // On-peak usage
    // ----------------------------------------------------

    const onPeakMatch =
      text.match(
        /On-Peak\s+[\d,]+\s+[\d,]+\s+([\d,]+)\s+kWh/
      );

    if (onPeakMatch) {
      bill.onPeakKWh =
        number(onPeakMatch[1]);
    }

    // ----------------------------------------------------
    // Off-peak usage
    // ----------------------------------------------------

    const offPeakMatch =
      text.match(
        /Off-Peak\s+[—-]+\s+[—-]+\s+([\d,]+)\s+kWh/
      );

    if (offPeakMatch) {
      bill.offPeakKWh =
        number(offPeakMatch[1]);
    }

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

    // ----------------------------------------------------
    // Display parsed bill
    // ----------------------------------------------------

    console.log("");
    console.log(bill);
    console.log("");

    // ----------------------------------------------------
    // Add/update bill history
    //
    // Billing period is our unique identity.
    // Re-importing the same bill does NOT duplicate it.
    // ----------------------------------------------------

    const existingIndex =
      history.bills.findIndex(
        (existing) =>
          existing.billingStart ===
            bill.billingStart &&
          existing.billingEnd ===
            bill.billingEnd
      );

    if (existingIndex >= 0) {
      history.bills[existingIndex] =
        bill;

      console.log(
        "✓ Existing bill updated in history."
      );
    } else {
      history.bills.push(bill);

      console.log(
        "✓ New bill added to history."
      );
    }

    // ----------------------------------------------------
    // Archive processed PDF
    // ----------------------------------------------------

    const archivePath =
      path.join(
        archiveDir,
        file
      );

    let finalArchivePath =
      archivePath;

    // Protect against overwriting an existing archived PDF.
    if (
      fs.existsSync(
        finalArchivePath
      )
    ) {
      const extension =
        path.extname(file);

      const baseName =
        path.basename(
          file,
          extension
        );

      const timestamp =
        new Date()
          .toISOString()
          .replace(/[:.]/g, "-");

      finalArchivePath =
        path.join(
          archiveDir,
          `${baseName}-${timestamp}${extension}`
        );
    }

    fs.renameSync(
      filename,
      finalArchivePath
    );

    console.log(
      `✓ Archived: ${path.basename(
        finalArchivePath
      )}`
    );

    console.log("");
  }

  // ------------------------------------------------------
  // Sort bill history
  // ------------------------------------------------------

  history.bills.sort(
    (a, b) =>
      (a.billingEnd ?? "").localeCompare(
        b.billingEnd ?? ""
      )
  );

  // ------------------------------------------------------
  // Write bill history
  // ------------------------------------------------------

  fs.writeFileSync(
    historyFile,
    JSON.stringify(
      history,
      null,
      2
    ) + "\n"
  );

  console.log(
    `Bill history written: ${historyFile}`
  );

  console.log(
    `Bills in history: ${history.bills.length}`
  );

  console.log("");
  console.log("========================================");
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});