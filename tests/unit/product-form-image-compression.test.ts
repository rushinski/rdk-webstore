import { compressProductImageFile } from "@/components/inventory/product-form/compressProductImageFile";

describe("compressProductImageFile", () => {
  it("skips compression for small files", async () => {
    const file = new File(["small"], "small.jpg", { type: "image/jpeg" });
    const loadImageCompression = jest.fn();
    const logError = jest.fn();
    const info = jest.fn();
    const error = jest.fn();

    await expect(
      compressProductImageFile({
        file,
        loadImageCompression,
        logError,
        info,
        error,
      }),
    ).resolves.toBe(file);

    expect(loadImageCompression).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });

  it("compresses large files with the expected options", async () => {
    const file = new File([new Uint8Array(1024 * 1024 + 1)], "large.jpg", {
      type: "image/jpeg",
    });
    const compressedFile = new File(["compressed"], "large.jpg", { type: "image/jpeg" });
    const compressor = jest.fn().mockResolvedValue(compressedFile);
    const loadImageCompression = jest.fn().mockResolvedValue({ default: compressor });

    await expect(
      compressProductImageFile({
        file,
        loadImageCompression,
        logError: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
      }),
    ).resolves.toBe(compressedFile);

    expect(compressor).toHaveBeenCalledWith(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: "image/jpeg",
    });
  });

  it("falls back to the original file when compression fails and logs the error", async () => {
    const file = new File([new Uint8Array(1024 * 1024 + 1)], "broken.jpg", {
      type: "image/jpeg",
    });
    const compressionError = new Error("compression failed");
    const loadImageCompression = jest.fn().mockResolvedValue({
      default: jest.fn().mockRejectedValue(compressionError),
    });
    const logError = jest.fn();
    const error = jest.fn();

    await expect(
      compressProductImageFile({
        file,
        loadImageCompression,
        logError,
        info: jest.fn(),
        error,
      }),
    ).resolves.toBe(file);

    expect(error).toHaveBeenCalledWith(
      "[compressImage] Compression failed, using original:",
      compressionError,
    );
    expect(logError).toHaveBeenCalledWith(compressionError, {
      layer: "frontend",
      event: "image_compression_failed",
      fileName: "broken.jpg",
      fileSize: file.size,
    });
  });
});
