import fs from "node:fs";
import path from "node:path";

// Whitelisted files
const allowedExactNames = [
  /^Dockerfile$/,
  /^Caddyfile$/,
  /^LICENSE$/,
  /^LICENSE\.txt$/,
  /^database\.types\.ts$/,
  /^jest\.config\.ts$/,
  /^next-env\.d\.ts$/,
  /^playwright\.config\.ts$/,
  /^\.env\.example$/,
  /^\.env\.local$/,
  /^\.gitignore$/,
  /^\.prettierrc$/,
  /^eslint\.config\.mjs$/,
  /^compose\.yml$/,
  /^next\.config\.js$/,
  /^postcss\.config\.js$/,
  /^global\.css$/,
  /^tailwind\.config\.js$/,
];

// Whitelisted directories
const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  "public",
  "scripts",
  "docs",
  ".vscode",
  "supabase",
  "tests",
  ".git",
  ".github",
]);

const allowedExtensions = /\.(md|ps1|json)$/i; // Allow .md , .ps1 , and .json
const tsPatternLowercase = /^[a-z0-9\-]+\.ts$/; // TS logic files: lowercase-with-dashes
const tsxPatternPascal = /^[A-Z][A-Za-z0-9]+\.tsx$/; // TSX outside app: PascalCase ONLY
const appRoutePattern = /^[a-z0-9\-]+\.tsx$/; // TSX inside app: lowercase-with-dashes ONLY

// FILE COLLECTION (recursive filesystem walk)
const ROOT = process.cwd();
const allFiles: string[] = [];

// Recursively collects all files from ROOT,
// respecting the IGNORE_DIRS list.
function walk(dir: string): void {
  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      const folderName = path.basename(full);

      // Skip ignored directories
      if (IGNORE_DIRS.has(folderName)) continue;

      walk(full);
    } else {
      allFiles.push(full);
    }
  }
}

walk(ROOT);

// VALIDATION LOGIC
const invalid: string[] = [];

for (const fullPath of allFiles) {
  const file = path.basename(fullPath);
  const dir = path.dirname(fullPath);

  const isTs = file.endsWith(".ts") && !file.endsWith(".tsx");
  const isTsx = file.endsWith(".tsx");

  // Detect if file is inside /app folder
  const inAppFolder = /(^|[\\/])app[\\/]/.test(fullPath);

  // RULE: Entire `tests/` folder is allowed
  if (/(^|[\\/])tests[\\/]/.test(fullPath)) continue;

  // RULE: exact whitelisted filenames
  if (allowedExactNames.some((rx) => rx.test(file))) continue;

  // RULE: allowed extensions (.md, .ps1)
  if (allowedExtensions.test(file)) continue;

  // RULE: TS logic files (.ts)
  // lowercase-with-dashes only
  if (isTs) {
    if (!tsPatternLowercase.test(file)) {
      invalid.push(fullPath);
    }
    continue;
  }

  // RULE: TSX files inside /app
  // lowercase-with-dashes only
  if (isTsx && inAppFolder) {
    if (!appRoutePattern.test(file)) invalid.push(fullPath);
    continue;
  }

  // RULE: TSX files outside /app
  // PascalCase only
  if (isTsx && !inAppFolder) {
    if (!tsxPatternPascal.test(file)) invalid.push(fullPath);
    continue;
  }

  // RULE: Directories must be lowercase (except ignored)
  const segments = dir.split(/[\\/]/).filter(Boolean);

  for (const seg of segments) {
    if (IGNORE_DIRS.has(seg)) continue;
    if (/[A-Z]/.test(seg)) {
      invalid.push(fullPath);
      break;
    }
  }
}

// OUTPUT
if (invalid.length > 0) {
  console.error("Invalid casing detected:\n" + invalid.join("\n"));
  process.exit(1);
}

console.log("File naming validated — OK.");
process.exit(0);
