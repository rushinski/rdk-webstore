import { execSync } from "child_process";
import path from "path";

// Whitelisted exact filenames
const allowedExactNames = [
  /^Dockerfile$/,
  /^Caddyfile$/,
  /^LICENSE$/,
  /^LICENSE\.txt$/,
  /^database\.types\.ts$/, // Supabase auto-generated
];

// Allowing .md and .ps1 extensions
const allowedExtensions = /\.(md|ps1)$/i;

// TS logic files: lowercase-with-dashes
const tsPatternLowercase = /^[a-z0-9\-]+\.ts$/;

// TSX outside app: PascalCase ONLY
const tsxPatternPascal = /^[A-Z][A-Za-z0-9]+\.tsx$/;

// TSX inside app: lowercase-with-dashes ONLY
const appRoutePattern = /^[a-z0-9\-]+\.tsx$/;

// Collect git-tracked files
const files = execSync("git ls-files", { encoding: "utf8" }).trim().split("\n");

const invalid: string[] = [];

for (const fullPath of files) {
  const file = path.basename(fullPath);
  const dir = path.dirname(fullPath);
  const segments = dir.split(/[\\/]/).filter(Boolean);

  const isTs = file.endsWith(".ts") && !file.endsWith(".tsx");
  const isTsx = file.endsWith(".tsx");
  const inAppFolder = /(^|[\\/])app[\\/]/.test(fullPath);

  // --- RULE: exact whitelisted filenames ---
  if (allowedExactNames.some((rx) => rx.test(file))) continue;

  // --- RULE: allowed non-TS extensions ---
  if (allowedExtensions.test(file)) continue;

  // RULE: TS (.ts) logic files
  // lowercase-with-dashes only
  if (isTs) {
    if (!tsPatternLowercase.test(file)) {
      invalid.push(fullPath);
    }
    continue;
  }

  // RULE: TSX (.tsx) inside app/
  // lowercase-with-dashes only
  if (isTsx && inAppFolder) {
    if (!appRoutePattern.test(file)) invalid.push(fullPath);
    continue;
  }

  // RULE: TSX (.tsx) outside app/
  // PascalCase only
  if (isTsx && !inAppFolder) {
    if (!tsxPatternPascal.test(file)) invalid.push(fullPath);
    continue;
  }

  // RULE: Directories must be lowercase
  for (const seg of segments) {
    if (/[A-Z]/.test(seg)) {
      invalid.push(fullPath);
      break;
    }
  }
}

// Fail CI if violations found
if (invalid.length > 0) {
  console.error("Invalid casing detected:\n" + invalid.join("\n"));
  process.exit(1);
}

process.exit(0);
