// src/services/product-image-service.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { StorageRepository } from "@/repositories/storage-repo";

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10 MiB (MVP-friendly)

const ALLOWED_MIME: Record<string, { ext: string }> = {
  "image/png": { ext: "png" },
  "image/jpeg": { ext: "jpg" },
  "image/webp": { ext: "webp" },
};

function bytesFromEnv(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

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
    const bucket = "products"; // recommended bucket name for storefront product images

    const maxBytes = bytesFromEnv(process.env.PRODUCT_IMAGE_MAX_BYTES, DEFAULT_MAX_BYTES);

    if (!input.file) throw new Error("Missing file");
    if (input.file.size <= 0) throw new Error("Empty file");
    if (input.file.size > maxBytes) {
      throw new Error(`File too large. Max ${maxBytes} bytes`);
    }

    const meta = ALLOWED_MIME[input.file.type];
    if (!meta) {
      throw new Error(`Unsupported mime type: ${input.file.type}`);
    }

    const hash = await sha256Hex(input.file);

    // Store under a tenant/product scoped prefix. Hash-based filename enables immutable caching.
    const productPart = input.productId ? input.productId : "unassigned";
    const path = `${input.tenantId}/products/${productPart}/${hash}.${meta.ext}`;

    await this.storageRepo.uploadObject({
      bucket,
      path,
      file: input.file,
      contentType: input.file.type,
      upsert: false,
    });

    const url = this.storageRepo.getPublicUrl({ bucket, path });

    return {
      url,
      path,
      mimeType: input.file.type,
      bytes: input.file.size,
      hash,
      bucket,
    };
  }
}
