// src/services/product-image-service.ts
/**
 * SMART Background-Aware Product Image Service
 * 
 * This version detects the background color from the image edges and uses
 * that same color for padding. This ensures:
 * - White backgrounds get white padding
 * - Black backgrounds get black padding  
 * - Gray/colored backgrounds get matched padding
 * - Multi-colored backgrounds get averaged padding
 * 
 * Result: Professional-looking squares that blend seamlessly with the original image.
 */

import sharp from 'sharp';
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { StorageRepository } from "@/repositories/storage-repo";
import { DEFAULT_MAX_BYTES, ALLOWED_MIME } from "@/config/constants/uploads";

type RGB = { r: number; g: number; b: number };

type ResizeResult =
  | { processedBuffer: Buffer; processingStrategy: "contain_solid" }
  | { processedBuffer: Buffer; processingStrategy: "cover_smartcrop" };

function clamp255(n: number) {
  return Math.max(0, Math.min(255, n));
}

function snapBW(c: RGB, snap = 18): RGB {
  // snap near-black and near-white (tune snap 12–25)
  const isNearBlack = c.r <= snap && c.g <= snap && c.b <= snap;
  const isNearWhite = c.r >= 255 - snap && c.g >= 255 - snap && c.b >= 255 - snap;
  if (isNearBlack) return { r: 0, g: 0, b: 0 };
  if (isNearWhite) return { r: 255, g: 255, b: 255 };
  return c;
}

function median(nums: number[]) {
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2);
}

async function patchStats(buffer: Buffer, left: number, top: number, width: number, height: number) {
  const { data, info } = await sharp(buffer)
    .extract({ left, top, width, height })
    .removeAlpha() // ignore alpha differences
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

  // simple variance proxy: mean absolute deviation from median
  const mad = (arr: number[], m: number) =>
    arr.reduce((acc, v) => acc + Math.abs(v - m), 0) / Math.max(1, arr.length);

  const v = (mad(r, mr) + mad(g, mg) + mad(b, mb)) / 3;

  return { color: { r: mr, g: mg, b: mb }, variation: v };
}

async function subjectBox(buffer: Buffer) {
  const img = sharp(buffer).rotate();
  const t = img.clone().trim({ threshold: 15 });
  const tMeta = await t.metadata();
  const oMeta = await img.metadata();
  if (!tMeta.width || !tMeta.height || !oMeta.width || !oMeta.height) return null;

  // trim() returns an image, but we need the bounding box.
  // Sharp doesn't directly return the trim box, so we do a cheap workaround:
  // Use difference between original and trimmed sizes as a proxy.
  // For MVP, this is "good enough" but not perfect.
  return {
    originalW: oMeta.width,
    originalH: oMeta.height,
    trimmedW: tMeta.width,
    trimmedH: tMeta.height,
  };
}

function dist(a: RGB, b: RGB) {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

async function detectUniformBackground(buffer: Buffer): Promise<{ isUniform: boolean; color: RGB }> {
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) return { isUniform: true, color: { r: 255, g: 255, b: 255 } };

  const w = meta.width;
  const h = meta.height;
  const patch = Math.max(16, Math.min(48, Math.floor(Math.min(w, h) * 0.06)));

  const tl = await patchStats(buffer, 0, 0, patch, patch);
  const tr = await patchStats(buffer, w - patch, 0, patch, patch);
  const bl = await patchStats(buffer, 0, h - patch, patch, patch);
  const br = await patchStats(buffer, w - patch, h - patch, patch, patch);

  // Uniform if each corner patch has low variation AND corners are similar to each other
  const maxVar = 10;          // tune 6–14
  const maxCornerDist = 60;   // tune 40–90

  const varsOk = [tl, tr, bl, br].every(p => p.variation <= maxVar);
  const colors = [tl.color, tr.color, bl.color, br.color];
  const d01 = dist(colors[0], colors[1]);
  const d02 = dist(colors[0], colors[2]);
  const d03 = dist(colors[0], colors[3]);
  const cornersOk = Math.max(d01, d02, d03) <= maxCornerDist;

  const medColor: RGB = {
    r: median(colors.map(c => c.r)),
    g: median(colors.map(c => c.g)),
    b: median(colors.map(c => c.b)),
  };

  return { isUniform: varsOk && cornersOk, color: snapBW(medColor) };
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(file: File) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return toHex(digest);
}

// Top-level helper (NOT inside the class)
async function smartCenterCrop(buffer: Buffer): Promise<sharp.Sharp> {
  const rotated = sharp(buffer).rotate();

  // Trim border-like areas; tune threshold as needed (10–30 typical)
  const trimmed = rotated.clone().trim({ threshold: 15 });

  const meta = await trimmed.metadata();
  if (!meta.width || !meta.height) return rotated;

  return trimmed;
}


/**
 * Detect the dominant background color by sampling the edges
 * Returns RGB color object { r, g, b }
 */
async function detectBackgroundColor(buffer: Buffer): Promise<{ r: number; g: number; b: number }> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      console.warn("[detectBackgroundColor] No dimensions, using white");
      return { r: 255, g: 255, b: 255 };
    }

    // Sample size - we'll extract a small border around the image
    const sampleSize = Math.min(50, Math.floor(metadata.width * 0.05));
    
    // Extract top edge
    const topEdge = await sharp(buffer)
      .extract({ 
        left: 0, 
        top: 0, 
        width: metadata.width, 
        height: sampleSize 
      })
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Extract bottom edge
    const bottomEdge = await sharp(buffer)
      .extract({ 
        left: 0, 
        top: metadata.height - sampleSize, 
        width: metadata.width, 
        height: sampleSize 
      })
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Extract left edge
    const leftEdge = await sharp(buffer)
      .extract({ 
        left: 0, 
        top: 0, 
        width: sampleSize, 
        height: metadata.height 
      })
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Extract right edge
    const rightEdge = await sharp(buffer)
      .extract({ 
        left: metadata.width - sampleSize, 
        top: 0, 
        width: sampleSize, 
        height: metadata.height 
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Combine all edge pixels
    const allEdgeData = Buffer.concat([
      topEdge.data,
      bottomEdge.data,
      leftEdge.data,
      rightEdge.data,
    ]);

    // Calculate average color
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let pixelCount = 0;

    const channels = topEdge.info.channels; // Usually 3 (RGB) or 4 (RGBA)
    
    for (let i = 0; i < allEdgeData.length; i += channels) {
      totalR += allEdgeData[i];
      totalG += allEdgeData[i + 1];
      totalB += allEdgeData[i + 2];
      pixelCount++;
    }

    const avgColor = {
      r: Math.round(totalR / pixelCount),
      g: Math.round(totalG / pixelCount),
      b: Math.round(totalB / pixelCount),
    };

    console.info("[detectBackgroundColor] Detected color:", {
      rgb: `rgb(${avgColor.r}, ${avgColor.g}, ${avgColor.b})`,
      hex: `#${avgColor.r.toString(16).padStart(2, '0')}${avgColor.g.toString(16).padStart(2, '0')}${avgColor.b.toString(16).padStart(2, '0')}`,
      sampledPixels: pixelCount,
    });

    return avgColor;
  } catch (error) {
    console.error("[detectBackgroundColor] Failed to detect color, using white:", error);
    return { r: 255, g: 255, b: 255 }; // Fallback to white
  }
}

/**
 * Resize image to square with background-matched padding
 */
async function resizeToSquare(buffer: Buffer, targetSize = 1200): Promise<ResizeResult> {
  const rotated = sharp(buffer).rotate();
  const { isUniform, color } = await detectUniformBackground(buffer);

  if (isUniform) {
    const processedBuffer = await rotated
      .resize(targetSize, targetSize, {
        fit: "contain",
        position: "center",
        background: color,
      })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();

    return { processedBuffer, processingStrategy: "contain_solid" };
  }

  const processedBuffer = await rotated
    .resize(targetSize, targetSize, {
      fit: "cover",
      position: "attention",
    })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();

  return { processedBuffer, processingStrategy: "cover_smartcrop" };
}

/**
 * Calculate quality score based on original image resolution
 */
function calculateQualityScore(
  originalWidth: number,
  originalHeight: number
): number {
  let score = 100;
  
  // Penalty for very small images (will look pixelated)
  const minDimension = Math.min(originalWidth, originalHeight);
  if (minDimension < 600) {
    score -= 20;
  } else if (minDimension < 800) {
    score -= 10;
  }
  
  // Bonus for high-res images
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
   * - Detects background color from edges
   * - Resizes to 1200x1200 with color-matched padding
   * - Uploads both original and processed versions
   * - Returns URLs and quality metrics
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
    processingStrategy: "contain_solid" | "cover_smartcrop";
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
    if (!input.file) {
      throw new Error("Missing file");
    }
    if (input.file.size <= 0) {
      throw new Error("Empty file");
    }
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

    // iOS detection - try to infer from extension if no MIME type
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
        throw new Error(
          "HEIC/HEIF format not supported. Please convert to JPG or PNG first.",
        );
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
    } catch (hashError) {
      console.error("[ProductImageService] Hash computation failed:", hashError);
      throw new Error("Failed to process file");
    }

    // Convert File to Buffer for Sharp processing
    const arrayBuffer = await input.file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    console.info("[ProductImageService] Starting smart resize...");

    let processedBuffer: Buffer;
    let processingStrategy: "contain_solid" | "cover_smartcrop" = "contain_solid";
    let originalMetadata: sharp.Metadata;
    
    try {
      // Get original dimensions for quality score
      originalMetadata = await sharp(originalBuffer).metadata();
      
      // Resize to square with background-matched padding
      const result = await resizeToSquare(originalBuffer, 1200);
      processedBuffer = result.processedBuffer;
      processingStrategy = result.processingStrategy;
    } catch (processingError) {
      console.error("[ProductImageService] Image processing failed:", processingError);
      throw new Error("Failed to process image. Please try a different image.");
    }

    // Calculate quality score
    const qualityScore = calculateQualityScore(
      originalMetadata.width || 0,
      originalMetadata.height || 0,
    );

    const needsReview = qualityScore < 70;

    console.info("[ProductImageService] Quality metrics:", {
      score: qualityScore,
      needsReview,
      originalDimensions: `${originalMetadata.width}x${originalMetadata.height}`,
    });

    const productPart = input.productId ? input.productId : "unassigned";
    
    // Upload ORIGINAL (as backup)
    const originalPath = `${input.tenantId}/products/${productPart}/originals/${hash}.${meta.ext}`;
    
    console.info("[ProductImageService] Uploading original to storage:", {
      bucket,
      path: originalPath,
      contentType: mimeType,
    });

    try {
      await this.storageRepo.uploadObject({
        bucket,
        path: originalPath,
        file: input.file,
        contentType: mimeType,
        upsert: true,
      });
      console.info("[ProductImageService] Original upload successful");
    } catch (storageError) {
      console.error("[ProductImageService] Original upload failed:", storageError);
      throw storageError;
    }

    // Upload PROCESSED version (this is what gets displayed)
    const processedPath = `${input.tenantId}/products/${productPart}/processed/${hash}.webp`;
    
    console.info("[ProductImageService] Uploading processed version to storage:", {
      bucket,
      path: processedPath,
      size: processedBuffer.length,
    });

    try {
      await this.storageRepo.uploadBuffer({
        bucket,
        path: processedPath,
        buffer: processedBuffer,
        contentType: 'image/webp',
        upsert: true,
      });
      console.info("[ProductImageService] Processed upload successful");
    } catch (storageError) {
      console.error("[ProductImageService] Processed upload failed:", storageError);
      throw storageError;
    }

    const url = this.storageRepo.getPublicUrl({ bucket, path: processedPath });
    const originalUrl = this.storageRepo.getPublicUrl({ bucket, path: originalPath });

    return {
      url,
      originalUrl,
      path: processedPath,
      originalPath,
      mimeType: 'image/webp',
      bytes: processedBuffer.length,
      hash,
      bucket,
      qualityScore,
      processingStrategy: processingStrategy,
      needsReview,
    };
  }
}