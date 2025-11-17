#!/usr/bin/env node
/**
 * check-env-usage.mts
 *
 * Enforces:
 *  1. All env vars declared in src/config/env.ts MUST be used somewhere.
 *  2. No env var may appear in code unless declared in src/config/env.ts.
 *  3. All env vars must be UPPER_SNAKE_CASE.
 *
 * Fails CI on any violation.
 */

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------
// 1) Load env.ts and extract declared env keys
// ---------------------------------------------

const ENV_MODULE_PATH = path.join(process.cwd(), "src/config/env.ts");
const envSource = fs.readFileSync(ENV_MODULE_PATH, "utf8");

// Match keys inside z.object({ ... })
const declaredEnvVars = Array.from(envSource.matchAll(/([A-Z0-9_]+)\s*:/g)).map(
  (m) => m[1],
);

if (declaredEnvVars.length === 0) {
  console.error("ERROR: No env vars found in src/config/env.ts");
  process.exit(1);
}

// ---------------------------------------------
// 2) Recursively scan repo for env usage
// ---------------------------------------------

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(["node_modules", ".next", "public", "supabase", "scripts"]);

const filesToScan: string[] = [];

function walk(dir: string) {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);

    if (IGNORE_DIRS.has(file)) continue;

    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".mts")) {
      filesToScan.push(full);
    }
  }
}

walk(ROOT);

// ---------------------------------------------
// 3) Parse usage in repo
// ---------------------------------------------

const usedEnvVars = new Set<string>();
const illegalEnvVars = new Set<string>();

for (const file of filesToScan) {
  const code = fs.readFileSync(file, "utf8");

  // Detect process.env.XYZ
  const matches = Array.from(code.matchAll(/process\.env\.([A-Za-z0-9_]+)/g));

  for (const m of matches) {
    const key = m[1];

    // Track usage if declared
    if (declaredEnvVars.includes(key)) {
      usedEnvVars.add(key);
    } else {
      illegalEnvVars.add(key);
    }

    // Casing check
    if (!/^[A-Z0-9_]+$/.test(key)) {
      console.error(`Invalid casing for env var "${key}" in file ${file}`);
      process.exit(1);
    }
  }
}

// ---------------------------------------------
// 4) Detect unused declared variables
// ---------------------------------------------

const unusedEnvVars = declaredEnvVars.filter((k) => !usedEnvVars.has(k));

// ---------------------------------------------
// 5) Report
// ---------------------------------------------

let hasError = false;

if (illegalEnvVars.size > 0) {
  console.error("\nERROR: Env vars used in code but NOT declared in env.ts:");
  for (const key of illegalEnvVars) console.error(`   - ${key}`);
  hasError = true;
}

if (unusedEnvVars.length > 0) {
  console.error("\nERROR: Env vars declared in env.ts but NOT used anywhere:");
  for (const key of unusedEnvVars) console.error(`   - ${key}`);
  hasError = true;
}

if (hasError) {
  console.error("\ncheck-env-usage.mts FAILED\n");
  process.exit(1);
}

console.log("Env usage validated — all env vars used and declared correctly.");
