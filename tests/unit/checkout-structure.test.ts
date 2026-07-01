import fs from "node:fs";
import path from "node:path";

describe("checkout structure", () => {
  it("delegates fulfillment selection to a focused checkout fulfillment section", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/checkout/CheckoutForm.tsx"),
      "utf8",
    );

    expect(source).toContain("./CheckoutFulfillmentSection");
    expect(source).toContain("<CheckoutFulfillmentSection");
  });

  it("delegates guest contact collection to a focused checkout guest contact section", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/checkout/CheckoutForm.tsx"),
      "utf8",
    );

    expect(source).toContain("./CheckoutGuestContactSection");
    expect(source).toContain("<CheckoutGuestContactSection");
  });

  it("delegates checkout submission feedback and legal copy to a focused footer section", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/checkout/CheckoutForm.tsx"),
      "utf8",
    );

    expect(source).toContain("./CheckoutFooterSection");
    expect(source).toContain("<CheckoutFooterSection");
  });
});
