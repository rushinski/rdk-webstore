import { handleProductImageUpload } from "@/modules/catalog/presentation/admin/inventory/product-form/handleProductImageUpload";

describe("handleProductImageUpload", () => {
  it("returns early when no files are provided", async () => {
    const result = await handleProductImageUpload({
      files: null,
      validateFiles: jest.fn(),
      runUploadBatch: jest.fn(),
      summarizeOutcome: jest.fn(),
      onToast: jest.fn(),
      onProgress: jest.fn(),
      onUploadedUrls: jest.fn(),
      onComplete: jest.fn(),
    });

    expect(result).toEqual({ handled: false });
  });

  it("shows validation errors and stops when no valid files remain", async () => {
    const onToast = jest.fn();
    const onComplete = jest.fn();

    const result = await handleProductImageUpload({
      files: {
        length: 1,
        item: () => null,
        0: new File(["bad"], "bad.txt", { type: "text/plain" }),
      } as unknown as FileList,
      validateFiles: jest.fn().mockReturnValue({
        valid: [],
        errors: ["Only image files are allowed."],
      }),
      runUploadBatch: jest.fn(),
      summarizeOutcome: jest.fn(),
      onToast,
      onProgress: jest.fn(),
      onUploadedUrls: jest.fn(),
      onComplete,
    });

    expect(result).toEqual({ handled: true });
    expect(onToast).toHaveBeenCalledWith({
      message: "Only image files are allowed.",
      tone: "error",
    });
    expect(onComplete).toHaveBeenCalled();
  });

  it("runs the upload batch and applies the summarized outcome", async () => {
    const file = new File(["a"], "one.jpg", { type: "image/jpeg" });
    const onUploadedUrls = jest.fn();
    const onToast = jest.fn();
    const onComplete = jest.fn();

    const result = await handleProductImageUpload({
      files: {
        length: 1,
        item: () => null,
        0: file,
      } as unknown as FileList,
      validateFiles: jest.fn().mockReturnValue({
        valid: [file],
        errors: [],
      }),
      runUploadBatch: jest.fn().mockResolvedValue({
        uploadedUrls: ["https://cdn.test/one.jpg"],
        queue: { total: 1, completed: 1, failed: 0, isUploading: true },
      }),
      summarizeOutcome: jest.fn().mockReturnValue({
        toast: { message: "Uploaded 1 image.", tone: "success" },
        nextQueue: { total: 1, completed: 1, failed: 0, isUploading: false },
      }),
      onToast,
      onProgress: jest.fn(),
      onUploadedUrls,
      onComplete,
    });

    expect(result).toEqual({ handled: true });
    expect(onUploadedUrls).toHaveBeenCalledWith(["https://cdn.test/one.jpg"]);
    expect(onToast).toHaveBeenCalledWith({
      message: "Uploaded 1 image.",
      tone: "success",
    });
    expect(onComplete).toHaveBeenCalledWith({
      total: 1,
      completed: 1,
      failed: 0,
      isUploading: false,
    });
  });
});
