import type { UploadQueueState } from "./types";

interface ValidationResult {
  valid: File[];
  errors: string[];
}

interface UploadOutcome {
  toast: { message: string; tone: "success" | "error" | "info" };
  nextQueue: UploadQueueState;
}

interface HandleProductImageUploadArgs {
  files: FileList | null;
  validateFiles: (files: File[]) => ValidationResult;
  runUploadBatch: (files: File[]) => Promise<{
    uploadedUrls: string[];
    queue: UploadQueueState;
  }>;
  summarizeOutcome: (queue: UploadQueueState) => UploadOutcome;
  onToast: (toast: UploadOutcome["toast"]) => void;
  onProgress: (queue: UploadQueueState) => void;
  onUploadedUrls: (urls: string[]) => void;
  onComplete: (queue?: UploadQueueState) => void;
}

export async function handleProductImageUpload({
  files,
  validateFiles,
  runUploadBatch,
  summarizeOutcome,
  onToast,
  onProgress,
  onUploadedUrls,
  onComplete,
}: HandleProductImageUploadArgs): Promise<{ handled: boolean }> {
  if (!files || files.length === 0) {
    return { handled: false };
  }

  const fileArray = Array.from(files);
  const { valid, errors } = validateFiles(fileArray);

  if (errors.length > 0) {
    onToast({
      message: errors.join("; "),
      tone: "error",
    });

    if (valid.length === 0) {
      onComplete();
      return { handled: true };
    }
  }

  const uploadResult = await runUploadBatch(valid);
  onUploadedUrls(uploadResult.uploadedUrls);

  const outcome = summarizeOutcome(uploadResult.queue);
  onToast(outcome.toast);
  onProgress(outcome.nextQueue);
  onComplete(outcome.nextQueue);

  return { handled: true };
}
