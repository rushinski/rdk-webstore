import type { UploadQueueState } from "./types";

export function summarizeProductImageUploadOutcome(queue: UploadQueueState): {
  nextQueue: UploadQueueState;
  toast: {
    message: string;
    tone: "success" | "error" | "info";
  };
} {
  const successCount = queue.total - queue.failed;

  if (queue.failed === 0) {
    return {
      nextQueue: { ...queue, isUploading: false },
      toast: {
        message: `${successCount} image(s) uploaded successfully`,
        tone: "success",
      },
    };
  }

  if (successCount === 0) {
    return {
      nextQueue: { ...queue, isUploading: false },
      toast: {
        message: `All ${queue.failed} upload(s) failed`,
        tone: "error",
      },
    };
  }

  return {
    nextQueue: { ...queue, isUploading: false },
    toast: {
      message: `${successCount} succeeded, ${queue.failed} failed`,
      tone: "info",
    },
  };
}
