import fs from "fs";
import path from "path";

export class HistoryWriter {
  static append(
    source: string,
    stream: string,
    record: Record<string, any>
  ) {
    
    const headers = Object.keys(record);
const values = Object.values(record);

console.log(headers);
console.log(values);
    
    const filePath = path.join(
      process.cwd(),
      "data",
      "history",
      source,
      `${stream}.csv`
    );

    fs.mkdirSync(path.dirname(filePath), {
      recursive: true,
    });

   const csvLine = values.join(",");

   if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, headers.join(",") + "\n");
}

fs.appendFileSync(filePath, csvLine + "\n");
  }
}
