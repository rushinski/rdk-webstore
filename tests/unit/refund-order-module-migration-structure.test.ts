import fs from "node:fs";
import path from "node:path";

describe("refund order module migration structure", () => {
  it("makes the refund modal, hook, and view helpers module-owned", () => {
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
    const viewSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/refund-order/refundOrderView.ts",
      ),
      "utf8",
    );
    const typesSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/refund-order/refundOrderTypes.ts",
      ),
      "utf8",
    );

    expect(modalSource).toContain("export function RefundOrderModal");
    expect(hookSource).toContain("export function useRefundOrderState");
    expect(viewSource).toContain("formatRefundMoney");
    expect(typesSource).toContain("export type RefundRequestPayload");
  });

  it("keeps legacy refund paths as thin shims", () => {
    const legacyModalSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/orders/RefundOrderModal.tsx"),
      "utf8",
    );
    const legacyHookSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/orders/useRefundOrderState.ts"),
      "utf8",
    );
    const legacyViewSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/orders/refundOrderView.ts"),
      "utf8",
    );

    expect(legacyModalSource).toContain(
      "@/modules/orders/presentation/admin/refund-order/RefundOrderModal",
    );
    expect(legacyModalSource).toContain(
      "@/modules/orders/presentation/admin/refund-order/refundOrderTypes",
    );
    expect(legacyHookSource).toContain(
      "@/modules/orders/presentation/admin/refund-order/useRefundOrderState",
    );
    expect(legacyViewSource).toContain(
      "@/modules/orders/presentation/admin/refund-order/refundOrderView",
    );
  });
});
