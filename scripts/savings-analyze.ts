import fs from "fs";
import path from "path";

type APSBill = {
  billDate: string | null;
  billingStart: string | null;
  billingEnd: string | null;
  totalEnergyCost: number | null;
  lastYearTotalCost: number | null;
  averageTemperature: number | null;
  daysInBillingPeriod: number | null;
};

type APSAdjustment = {
  id: string;
  date: string;
  type: "credit" | "charge";
  category: string;
  amount: number;
  status: "approved" | "posted";
  relatedBillingEnd: string | null;
  description: string;
  source: string;
};

type BillHistory = {
  bills: APSBill[];
};

type AdjustmentHistory = {
  adjustments: APSAdjustment[];
};

type SavingsSnapshot = {
  generatedAt: string;

  billingPeriod: {
    start: string | null;
    end: string | null;
  };

  comparison: {
    lastYearCost: number;
    currentCost: number;
    observedReduction: number;
    reductionPercent: number;
  };

  adjustments: {
    postedCredits: number;
  };

  documentedFinancialBenefit: number;

  attribution: {
    status: "observed";
    note: string;
  };
};

function dollars(value: number): string {
  return `$${value.toFixed(2)}`;
}

function roundMoney(value: number): number {
  return Math.round(
    (value + Number.EPSILON) * 100
  ) / 100;
}

function main() {
  const historyDir = path.join(
    process.cwd(),
    "data/history/aps"
  );

  const billsFile = path.join(
    historyDir,
    "bills.json"
  );

  const adjustmentsFile = path.join(
    historyDir,
    "adjustments.json"
  );

  const outputDir = path.join(
    process.cwd(),
    "data/ops"
  );

  const outputFile = path.join(
    outputDir,
    "savings.json"
  );

  if (!fs.existsSync(billsFile)) {
    console.log(
      "No APS bill history found."
    );
    return;
  }

  const billHistory: BillHistory =
    JSON.parse(
      fs.readFileSync(
        billsFile,
        "utf8"
      )
    );

  let adjustmentHistory: AdjustmentHistory = {
    adjustments: [],
  };

  if (
    fs.existsSync(
      adjustmentsFile
    )
  ) {
    adjustmentHistory =
      JSON.parse(
        fs.readFileSync(
          adjustmentsFile,
          "utf8"
        )
      );
  }

  const latestBill =
    billHistory.bills[
      billHistory.bills.length - 1
    ];

  if (!latestBill) {
    console.log(
      "No APS bills found."
    );
    return;
  }

  const currentCost =
    latestBill.totalEnergyCost ?? 0;

  const lastYearCost =
    latestBill.lastYearTotalCost ?? 0;

  const observedReduction =
    lastYearCost > 0
      ? roundMoney(
          lastYearCost -
            currentCost
        )
      : 0;

  const postedCredits =
    roundMoney(
      adjustmentHistory.adjustments
        .filter(
          (adjustment) =>
            adjustment.status ===
              "posted" &&
            adjustment.type ===
              "credit" &&
            adjustment.relatedBillingEnd ===
              latestBill.billingEnd
        )
        .reduce(
          (total, adjustment) =>
            total +
            adjustment.amount,
          0
        )
    );

  const documentedBenefit =
    roundMoney(
      observedReduction +
        postedCredits
    );

  const reductionPercent =
    lastYearCost > 0
      ? (observedReduction /
          lastYearCost) *
        100
      : 0;

  // ------------------------------------------------------
  // Create machine-readable savings snapshot
  // ------------------------------------------------------

  const snapshot: SavingsSnapshot = {
    generatedAt:
      new Date().toISOString(),

    billingPeriod: {
      start:
        latestBill.billingStart,
      end:
        latestBill.billingEnd,
    },

    comparison: {
      lastYearCost:
        roundMoney(
          lastYearCost
        ),

      currentCost:
        roundMoney(
          currentCost
        ),

      observedReduction:
        roundMoney(
          observedReduction
        ),

      reductionPercent:
        Number(
          reductionPercent.toFixed(
            1
          )
        ),
    },

    adjustments: {
      postedCredits:
        roundMoney(
          postedCredits
        ),
    },

    documentedFinancialBenefit:
      documentedBenefit,

    attribution: {
      status: "observed",
      note:
        "Bill reduction is an observed year-over-year difference and is not assumed to be entirely caused by Home Ops countermeasures.",
    },
  };

  fs.mkdirSync(
    outputDir,
    {
      recursive: true,
    }
  );

  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      snapshot,
      null,
      2
    ) + "\n"
  );

  // ------------------------------------------------------
  // Console report
  // ------------------------------------------------------

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "       HOME OPS SAVINGS ANALYSIS"
  );
  console.log(
    "========================================"
  );
  console.log("");

  console.log(
    `Billing period       : ${latestBill.billingStart} - ${latestBill.billingEnd}`
  );

  console.log("");
  console.log(
    "BILL COMPARISON"
  );
  console.log(
    "----------------------------------------"
  );

  console.log(
    `Same period last year: ${dollars(
      lastYearCost
    )}`
  );

  console.log(
    `Current bill         : ${dollars(
      currentCost
    )}`
  );

  console.log(
    `Observed reduction   : ${dollars(
      observedReduction
    )}`
  );

  console.log(
    `Reduction            : ${reductionPercent.toFixed(
      1
    )}%`
  );

  console.log("");
  console.log(
    "APS ADJUSTMENTS"
  );
  console.log(
    "----------------------------------------"
  );

  console.log(
    `Posted credits       : ${dollars(
      postedCredits
    )}`
  );

  console.log("");
  console.log(
    "DOCUMENTED FINANCIAL BENEFIT"
  );
  console.log(
    "----------------------------------------"
  );

  console.log(
    `Bill reduction       : ${dollars(
      observedReduction
    )}`
  );

  console.log(
    `Posted APS credits   : ${dollars(
      postedCredits
    )}`
  );

  console.log(
    `TOTAL                : ${dollars(
      documentedBenefit
    )}`
  );

  console.log("");
  console.log(
    "Note: Bill reduction is an observed year-over-year"
  );
  console.log(
    "difference and is not assumed to be entirely caused"
  );
  console.log(
    "by Home Ops countermeasures."
  );

  console.log("");
  console.log(
    `Savings snapshot written: ${outputFile}`
  );

  console.log("");
  console.log(
    "========================================"
  );
}

main();