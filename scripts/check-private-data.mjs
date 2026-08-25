import { execFileSync } from "node:child_process";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

const trackedPrivateFiles = git(["ls-files", ".private"]);
const stagedFiles = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);
const suspiciousStagedFiles = stagedFiles.filter(
  (path) =>
    path.startsWith(".private/") ||
    /(?:finance-seed|budget\.import)\.json$/i.test(path) ||
    /(?:income|expense|savings)[-_ ]breakdown\.(?:xlsx?|csv)$/i.test(path),
);

const violations = [...new Set([...trackedPrivateFiles, ...suspiciousStagedFiles])];
if (violations.length > 0) {
  console.error("Private finance files must not be tracked or staged:");
  violations.forEach((path) => console.error(`  ${path}`));
  process.exit(1);
}

console.log("Private finance data guard passed.");
