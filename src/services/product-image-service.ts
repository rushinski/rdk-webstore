// src/services/product-image-service.ts
/**
 * Product Image Service — ML Subject-Centered (Free, Local)
 *
 * Goals:
 * - 1200x1200 square outputs
 * - Center the product (shoe) even if user photo is low/off-center
 * - Preserve natural look (no blur plates)
 * - Deterministic, consistent strategy:
 *   - Uniform studio background -> solid snapped padding (true black/white)
 *   - Non-uniform scene background -> reframe original background around subject + composite centered cutout
 *
 * Requires:
 *   npm install @imgly/background-removal-node
 */

import sharp from "sharp";
import { removeBackground, type Config as ImglyConfig } from "@imgly/background-removal-node";

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { StorageRepository } from "@/repositories/storage-repo";
import { DEFAULT_MAX_BYTES, ALLOWED_MIME } from "@/config/constants/uploads";

import { spawn } from "node:child_process";
import path from "node:path";

type RGB = { r: number; g: number; b: number };

export type ProcessingStrategy =
  | "ml_subject_centered_uniform"
  | "ml_subject_centered_scene"
  | "fallback_cover_center";

type ResizeResult = {
  processedBuffer: Buffer;
  processingStrategy: ProcessingStrategy;
  needsReviewHint?: string;
};

type SubjectBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
  imageW: number;
  imageH: number;
  coverageRatio: number; // subject area / image area (approx)
};

async function spawnRemoveBgWorker(pngBytes: Buffer, timeoutMs = 12000): Promise<Buffer> {
  // IMPORTANT: This file must run unbundled by Next.
  // In dev, it's easiest to point to the TS file via tsx, OR compile it.
  // Recommended: compile worker to JS (see below).
  const workerPath = path.join(process.cwd(), "dist", "workers", "bg-remove-worker.js");

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [workerPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`bg-remove worker timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    let out = "";
    let err = "";

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (d) => (out += d));

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (d) => (err += d));

    child.on("close", () => {
      clearTimeout(timer);
      try {
        const parsed = JSON.parse(out || "{}") as { cutoutBase64?: string; error?: string };
        if (parsed.error) return reject(new Error(parsed.error));
        if (!parsed.cutoutBase64) return reject(new Error(`worker returned no cutout. stderr=${err}`));
        resolve(Buffer.from(parsed.cutoutBase64, "base64"));
      } catch (e) {
        reject(new Error(`worker JSON parse failed: ${(e as Error).message}. stderr=${err}`));
      }
    });

    child.stdin.write(JSON.stringify({ imageBase64: pngBytes.toString("base64") }));
    child.stdin.end();
  });
}

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  // Create a true ArrayBuffer copy (not SharedArrayBuffer / ArrayBufferLike)
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return ab;
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(file: File) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return toHex(digest);
}

function median(nums: number[]) {
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2);
}

function dist(a: RGB, b: RGB) {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

/**
 * Snap near-black and near-white to true black/white to fix JPEG/lighting drift.
 */
function snapBW(c: RGB, snap = 18): RGB {
  const isNearBlack = c.r <= snap && c.g <= snap && c.b <= snap;
  const isNearWhite = c.r >= 255 - snap && c.g >= 255 - snap && c.b >= 255 - snap;
  if (isNearBlack) return { r: 0, g: 0, b: 0 };
  if (isNearWhite) return { r: 255, g: 255, b: 255 };
  return c;
}

async function patchStats(
  buffer: Buffer,
  left: number,
  top: number,
  width: number,
  height: number,
) {
  const { data, info } = await sharp(buffer)
    .extract({ left, top, width, height })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const r: number[] = [];
  const g: number[] = [];
  const b: number[] = [];

  for (let i = 0; i < data.length; i += info.channels) {
    r.push(data[i]);
    g.push(data[i + 1]);
    b.push(data[i + 2]);
  }

  const mr = median(r);
  const mg = median(g);
  const mb = median(b);

  // mean absolute deviation from median (cheap variation proxy)
  const mad = (arr: number[], m: number) =>
    arr.reduce((acc, v) => acc + Math.abs(v - m), 0) / Math.max(1, arr.length);

  const variation = (mad(r, mr) + mad(g, mg) + mad(b, mb)) / 3;

  return { color: { r: mr, g: mg, b: mb }, variation };
}

/**
 * Detect whether background is "uniform" (studio-like) by checking corner patches.
 * Returns:
 * - isUniform: boolean
 * - color: snapped median corner color (true black/white when near)
 */
async function detectUniformBackground(
  buffer: Buffer,
): Promise<{ isUniform: boolean; color: RGB }> {
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) {
    return { isUniform: true, color: { r: 255, g: 255, b: 255 } };
  }

  const w = meta.width;
  const h = meta.height;
  const patch = Math.max(16, Math.min(48, Math.floor(Math.min(w, h) * 0.06)));

  const tl = await patchStats(buffer, 0, 0, patch, patch);
  const tr = await patchStats(buffer, w - patch, 0, patch, patch);
  const bl = await patchStats(buffer, 0, h - patch, patch, patch);
  const br = await patchStats(buffer, w - patch, h - patch, patch, patch);

  // Tuneable thresholds
  const maxVar = 10; // 6–14 typical
  const maxCornerDist = 60; // 40–90 typical

  const varsOk = [tl, tr, bl, br].every((p) => p.variation <= maxVar);

  const colors = [tl.color, tr.color, bl.color, br.color];
  const d01 = dist(colors[0], colors[1]);
  const d02 = dist(colors[0], colors[2]);
  const d03 = dist(colors[0], colors[3]);
  const cornersOk = Math.max(d01, d02, d03) <= maxCornerDist;

  const medColor: RGB = {
    r: median(colors.map((c) => c.r)),
    g: median(colors.map((c) => c.g)),
    b: median(colors.map((c) => c.b)),
  };

  return { isUniform: varsOk && cornersOk, color: snapBW(medColor) };
}

/**
 * ML cutout and subject bounds detection (bbox) by scanning alpha.
 * Uses @imgly/background-removal-node to produce a PNG with alpha.
 */
async function mlCutoutAndBounds(
  inputBuffer: Buffer,
): Promise<{ cutoutPng: Buffer; bounds: SubjectBounds | null }> {
  // Normalize to a very standard PNG first (orientation + decode/encode)
  const normalizedPng = await sharp(inputBuffer)
    .rotate()
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();

  const cutoutPng = await spawnRemoveBgWorker(normalizedPng);

  // --- bbox scan (same as you already had) ---
  const img = sharp(cutoutPng).ensureAlpha();
  const meta = await img.metadata();
  if (!meta.width || !meta.height) return { cutoutPng, bounds: null };

  const scanW = 256;
  const scanH = Math.max(1, Math.round((meta.height / meta.width) * scanW));

  const { data, info } = await img
    .resize(scanW, scanH, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const alphaIndex = info.channels - 1;

  let minX = info.width,
    minY = info.height,
    maxX = 0,
    maxY = 0;
  let found = false;
  let alphaCount = 0;

  const aThresh = 12;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      const a = data[i + alphaIndex];
      if (a > aThresh) {
        found = true;
        alphaCount++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) return { cutoutPng, bounds: null };

  const scaleX = meta.width / info.width;
  const scaleY = meta.height / info.height;

  const left = Math.max(0, Math.floor(minX * scaleX));
  const top = Math.max(0, Math.floor(minY * scaleY));
  const width = Math.min(meta.width - left, Math.ceil((maxX - minX + 1) * scaleX));
  const height = Math.min(meta.height - top, Math.ceil((maxY - minY + 1) * scaleY));

  const coverageRatio = alphaCount / Math.max(1, info.width * info.height);

  return {
    cutoutPng,
    bounds: { left, top, width, height, imageW: meta.width, imageH: meta.height, coverageRatio },
  };
}

/**
 * Compute a subject-centered square crop window (in original image coords).
 * margin: gives breathing room so we don't crop too tight.
 */
function squareFromBounds(bounds: SubjectBounds) {
  const cx = bounds.left + bounds.width / 2;
  const cy = bounds.top + bounds.height / 2;

  const margin = 1.28; // tune 1.15–1.45
  let side = Math.max(bounds.width, bounds.height) * margin;

  // Clamp side so we don't exceed image
  side = Math.min(side, Math.min(bounds.imageW, bounds.imageH));
  side = Math.max(64, side);

  let left = Math.round(cx - side / 2);
  let top = Math.round(cy - side / 2);

  if (left < 0) left = 0;
  if (top < 0) top = 0;

  if (left + side > bounds.imageW) left = Math.max(0, Math.round(bounds.imageW - side));
  if (top + side > bounds.imageH) top = Math.max(0, Math.round(bounds.imageH - side));

  const size = Math.min(Math.round(side), bounds.imageW - left, bounds.imageH - top);

  return { left, top, size };
}

/**
 * ML subject-centered square creation.
 * - Uniform bg: solid snapped padding + centered ML cutout
 * - Scene bg: reframe original background around subject center (cover), composite centered cutout on top
 */
async function resizeToSquareML(buffer: Buffer, targetSize = 1200): Promise<ResizeResult> {
  const base = await sharp(buffer).rotate().png().toBuffer(); // normalized base
  const rotated = sharp(base); // now everything uses same coords

  // segmentation now uses base (not original)
  let cutoutPng: Buffer;
  let bounds: SubjectBounds | null;

  try {
    const res = await mlCutoutAndBounds(base);
    cutoutPng = res.cutoutPng;
    bounds = res.bounds;
  } catch (e) {
    const processedBuffer = await rotated
      .resize(targetSize, targetSize, { fit: "cover", position: "center" })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
    return { processedBuffer, processingStrategy: "fallback_cover_center", needsReviewHint: `ml_failed:${String(e)}` };
  }

  if (!bounds) {
    console.warn("[resizeToSquareML] bounds not found (mask empty?)");
    const processedBuffer = await rotated
      .resize(targetSize, targetSize, { fit: "cover", position: "center" })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
    return {
      processedBuffer,
      processingStrategy: "fallback_cover_center",
      needsReviewHint: "no_bounds",
    };
  }

  // 2) Guardrails on segmentation coverage
  // Shoes should usually be ~5%–70% of image area depending on framing; tune as you see outputs.
  const tooSmall = bounds.coverageRatio < 0.03;
  const tooLarge = bounds.coverageRatio > 0.85;

  // 3) Determine background mode
  const { isUniform, color } = await detectUniformBackground(base);

  // 4) If uniform bg, use solid background + centered cutout
  if (isUniform) {
    const fg = await sharp(cutoutPng)
      .resize(targetSize, targetSize, {
        fit: "contain",
        position: "center",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    const bg = await sharp({
      create: {
        width: targetSize,
        height: targetSize,
        channels: 3,
        background: color,
      },
    })
      .png()
      .toBuffer();

    const processedBuffer = await sharp(bg)
      .composite([{ input: fg }])
      .webp({ quality: 85, effort: 4 })
      .toBuffer();

    return {
      processedBuffer,
      processingStrategy: "ml_subject_centered_uniform",
      needsReviewHint: tooSmall ? "mask_too_small" : tooLarge ? "mask_too_large" : undefined,
    };
  }

  // 5) Scene bg: create a background plate by reframing original around subject center
  // Note: ML bounds are in cutout image coordinates; cutout has same dimensions as original input,
  // but rotate() can change orientation. For consistent behavior, base the crop on the *rotated* metadata.
  // We'll compute crop on rotated metadata by using rotated metadata sizes and clamping.
  const rotMeta = await rotated.metadata();
  if (!rotMeta.width || !rotMeta.height) {
    const processedBuffer = await rotated
      .resize(targetSize, targetSize, { fit: "cover", position: "center" })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
    return { processedBuffer, processingStrategy: "fallback_cover_center", needsReviewHint: "no_rot_meta" };
  }

  // bounds.imageW/H are from cutout meta (pre-rotate). We’ll map center proportionally.
  const cxNorm = (bounds.left + bounds.width / 2) / bounds.imageW;
  const cyNorm = (bounds.top + bounds.height / 2) / bounds.imageH;

  const mappedBounds: SubjectBounds = {
    left: Math.round(cxNorm * rotMeta.width - (bounds.width / bounds.imageW) * rotMeta.width / 2),
    top: Math.round(cyNorm * rotMeta.height - (bounds.height / bounds.imageH) * rotMeta.height / 2),
    width: Math.round((bounds.width / bounds.imageW) * rotMeta.width),
    height: Math.round((bounds.height / bounds.imageH) * rotMeta.height),
    imageW: rotMeta.width,
    imageH: rotMeta.height,
    coverageRatio: bounds.coverageRatio,
  };

  const sq = squareFromBounds(bounds);

  // Foreground: ML cutout, centered (contain), transparent background.
  // Resize the cutout to targetSize with contain so it sits centered and consistent.

  const processedBuffer = await rotated
  .extract({ left: sq.left, top: sq.top, width: sq.size, height: sq.size })
  .resize(targetSize, targetSize, { fit: "cover" }) // already square, cover is safe
  .webp({ quality: 85, effort: 4 })
  .toBuffer();

  return {
    processedBuffer,
    processingStrategy: "ml_subject_centered_scene",
    needsReviewHint: tooSmall ? "mask_too_small" : tooLarge ? "mask_too_large" : undefined,
  };
}

/**
 * Calculate quality score based on original image resolution
 */
function calculateQualityScore(originalWidth: number, originalHeight: number): number {
  let score = 100;

  const minDimension = Math.min(originalWidth, originalHeight);
  if (minDimension < 600) {
    score -= 20;
  } else if (minDimension < 800) {
    score -= 10;
  }

  if (minDimension > 2000) {
    score = Math.min(100, score + 5);
  }

  return Math.max(0, Math.min(100, score));
}

export class ProductImageService {
  private storageRepo: StorageRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.storageRepo = new StorageRepository(supabase);
  }

  /**
   * Upload and process product image
   * - Validates file
   * - ML subject-centers and produces 1200x1200 WebP
   * - Uploads original + processed
   */
  async uploadProductImage(input: {
    tenantId: string;
    file: File;
    productId?: string | null;
  }): Promise<{
    url: string;
    originalUrl: string;
    path: string;
    originalPath: string;
    mimeType: string;
    bytes: number;
    hash: string;
    bucket: string;
    qualityScore: number;
    processingStrategy: ProcessingStrategy;
    needsReview: boolean;
  }> {
    const bucket = "products";
    const maxBytes = DEFAULT_MAX_BYTES;

    console.info("[ProductImageService] Starting upload:", {
      fileName: input.file.name,
      fileType: input.file.type,
      fileSize: input.file.size,
      tenantId: input.tenantId,
      productId: input.productId,
    });

    // Validation
    if (!input.file) throw new Error("Missing file");
    if (input.file.size <= 0) throw new Error("Empty file");
    if (input.file.size > maxBytes) {
      throw new Error(
        `File too large. Max ${maxBytes} bytes (${Math.round(maxBytes / 1024 / 1024)}MB)`,
      );
    }

    // Normalize MIME type (handle iOS quirks)
    let mimeType = input.file.type;
    if (mimeType === "image/jpg") {
      mimeType = "image/jpeg";
      console.info("[ProductImageService] Normalized image/jpg to image/jpeg");
    }

    let meta = ALLOWED_MIME[mimeType];

    // iOS detection - infer from extension if MIME missing
    if (!meta && input.file.name) {
      const ext = input.file.name.toLowerCase().split(".").pop();
      console.info("[ProductImageService] No MIME type, detecting from extension:", ext);

      if (ext === "jpg" || ext === "jpeg") {
        mimeType = "image/jpeg";
        meta = ALLOWED_MIME["image/jpeg"];
      } else if (ext === "png") {
        mimeType = "image/png";
        meta = ALLOWED_MIME["image/png"];
      } else if (ext === "webp") {
        mimeType = "image/webp";
        meta = ALLOWED_MIME["image/webp"];
      } else if (ext === "heic" || ext === "heif") {
        throw new Error("HEIC/HEIF not supported. Convert to JPG or PNG first.");
      }
    }

    if (!meta) {
      console.error("[ProductImageService] Unsupported MIME type:", {
        provided: input.file.type,
        detected: mimeType,
        fileName: input.file.name,
        allowedTypes: Object.keys(ALLOWED_MIME),
      });
      throw new Error(
        `Unsupported file type: ${input.file.type || "unknown"}. Supported: JPG, PNG, WebP`,
      );
    }

    // Compute hash
    let hash: string;
    try {
      hash = await sha256Hex(input.file);
      console.info("[ProductImageService] Hash computed:", hash);
    } catch (err) {
      console.error("[ProductImageService] Hash computation failed:", err);
      throw new Error("Failed to process file");
    }

    // Convert File to Buffer for Sharp/ML processing
    const arrayBuffer = await input.file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    console.info("[ProductImageService] Starting ML subject-centered resize...");

    let processedBuffer: Buffer;
    let processingStrategy: ProcessingStrategy = "fallback_cover_center";
    let originalMetadata: sharp.Metadata;
    let needsReviewHint: string | undefined;

    try {
      originalMetadata = await sharp(originalBuffer).metadata();

      const result = await resizeToSquareML(originalBuffer, 1200);
      processedBuffer = result.processedBuffer;
      processingStrategy = result.processingStrategy;
      needsReviewHint = result.needsReviewHint;

      console.info("[ProductImageService] ML resize complete:", {
        processedSize: processedBuffer.length,
        processingStrategy,
        needsReviewHint,
      });
    } catch (err) {
      console.error("[ProductImageService] Image processing failed:", err);
      throw new Error("Failed to process image. Please try a different image.");
    }

    // Quality score + review flags
    const qualityScore = calculateQualityScore(
      originalMetadata.width || 0,
      originalMetadata.height || 0,
    );

    // needsReview if low-res OR segmentation hints problems OR fallback path
    const needsReview =
      qualityScore < 70 ||
      processingStrategy === "fallback_cover_center" ||
      Boolean(needsReviewHint);

    console.info("[ProductImageService] Quality metrics:", {
      score: qualityScore,
      needsReview,
      originalDimensions: `${originalMetadata.width}x${originalMetadata.height}`,
      processingStrategy,
      needsReviewHint,
    });

    const productPart = input.productId ? input.productId : "unassigned";

    // Upload ORIGINAL (backup)
    const originalPath = `${input.tenantId}/products/${productPart}/originals/${hash}.${meta.ext}`;

    console.info("[ProductImageService] Uploading original:", {
      bucket,
      path: originalPath,
      contentType: mimeType,
    });

    await this.storageRepo.uploadObject({
      bucket,
      path: originalPath,
      file: input.file,
      contentType: mimeType,
      upsert: true,
    });

    // Upload PROCESSED (display)
    const processedPath = `${input.tenantId}/products/${productPart}/processed/${hash}.webp`;

    console.info("[ProductImageService] Uploading processed:", {
      bucket,
      path: processedPath,
      size: processedBuffer.length,
      processingStrategy,
    });

    await this.storageRepo.uploadBuffer({
      bucket,
      path: processedPath,
      buffer: processedBuffer,
      contentType: "image/webp",
      upsert: true,
    });

    const url = this.storageRepo.getPublicUrl({ bucket, path: processedPath });
    const originalUrl = this.storageRepo.getPublicUrl({ bucket, path: originalPath });

    return {
      url,
      originalUrl,
      path: processedPath,
      originalPath,
      mimeType: "image/webp",
      bytes: processedBuffer.length,
      hash,
      bucket,
      qualityScore,
      processingStrategy,
      needsReview,
    };
  }
}
