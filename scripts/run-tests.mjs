import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function testFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) return testFiles(filename);
    return /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(entry.name) ? [filename] : [];
  });
}
const files = ["app", "components", "scripts"].flatMap(testFiles).sort();
if (!files.length) throw new Error("No automated tests found");
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...files], { stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status === 0 ? 0 : 1;
