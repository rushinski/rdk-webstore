// src/services/product-image-service.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { StorageRepository } from "@/repositories/storage-repo";
import { DEFAULT_MAX_BYTES, ALLOWED_MIME } from "@/config/constants/uploads";

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
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
  }) {
    const bucket = "products";
    const maxBytes = DEFAULT_MAX_BYTES;

    console.info("[ProductImageService] Starting upload:", {
      fileName: input.file.name,
      fileType: input.file.type,
      fileSize: input.file.size,
      tenantId: input.tenantId,
      productId: input.productId,
    });

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

    // Normalize MIME type - handle both image/jpg and image/jpeg
    let mimeType = input.file.type;

    // Normalize image/jpg to image/jpeg (some browsers/devices use image/jpg)
    if (mimeType === "image/jpg") {
      mimeType = "image/jpeg";
      console.info("[ProductImageService] Normalized image/jpg to image/jpeg");
    }

    let meta = ALLOWED_MIME[mimeType];

    // If no MIME type provided (common on iOS), try to detect from file extension
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
          `HEIC/HEIF format not supported. Please convert to JPG or PNG first.`,
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

    let hash: string;
    try {
      hash = await sha256Hex(input.file);
      console.info("[ProductImageService] Hash computed:", hash);
    } catch (hashError) {
      console.error("[ProductImageService] Hash computation failed:", hashError);
      throw new Error("Failed to process file");
    }

    const productPart = input.productId ? input.productId : "unassigned";
    const path = `${input.tenantId}/products/${productPart}/${hash}.${meta.ext}`;

    console.info("[ProductImageService] Uploading to storage:", {
      bucket,
      path,
      contentType: mimeType,
      extension: meta.ext,
      originalMimeType: input.file.type,
    });

    try {
      await this.storageRepo.uploadObject({
        bucket,
        path,
        file: input.file,
        contentType: mimeType, // Use normalized MIME type
        upsert: true,
      });
      console.info("[ProductImageService] Upload successful:", path);
    } catch (storageError) {
      console.error("[ProductImageService] Storage upload failed:", storageError);
      throw storageError;
    }

    const url = this.storageRepo.getPublicUrl({ bucket, path });

    return {
      url,
      path,
      mimeType,
      bytes: input.file.size,
      hash,
      bucket,
    };
  }
}