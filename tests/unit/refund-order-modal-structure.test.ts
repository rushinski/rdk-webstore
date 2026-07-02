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
    const modalSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/orders/RefundOrderModal.tsx"),
      "utf8",
    );
    const hookSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/orders/useRefundOrderState.ts"),
      "utf8",
    );

    expect(modalSource).toContain("@/components/admin/orders/refundOrderView");
    expect(modalSource).toContain("formatRefundMoney(");
    expect(hookSource).toContain("@/components/admin/orders/refundOrderView");
    expect(hookSource).toContain("toRefundCents(");
  });

  it("delegates refund mode state and validation to a focused hook and tabs component", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/orders/RefundOrderModal.tsx"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/orders/useRefundOrderState");
    expect(source).toContain("@/components/admin/orders/RefundModeTabs");
    expect(source).toContain("useRefundOrderState(");
    expect(source).toContain("<RefundModeTabs");
  });
});
