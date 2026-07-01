import type { LogEntry } from "@/lib/utils/log";

interface ImageCompressionModule {
  default: (
    file: File,
    options: {
      maxSizeMB: number;
      maxWidthOrHeight: number;
      useWebWorker: boolean;
      fileType: string;
    },
  ) => Promise<File>;
}

interface CompressProductImageFileArgs {
  file: File;
  loadImageCompression: () => Promise<ImageCompressionModule>;
  logError: (error: unknown, metadata?: Partial<LogEntry>) => void;
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export async function compressProductImageFile({
  file,
  loadImageCompression,
  logError,
  info,
  error,
}: CompressProductImageFileArgs): Promise<File> {
  if (file.size < 1 * 1024 * 1024) {
    info("[compressImage] File already small, skipping compression:", file.size);
    return file;
  }

  info("[compressImage] Compressing file:", {
    name: file.name,
    originalSize: file.size,
    originalType: file.type,
  });

  try {
    const imageCompression = await loadImageCompression();
    const options = {
      maxSizeMB: 2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: file.type || "image/jpeg",
    };

    const compressedFile = await imageCompression.default(file, options);

    info("[compressImage] Compression successful:", {
      originalSize: file.size,
      compressedSize: compressedFile.size,
      reduction: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`,
    });

    return compressedFile;
  } catch (compressionError) {
    error("[compressImage] Compression failed, using original:", compressionError);
    logError(compressionError, {
      layer: "frontend",
      event: "image_compression_failed",
      fileName: file.name,
      fileSize: file.size,
    });
    return file;
  }
}
