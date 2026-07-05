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

  it("removes legacy refund-order leaf component duplicates after module migration", () => {
    const legacyPaths = [
      "src/components/admin/orders/RefundModeTabs.tsx",
      "src/components/admin/orders/RefundCustomAmountPanel.tsx",
      "src/components/admin/orders/RefundProductSelectionPanel.tsx",
    ];

    for (const legacyPath of legacyPaths) {
      expect(fs.existsSync(path.join(process.cwd(), legacyPath))).toBe(false);
    }
  });
});
