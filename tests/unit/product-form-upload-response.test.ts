import { parseProductImageUploadResponse } from "@/modules/catalog/presentation/admin/inventory/product-form/parseProductImageUploadResponse";

describe("parseProductImageUploadResponse", () => {
  it("extracts upload urls from batch and single-upload payloads", () => {
    expect(
      parseProductImageUploadResponse({
        ok: true,
        responseText: JSON.stringify({
          uploads: [{ url: "https://cdn.test/a.jpg" }, { url: "https://cdn.test/b.jpg" }],
        }),
      }),
    ).toEqual(["https://cdn.test/a.jpg", "https://cdn.test/b.jpg"]);

    expect(
      parseProductImageUploadResponse({
        ok: true,
        responseText: JSON.stringify({ url: "https://cdn.test/c.jpg" }),
      }),
    ).toEqual(["https://cdn.test/c.jpg"]);
  });

  it("throws a useful message for invalid or failed responses", () => {
    expect(() =>
      parseProductImageUploadResponse({
        ok: false,
        responseText: JSON.stringify({ error: "Upload rejected" }),
      }),
    ).toThrow("Upload rejected");

    expect(() =>
      parseProductImageUploadResponse({
        ok: true,
        responseText: "<html>bad gateway</html>",
      }),
    ).toThrow("Invalid server response: <html>bad gateway</html>");
  });
});
