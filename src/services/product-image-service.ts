// src/services/product-image-service.ts
/**
 * Product Image Service — ML via Hugging Face Space (Free)
 * FIXED: Truly centers the subject by cropping to bounds first
 */

import sharp from "sharp";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { StorageRepository } from "@/repositories/storage-repo";
import { DEFAULT_MAX_BYTES, ALLOWED_MIME } from "@/config/constants/uploads";
import { env } from "@/config/env";

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
  coverageRatio: number;
};

const HF_SPACE_URL = env.HF_SPACE_URL;

async function callHFBackgroundRemoval(imageBuffer: Buffer): Promise<Buffer> {
  const formData = new FormData();
  const uint8Array = new Uint8Array(imageBuffer);
  const blob = new Blob([uint8Array], { type: "image/png" });
  formData.append("file", blob, "image.png");

  const response = await fetch(`${HF_SPACE_URL}/remove-background`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`HF Space API failed: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function median(nums: number[]) {
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2);
}

function dist(a: RGB, b: RGB) {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

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

  const mad = (arr: number[], m: number) =>
    arr.reduce((acc, v) => acc + Math.abs(v - m), 0) / Math.max(1, arr.length);

  const variation = (mad(r, mr) + mad(g, mg) + mad(b, mb)) / 3;

  return { color: { r: mr, g: mg, b: mb }, variation };
}

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

  const maxVar = 10;
  const maxCornerDist = 60;

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

async function mlCutoutAndBounds(
  inputBuffer: Buffer,
): Promise<{ cutoutPng: Buffer; bounds: SubjectBounds | null }> {
  const normalizedPng = await sharp(inputBuffer)
    .rotate()
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();

  const cutoutPng = await callHFBackgroundRemoval(normalizedPng);

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

function squareFromBounds(bounds: SubjectBounds) {
  const cx = bounds.left + bounds.width / 2;
  const cy = bounds.top + bounds.height / 2;

  const margin = 1.28;
  let side = Math.max(bounds.width, bounds.height) * margin;

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

async function resizeToSquareML(buffer: Buffer, targetSize = 1200): Promise<ResizeResult> {
  const base = await sharp(buffer).rotate().png().toBuffer();
  const rotated = sharp(base);

  let cutoutPng: Buffer;
  let bounds: SubjectBounds | null;

  try {
    const res = await mlCutoutAndBounds(base);
    cutoutPng = res.cutoutPng;
    bounds = res.bounds;
  } catch (e) {
    console.error("[ML] Background removal failed:", e);
    const processedBuffer = await rotated
      .resize(targetSize, targetSize, { fit: "cover", position: "center" })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
    return {
      processedBuffer,
      processingStrategy: "fallback_cover_center",
      needsReviewHint: `ml_failed:${String(e)}`,
    };
  }

  if (!bounds) {
    console.warn("[ML] Bounds not found");
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

  const tooSmall = bounds.coverageRatio < 0.03;
  const tooLarge = bounds.coverageRatio > 0.85;

  const { isUniform, color } = await detectUniformBackground(base);

  if (isUniform) {
    // FIXED: Crop to subject bounds FIRST, then resize with padding
    // This ensures the subject itself is centered, not just the canvas
    
    // Add padding around the subject bounds (20% margin)
    const padding = 0.2;
    const paddedWidth = Math.round(bounds.width * (1 + padding));
    const paddedHeight = Math.round(bounds.height * (1 + padding));
    
    // Calculate crop coordinates (centered on subject)
    const cropLeft = Math.max(0, Math.round(bounds.left - (paddedWidth - bounds.width) / 2));
    const cropTop = Math.max(0, Math.round(bounds.top - (paddedHeight - bounds.height) / 2));
    const cropWidth = Math.min(paddedWidth, bounds.imageW - cropLeft);
    const cropHeight = Math.min(paddedHeight, bounds.imageH - cropTop);
    
    // Crop to subject with padding, then resize to target
    const fg = await sharp(cutoutPng)
      .extract({ 
        left: cropLeft, 
        top: cropTop, 
        width: cropWidth, 
        height: cropHeight 
      })
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

  // Scene background: just crop and reframe around subject (no composite)
  const sq = squareFromBounds(bounds);

  const processedBuffer = await rotated
    .extract({ left: sq.left, top: sq.top, width: sq.size, height: sq.size })
    .resize(targetSize, targetSize, { fit: "cover" })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();

  return {
    processedBuffer,
    processingStrategy: "ml_subject_centered_scene",
    needsReviewHint: tooSmall ? "mask_too_small" : tooLarge ? "mask_too_large" : undefined,
  };
}

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

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
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

export class ProductImageService {
  private storageRepo: StorageRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.storageRepo = new StorageRepository(supabase);
  }

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

    if (!input.file) throw new Error("Missing file");
    if (input.file.size <= 0) throw new Error("Empty file");
    if (input.file.size > maxBytes) {
      throw new Error(
        `File too large. Max ${maxBytes} bytes (${Math.round(maxBytes / 1024 / 1024)}MB)`,
      );
    }

    let mimeType = input.file.type;
    if (mimeType === "image/jpg") {
      mimeType = "image/jpeg";
    }

    let meta = ALLOWED_MIME[mimeType];

    if (!meta && input.file.name) {
      const ext = input.file.name.toLowerCase().split(".").pop();
      if (ext === "jpg" || ext === "jpeg") {
        mimeType = "image/jpeg";
        meta = ALLOWED_MIME["image/jpeg"];
      } else if (ext === "png") {
        mimeType = "image/png";
        meta = ALLOWED_MIME["image/png"];
      } else if (ext === "webp") {
        mimeType = "image/webp";
        meta = ALLOWED_MIME["image/webp"];
      }
    }

    if (!meta) {
      throw new Error(
        `Unsupported file type: ${input.file.type || "unknown"}. Supported: JPG, PNG, WebP`,
      );
    }

    let hash: string;
    try {
      hash = await sha256Hex(input.file);
    } catch (err) {
      throw new Error("Failed to process file");
    }

    const arrayBuffer = await input.file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

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

    const qualityScore = calculateQualityScore(
      originalMetadata.width || 0,
      originalMetadata.height || 0,
    );

    const needsReview =
      qualityScore < 70 ||
      processingStrategy === "fallback_cover_center" ||
      Boolean(needsReviewHint);

    const productPart = input.productId ? input.productId : "unassigned";

    const originalPath = `${input.tenantId}/products/${productPart}/originals/${hash}.${meta.ext}`;

    await this.storageRepo.uploadObject({
      bucket,
      path: originalPath,
      file: input.file,
      contentType: mimeType,
      upsert: true,
    });

    const processedPath = `${input.tenantId}/products/${productPart}/processed/${hash}.webp`;

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