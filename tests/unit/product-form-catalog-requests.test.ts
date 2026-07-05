import {
  fetchBrandCatalogOptions,
  fetchModelCatalogOptions,
  fetchShippingDefaults,
  requestTitleParse,
} from "@/modules/catalog/presentation/admin/inventory/product-form/catalogRequests";

describe("product form catalog requests", () => {
  it("loads shipping defaults and returns a status based result", async () => {
    const successFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          defaults: [{ category: "sneakers", shipping_cost_cents: 1599 }],
        }),
    });

    await expect(fetchShippingDefaults(successFetch)).resolves.toEqual({
      shippingDefaults: { sneakers: 15.99 },
      status: "ready",
    });

    const errorFetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    await expect(fetchShippingDefaults(errorFetch)).resolves.toEqual({
      shippingDefaults: null,
      status: "error",
    });
  });

  it("maps brand and model catalogs from request responses", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            brands: [{ id: "brand-1", canonical_label: "Nike", group: { key: "sport" } }],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ models: [{ id: "model-1", canonical_label: "Air Max 1" }] }),
      });

    await expect(fetchBrandCatalogOptions(fetcher)).resolves.toEqual([
      { id: "brand-1", label: "Nike", groupKey: "sport" },
    ]);
    await expect(fetchModelCatalogOptions(fetcher, "brand-1")).resolves.toEqual([
      { id: "model-1", label: "Air Max 1" },
    ]);
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/api/admin/catalog/models?brandId=brand-1",
    );
  });

  it("posts the title parse request and throws the api error message on failure", async () => {
    const successFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          titleRaw: "Nike Air Max 1",
          name: "Air Max 1",
          titleDisplay: "Nike Air Max 1",
          brand: { id: "brand-1", label: "Nike", isVerified: true },
          model: { id: "model-1", label: "Air Max 1", isVerified: true },
        }),
    });

    await expect(
      requestTitleParse(
        {
          titleRaw: "Nike Air Max 1",
          category: "sneakers",
          brandOverrideId: null,
          modelOverrideId: null,
        },
        successFetch,
        new AbortController().signal,
      ),
    ).resolves.toMatchObject({
      name: "Air Max 1",
      titleDisplay: "Nike Air Max 1",
    });

    const failureFetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Parse failed." }),
    });

    await expect(
      requestTitleParse(
        {
          titleRaw: "Nike Air Max 1",
          category: "sneakers",
          brandOverrideId: null,
          modelOverrideId: null,
        },
        failureFetch,
        new AbortController().signal,
      ),
    ).rejects.toThrow("Parse failed.");
  });
});
