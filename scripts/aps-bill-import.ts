import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";

import { parseAPSBill, normalizeBill, reconcileBill, type APSBillHistory } from "./lib/aps-bill";

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

  history.bills = history.bills.map(normalizeBill);

  // ------------------------------------------------------
  // Find APS bill PDFs
  // ------------------------------------------------------

  const reprocessArchive = process.argv.includes("--reprocess-archive");
  const sourceDir = reprocessArchive ? archiveDir : importDir;
  const files = fs
    .readdirSync(sourceDir)
    .filter((file) =>
      file.toLowerCase().endsWith(".pdf")
    ).sort();

  if (!files.length) {
    console.log("No APS bill PDF files found.");
  }

  console.log("");
  console.log("========================================");
  console.log("       APS BILL IMPORTER");
  console.log("========================================");
  console.log("");

  // ------------------------------------------------------
  // Process each PDF
  // ------------------------------------------------------

  const processed = new Map<string, string>();
  for (const file of files) {
    const filename = path.join(
      sourceDir,
      file
    );

    console.log(`Processing: ${file}`);

    const buffer =
      fs.readFileSync(filename);

    const parser = new PDFParse({
      data: buffer,
    });

    let text: string;
    try {
      text = (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }

    const bill = parseAPSBill(text);
    if (!bill.billDate || !bill.billingStart || !bill.billingEnd) {
      throw new Error(`Missing bill identity in ${file}; history not written.`);
    }
    const key = `${bill.billingStart}|${bill.billingEnd}`;
    const previous = processed.get(key);
    if (previous) {
      if (previous !== JSON.stringify(bill)) {
        throw new Error(`Conflicting archived bills for ${key}; history not written.`);
      }
      console.log(`Duplicate billing period skipped: ${bill.billDate}`);
      if (reprocessArchive) continue;
    }
    processed.set(key, JSON.stringify(bill));
    const reconciliation = reconcileBill(bill, text);
    const message = `${bill.billDate}: onPeakKWh=${bill.onPeakKWh}, offPeakKWh=${bill.offPeakKWh}, superOffPeakKWh=${bill.superOffPeakKWh}, usageKWh=${bill.usageKWh}, difference=${reconciliation.difference ?? "unknown"} kWh (tolerance=${reconciliation.tolerance} kWh)`;
    if (!reconciliation.reconciled) {
      console.warn(`WARNING: APS usage does not reconcile: ${message}`);
    } else {
      console.log(`Reconciled: ${message}`);
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
        { ...history.bills[existingIndex], ...bill };

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

    if (reprocessArchive) continue;

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

  const temporaryHistoryFile = `${historyFile}.tmp`;
  fs.writeFileSync(
    temporaryHistoryFile,
    JSON.stringify(
      history,
      null,
      2
    ) + "\n"
  );

  fs.renameSync(temporaryHistoryFile, historyFile);

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