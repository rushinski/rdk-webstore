import { summarizeProductImageUploadOutcome } from "@/modules/catalog/presentation/admin/inventory/product-form/summarizeProductImageUploadOutcome";

describe("summarizeProductImageUploadOutcome", () => {
  it("returns a success toast when all uploads succeed", () => {
    expect(
      summarizeProductImageUploadOutcome({
        total: 3,
        completed: 3,
        failed: 0,
        isUploading: true,
      }),
    ).toEqual({
      nextQueue: {
        total: 3,
        completed: 3,
        failed: 0,
        isUploading: false,
      },
      toast: {
        message: "3 image(s) uploaded successfully",
        tone: "success",
      },
    });
  });

  it("returns an error toast when all uploads fail", () => {
    expect(
      summarizeProductImageUploadOutcome({
        total: 2,
        completed: 2,
        failed: 2,
        isUploading: true,
      }),
    ).toEqual({
      nextQueue: {
        total: 2,
        completed: 2,
        failed: 2,
        isUploading: false,
      },
      toast: {
        message: "All 2 upload(s) failed",
        tone: "error",
      },
    });
  });

  it("returns an info toast for mixed upload results", () => {
    expect(
      summarizeProductImageUploadOutcome({
        total: 5,
        completed: 5,
        failed: 2,
        isUploading: true,
      }),
    ).toEqual({
      nextQueue: {
        total: 5,
        completed: 5,
        failed: 2,
        isUploading: false,
      },
      toast: {
        message: "3 succeeded, 2 failed",
        tone: "info",
      },
    });
  });
});
