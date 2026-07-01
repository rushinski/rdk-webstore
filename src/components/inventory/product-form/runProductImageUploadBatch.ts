import type { UploadQueueState } from "./types";

interface RunProductImageUploadBatchArgs {
  files: File[];
  productId?: string;
  compressImage: (file: File) => Promise<File>;
  uploadImage: (args: {
    file: File;
    originalFileName: string;
    productId?: string;
  }) => Promise<string[]>;
  onProgress?: (queue: UploadQueueState) => void;
  onFileFailure?: (args: { error: unknown; file: File; index: number }) => void;
  onFileSuccess?: (args: { file: File; index: number; uploadedUrls: string[] }) => void;
}

export async function runProductImageUploadBatch({
  files,
  productId,
  compressImage,
  uploadImage,
  onProgress,
  onFileFailure,
  onFileSuccess,
}: RunProductImageUploadBatchArgs): Promise<{
  uploadedUrls: string[];
  queue: UploadQueueState;
}> {
  let queue: UploadQueueState = {
    total: files.length,
    completed: 0,
    failed: 0,
    isUploading: true,
  };
  const uploadedUrls: string[] = [];

  onProgress?.(queue);

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];

    try {
      const compressedFile = await compressImage(file);
      const urls = await uploadImage({
        file: compressedFile,
        originalFileName: file.name,
        productId,
      });
      uploadedUrls.push(...urls);
      onFileSuccess?.({ file, index, uploadedUrls: urls });
      queue = {
        ...queue,
        completed: queue.completed + 1,
      };
      onProgress?.(queue);
    } catch (error) {
      onFileFailure?.({ error, file, index });
      queue = {
        ...queue,
        failed: queue.failed + 1,
        completed: queue.completed + 1,
      };
      onProgress?.(queue);
    }
  }

  return { uploadedUrls, queue };
}
