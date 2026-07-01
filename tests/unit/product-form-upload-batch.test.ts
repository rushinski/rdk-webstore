import { runProductImageUploadBatch } from "@/components/inventory/product-form/runProductImageUploadBatch";

describe("runProductImageUploadBatch", () => {
  it("reports progress and collects uploaded urls across successes and failures", async () => {
    const progressStates: Array<{
      total: number;
      completed: number;
      failed: number;
      isUploading: boolean;
    }> = [];
    const failures: Array<{ fileName: string; index: number; message: string }> = [];
    const successes: Array<{ fileName: string; index: number; urls: string[] }> = [];

    const result = await runProductImageUploadBatch({
      files: [
        new File(["a"], "one.jpg", { type: "image/jpeg" }),
        new File(["b"], "two.jpg", { type: "image/jpeg" }),
      ],
      productId: "product-1",
      compressImage: (file) => Promise.resolve(file),
      uploadImage: ({ originalFileName }) => {
        if (originalFileName === "two.jpg") {
          return Promise.reject(new Error("Upload rejected"));
        }
        return Promise.resolve(["https://cdn.test/one.jpg"]);
      },
      onProgress: (queue) => {
        progressStates.push(queue);
      },
      onFileFailure: ({ error, file, index }) => {
        failures.push({
          fileName: file.name,
          index,
          message: error instanceof Error ? error.message : String(error),
        });
      },
      onFileSuccess: ({ file, index, uploadedUrls }) => {
        successes.push({
          fileName: file.name,
          index,
          urls: uploadedUrls,
        });
      },
    });

    expect(progressStates).toEqual([
      { total: 2, completed: 0, failed: 0, isUploading: true },
      { total: 2, completed: 1, failed: 0, isUploading: true },
      { total: 2, completed: 2, failed: 1, isUploading: true },
    ]);
    expect(failures).toEqual([
      {
        fileName: "two.jpg",
        index: 1,
        message: "Upload rejected",
      },
    ]);
    expect(successes).toEqual([
      {
        fileName: "one.jpg",
        index: 0,
        urls: ["https://cdn.test/one.jpg"],
      },
    ]);
    expect(result).toEqual({
      uploadedUrls: ["https://cdn.test/one.jpg"],
      queue: { total: 2, completed: 2, failed: 1, isUploading: true },
    });
  });
});
