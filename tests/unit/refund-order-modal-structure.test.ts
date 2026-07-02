import fs from "node:fs";
import path from "node:path";

describe("refund order modal structure", () => {
  it("delegates refund product selection and custom amount entry to focused components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/orders/RefundOrderModal.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/orders/RefundProductSelectionPanel");
    expect(source).toContain("@/components/admin/orders/RefundCustomAmountPanel");
    expect(source).toContain("<RefundProductSelectionPanel");
    expect(source).toContain("<RefundCustomAmountPanel");
  });

  it("delegates refund money and item helpers to a focused view module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/orders/RefundOrderModal.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/orders/refundOrderView");
    expect(source).toContain("formatRefundMoney(");
    expect(source).toContain("toRefundCents(");
  });
});
