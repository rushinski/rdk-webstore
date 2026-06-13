import { LightspeedClient } from "@/lib/lightspeed/client";

describe("LightspeedClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("hydrates inventory when the inventory endpoint returns a raw array (X-Series format)", async () => {
    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            includes: null,
            data: {
              id: "ls-xseries-1",
              name: "Jordan 4",
              has_inventory: true,
            },
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        // X-Series returns a raw array, not { data: [...] }
        json: () =>
          Promise.resolve([
            {
              id: "inv-1",
              outlet_id: "outlet-1",
              product_id: "ls-xseries-1",
              current_inventory_level: 3,
            },
          ]),
      } as Response);

    const client = new LightspeedClient({
      domainPrefix: "demo-store",
      accessToken: "token",
    });

    const product = await client.getProduct("ls-xseries-1");

    expect(product?.inventory).toEqual([
      expect.objectContaining({ product_id: "ls-xseries-1", current_inventory_level: 3 }),
    ]);
  });

  it("hydrates variant inventory from the inventory endpoint when product payloads omit stock", async () => {
    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              id: "ls-family-1",
              name: "Jordan 4 Delta",
              variants: [
                {
                  id: "ls-child-1",
                  sku: "N-JDN-DEL-11-01",
                },
                {
                  id: "ls-child-2",
                  sku: "N-JDN-DEL-12-02",
                },
              ],
            },
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                product_id: "ls-child-1",
                outlet_id: "outlet-1",
                count: 2,
              },
              {
                product_id: "ls-child-2",
                outlet_id: "outlet-1",
                count: 5,
              },
            ],
          }),
      } as Response);

    const client = new LightspeedClient({
      domainPrefix: "demo-store",
      accessToken: "token",
    });

    const product = await client.getProduct("ls-family-1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://demo-store.retail.lightspeed.app/api/2026-04/products/ls-family-1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token",
          Accept: "application/json",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://demo-store.retail.lightspeed.app/api/2026-04/inventory/ls-family-1?page_size=5000&variants=true",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token",
          Accept: "application/json",
        }),
      }),
    );
    expect(product?.variants).toEqual([
      expect.objectContaining({
        id: "ls-child-1",
        inventory: [{ product_id: "ls-child-1", outlet_id: "outlet-1", count: 2 }],
      }),
      expect.objectContaining({
        id: "ls-child-2",
        inventory: [{ product_id: "ls-child-2", outlet_id: "outlet-1", count: 5 }],
      }),
    ]);
  });
});
