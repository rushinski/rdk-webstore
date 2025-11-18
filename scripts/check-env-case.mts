import fs from "node:fs";
import path from "node:path";

// Starting from project root we create a absolute path to src/config/env.ts that works across all OS's and CI runners
const ENV_MODULE_PATH = path.join(process.cwd(), "src/config/env.ts");
// Gets the plain text contents of env.ts
const envSource = fs.readFileSync(ENV_MODULE_PATH, "utf8");
// Extracts the environment variables from the plain text with regex
const declaredEnvVars = Array.from(envSource.matchAll(/([A-Z0-9_]+)\s*:/g)).map(
  (m) => m[1],
);

// Gets the absolute path of the directory where the script is executed (Gets the root)
const ROOT = process.cwd();
// The list of folders for the scanner to skip
const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  "public",
  "supabase",
  "scripts",
  "docs",
  ".vscode",
]);

// Empty array that will contain the file paths to scan
const filesToScan: string[] = [];

// Recursive function: Recursion returns where it left off. Ex. ["api", "page.tsx"] -> api validated -> back to where we left -> page.tsx
function walk(dir: string): void {
  // Lists all items inside folder. If dir is rdk/infra -> entries = ["docker", "Caddyfile"]
  const entries = fs.readdirSync(dir);

  // Loops through each element of the entries array
  for (const entry of entries) {
    // Joins the directory and directory path
    const full = path.join(dir, entry);

    // If entry is in IGNORE_DIRS we go to the next element in the array
    if (IGNORE_DIRS.has(entry)) continue;

    // Stores the stats of full as a object. Ex. "isFile: [Function], isDirectory: [Function], ...""
    const stat = fs.statSync(full);

    // If stat.Directory returns true the path is a folder
    if (stat.isDirectory()) {
      // We then call the function again with full as our dir this time
      walk(full);
      // If full ends with one of these extentions...
    } else if (full.endsWith(".ts") || full.endsWith(".tsx") || full.endsWith(".mts")) {
      // We push full (the file path) to filesToScan
      filesToScan.push(full);
    }
  }
}
// Calls the walk function
walk(ROOT);

// Validator var. If we find a error this will become true
let hasError = false;
// Set to store any env vars we have that arent declared in env.ts. It is a set so we don't have duplicates
const illegalEnvVars = new Set();

// Loops through all elements in the filesToScan array
for (const file of filesToScan) {
  // Gets the plain text contents of file
  const code = fs.readFileSync(file, "utf8");

  // Matches is a array that contains all occurances of process.env. and uses a regex to see what follows it. /g returns all matches
  const matches = Array.from(code.matchAll(/process\.env\.([A-Za-z0-9_]+)/g));
  // We loop through the elements of matches
  for (const m of matches) {
    // m looks like "process.env.STRIPE_SECRET_KEY", "STRIPE_SECRET_KEY", index: 35, input: "...entire file...". We get the 1 index
    const key = m[1];

    // Check for env var is not proper
    if (!/^[A-Z0-9_]+$/.test(key)) {
      console.error(`Invalid casing for env var "${key}" in ${file}`);
      hasError = true;
    }

    // Check if env var is not in env.ts meaning it would be illegal
    if (!declaredEnvVars.includes(key)) {
      illegalEnvVars.add(key);
      hasError = true;
    }
  }
}

// If illegalEnvVars contains anything our check fails and we output the failures
if (illegalEnvVars.size > 0) {
  console.error("\nERROR: Env vars found in code but NOT declared in env.ts:");
  for (const key of illegalEnvVars) console.error(`  - ${key}`);
}

// If hasError is true we fail
if (hasError) {
  console.error("\ncheck-env-naming FAILED\n");
  process.exit(1);
}

// If there is no errors this will print
console.log("Env naming validated — casing/declaration OK.");
