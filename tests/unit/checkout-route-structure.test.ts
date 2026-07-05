import fs from "node:fs";
import path from "node:path";

describe("checkout route structure", () => {
  it("routes checkout gate through the checkout module boundary", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/checkout/page.tsx"), "utf8");

    expect(source).toContain("@/modules/checkout");
    expect(source).toContain("<CheckoutGatePageContent />");
  });

  it("routes checkout start through the checkout module boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/checkout/start/page.tsx"),
      "utf8",
    );

    expect(source).toContain("@/modules/checkout");
    expect(source).toContain("<CheckoutStartPageContent />");
  });
});
