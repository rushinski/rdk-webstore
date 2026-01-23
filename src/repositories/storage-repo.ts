// src/repositories/storage-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";

export class StorageRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async uploadObject(params: {
    bucket: string;
    path: string;
    file: File;
    contentType: string;
    upsert?: boolean;
  }) {
    const { bucket, path, file, contentType, upsert = true } = params; // Changed default to true

    const { data, error } = await this.supabase.storage.from(bucket).upload(path, file, {
      contentType,
      upsert,
    });

    if (error) {
      throw error;
    }
    return data;
  }

  getPublicUrl(params: { bucket: string; path: string }) {
    const { bucket, path } = params;
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async createSignedUrl(params: {
    bucket: string;
    path: string;
    expiresInSeconds: number;
  }) {
    const { bucket, path, expiresInSeconds } = params;
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error) {
      throw error;
    }
    return data.signedUrl;
  }
}
