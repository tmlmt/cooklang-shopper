#!/usr/bin/env node
// Print the current one-time admin claim code, if any.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const file = path.resolve(process.cwd(), "data", "admin-claim-code.txt");

if (!existsSync(file)) {
  console.log(
    "No admin claim code is pending (an administrator may already exist).",
  );
  process.exit(0);
}

const code = readFileSync(file, "utf8").trim();
if (!code) {
  console.log("No admin claim code is pending.");
  process.exit(0);
}

console.log(`Admin claim code: ${code}`);
