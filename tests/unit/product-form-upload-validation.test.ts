import { validateProductImageFiles } from "@/components/inventory/product-form/validateProductImageFiles";

describe("validateProductImageFiles", () => {
  it("accepts supported image files and extension-only iOS uploads", () => {
    const result = validateProductImageFiles([
      {
        name: "pair.jpg",
        type: "image/jpeg",
        size: 1024,
      },
      {
        name: "phone-upload.PNG",
        type: "",
        size: 2048,
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.valid).toHaveLength(2);
    expect(result.valid.map((file) => file.name)).toEqual([
      "pair.jpg",
      "phone-upload.PNG",
    ]);
  });

  it("rejects unsupported, oversized, and heic files with explicit reasons", () => {
    const result = validateProductImageFiles([
      {
        name: "raw.heic",
        type: "image/heic",
        size: 1024,
      },
      {
        name: "huge.webp",
        type: "image/webp",
        size: 11 * 1024 * 1024,
      },
      {
        name: "notes.txt",
        type: "text/plain",
        size: 128,
      },
    ]);

    expect(result.valid).toEqual([]);
    expect(result.errors).toEqual([
      "raw.heic: HEIC/HEIF not supported. Please convert to JPG in Photos app first.",
      "huge.webp: File too large (max 10MB)",
      "notes.txt: Not a supported image type (use JPG, PNG, or WebP)",
    ]);
  });
});
