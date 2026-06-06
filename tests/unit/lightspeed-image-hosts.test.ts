import { security } from "@/config/security";

import nextConfig from "../../next.config";

describe("Lightspeed image host configuration", () => {
  it("allows Lightspeed hosts in Next image remote patterns", () => {
    const remotePatterns = nextConfig.images?.remotePatterns ?? [];

    expect(remotePatterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          protocol: "https",
          hostname: "**.retail.lightspeed.app",
        }),
        expect.objectContaining({
          protocol: "https",
          hostname: "cdn.shoplightspeed.com",
        }),
      ]),
    );
  });

  it("allows Lightspeed hosts in production CSP img-src", () => {
    const prodCsp = security.proxy.securityHeaders.csp.prod.find((entry) =>
      entry.startsWith("img-src "),
    );

    expect(prodCsp).toContain("https://**.retail.lightspeed.app");
    expect(prodCsp).toContain("https://cdn.shoplightspeed.com");
  });
});
