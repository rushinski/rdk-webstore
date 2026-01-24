// src/config/constants/uploads.ts

export const ALLOWED_MIME: Readonly<Record<string, { ext: string }>> = {
  "image/png": { ext: "png" },
  "image/jpeg": { ext: "jpg" },
  "image/webp": { ext: "webp" },
} as const;

// This stays UPPER_CASE because it's a number literal (matches your rule)
export const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10 MiB
