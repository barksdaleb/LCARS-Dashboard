import path from "path";

import { RuntimeAnalyzer } from "../app/lib/ecobee/RuntimeAnalyzer";

const HISTORY_FILE = path.join(
  process.cwd(),
  "data/history/ecobee/hall-ac.csv"
);

const analyzer = new RuntimeAnalyzer(HISTORY_FILE);

const result = analyzer.analyze();

console.log("");
console.log("=================================");
console.log("       HALL AC ANALYSIS");
console.log("=================================");
console.log("");

console.log(`Days Imported           : ${result.days}`);
console.log(`Records                 : ${result.totalRecords}`);

console.log("");

console.log(
  `Total Cooling Runtime   : ${result.totalRuntimeHours.toFixed(2)} hrs`
);

console.log(
  `Average Runtime / Day   : ${result.averageRuntimePerDay.toFixed(2)} hrs`
);

console.log(
  `Runtime 4PM–7PM         : ${result.peakRuntimeHours.toFixed(2)} hrs`
);

console.log("");