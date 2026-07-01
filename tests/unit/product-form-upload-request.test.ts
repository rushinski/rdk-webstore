import { executeProductImageUpload } from "@/components/inventory/product-form/executeProductImageUpload";

describe("executeProductImageUpload", () => {
  it("posts the file and returns uploaded urls", async () => {
    const fetchMock = jest.fn((_input: string, init?: RequestInit) => {
      const formData = init?.body as FormData;

      expect(init?.method).toBe("POST");
      expect(formData.get("productId")).toBe("product-1");
      expect(formData.get("file")).toBeInstanceOf(File);

      return Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              uploads: [{ url: "https://cdn.test/a.jpg" }],
            }),
          ),
      });
    });

    const result = await executeProductImageUpload({
      file: new File(["abc"], "pair.jpg", { type: "image/jpeg" }),
      originalFileName: "pair.jpg",
      productId: "product-1",
      fetchImpl: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/uploads/product-image",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result).toEqual(["https://cdn.test/a.jpg"]);
  });

  it("surfaces upload failures from the server parser", async () => {
    await expect(
      executeProductImageUpload({
        file: new File(["abc"], "pair.jpg", { type: "image/jpeg" }),
        originalFileName: "pair.jpg",
        fetchImpl: () =>
          Promise.resolve({
            ok: false,
            text: () => Promise.resolve(JSON.stringify({ error: "Upload rejected" })),
          }),
      }),
    ).rejects.toThrow("Upload rejected");
  });
});
