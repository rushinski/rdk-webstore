import fs from "node:fs";
import path from "node:path";

describe("refund order modal structure", () => {
  it("delegates refund product selection and custom amount entry to focused components", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/refund-order/RefundOrderModal.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/orders/presentation/admin/refund-order/RefundProductSelectionPanel",
    );
    expect(source).toContain(
      "@/modules/orders/presentation/admin/refund-order/RefundCustomAmountPanel",
    );
    expect(source).toContain("<RefundProductSelectionPanel");
    expect(source).toContain("<RefundCustomAmountPanel");
  });

  it("delegates refund money and item helpers to a focused view module", () => {
    const modalSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/refund-order/RefundOrderModal.tsx",
      ),
      "utf8",
    );
    const hookSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/refund-order/useRefundOrderState.ts",
      ),
      "utf8",
    );

    expect(modalSource).toContain(
      "@/modules/orders/presentation/admin/refund-order/refundOrderView",
    );
    expect(modalSource).toContain("formatRefundMoney(");
    expect(hookSource).toContain(
      "@/modules/orders/presentation/admin/refund-order/refundOrderView",
    );
    expect(hookSource).toContain("toRefundCents(");
  });

  it("delegates refund mode state and validation to a focused hook and tabs component", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/refund-order/RefundOrderModal.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/orders/presentation/admin/refund-order/useRefundOrderState",
    );
    expect(source).toContain(
      "@/modules/orders/presentation/admin/refund-order/RefundModeTabs",
    );
    expect(source).toContain("useRefundOrderState(");
    expect(source).toContain("<RefundModeTabs");
  });
});
