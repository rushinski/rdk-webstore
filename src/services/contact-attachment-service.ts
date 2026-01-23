// src/services/contact-attachment-service.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { StorageRepository } from "@/repositories/storage-repo";

const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;

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

type ContactSource = "contact_form" | "bug_report";

export class ContactAttachmentService {
  private storageRepo: StorageRepository;

  constructor(private readonly supabaseAdmin: TypedSupabaseClient) {
    this.storageRepo = new StorageRepository(supabaseAdmin);
  }

  async uploadContactAttachment(input: {
    messageId: string;
    source: ContactSource;
    file: File;
    // optional display name for DB/email UI
    filename?: string | null;
  }) {
    const bucket = "images"; // private
    const maxBytes = bytesFromEnv(process.env.CONTACT_IMAGE_MAX_BYTES, DEFAULT_MAX_BYTES);

    if (!input.file) {
      throw new Error("Missing file");
    }
    if (input.file.size <= 0) {
      throw new Error("Empty file");
    }
    if (input.file.size > maxBytes) {
      throw new Error(`File too large. Max ${maxBytes} bytes`);
    }

    const meta = ALLOWED_MIME[input.file.type];
    if (!meta) {
      throw new Error(`Unsupported mime type: ${input.file.type}`);
    }

    const hash = await sha256Hex(input.file);

    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");

    const path = `contact/${input.source}/${yyyy}/${mm}/${input.messageId}/${hash}.${meta.ext}`;

    await this.storageRepo.uploadObject({
      bucket,
      path,
      file: input.file,
      contentType: input.file.type,
      upsert: true, // Changed to true to allow re-uploading same file
    });

    // Optional: store a "clickable link" for admin viewing (temporary)
    // Choose an expiry that works for you; 7 days shown here.
    const signedUrl = await this.storageRepo.createSignedUrl({
      bucket,
      path,
      expiresInSeconds: 60 * 60 * 24 * 7,
    });

    return {
      bucket,
      path,
      signedUrl,
      mimeType: input.file.type,
      bytes: input.file.size,
      hash,
      filename: input.filename ?? null,
    };
  }
}
