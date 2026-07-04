import fs from "node:fs";
import path from "node:path";

describe("refund order leaf components module migration structure", () => {
  it("makes the refund leaf panels module-owned", () => {
    const modeTabsSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/refund-order/RefundModeTabs.tsx",
      ),
      "utf8",
    );
    const customAmountSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/refund-order/RefundCustomAmountPanel.tsx",
      ),
      "utf8",
    );
    const productSelectionSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/refund-order/RefundProductSelectionPanel.tsx",
      ),
      "utf8",
    );

    expect(modeTabsSource).toContain("export function RefundModeTabs");
    expect(customAmountSource).toContain("export function RefundCustomAmountPanel");
    expect(productSelectionSource).toContain("export function RefundProductSelectionPanel");
  });

  it("keeps legacy leaf component paths as thin shims", () => {
    const legacyModeTabsSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/orders/RefundModeTabs.tsx"),
      "utf8",
    );
    const legacyCustomAmountSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/orders/RefundCustomAmountPanel.tsx"),
      "utf8",
    );
    const legacyProductSelectionSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/orders/RefundProductSelectionPanel.tsx"),
      "utf8",
    );

    expect(legacyModeTabsSource).toContain(
      "@/modules/orders/presentation/admin/refund-order/RefundModeTabs",
    );
    expect(legacyCustomAmountSource).toContain(
      "@/modules/orders/presentation/admin/refund-order/RefundCustomAmountPanel",
    );
    expect(legacyProductSelectionSource).toContain(
      "@/modules/orders/presentation/admin/refund-order/RefundProductSelectionPanel",
    );
  });
});
