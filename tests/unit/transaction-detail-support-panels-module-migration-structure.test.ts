import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("transaction detail support panels module migration structure", () => {
  it("makes email checklist and payment event support panels module-owned", () => {
    const modulePaths = [
      "src/modules/orders/presentation/admin/transaction-detail/EmailChecklistSection.tsx",
      "src/modules/orders/presentation/admin/transaction-detail/PaymentEventSummaryPanel.tsx",
      "src/modules/orders/presentation/admin/transaction-detail/PaymentEventRelatedLogsPanel.tsx",
    ];

    for (const modulePath of modulePaths) {
      expect(read(modulePath)).toContain("export function");
    }
  });

  it("keeps the legacy support panel paths as thin shims", () => {
    const legacyPaths = [
      "src/components/admin/transactions/order-details/EmailChecklistSection.tsx",
      "src/components/admin/transactions/order-details/PaymentEventSummaryPanel.tsx",
      "src/components/admin/transactions/order-details/PaymentEventRelatedLogsPanel.tsx",
    ];

    for (const legacyPath of legacyPaths) {
      expect(read(legacyPath)).toContain(
        "@/modules/orders/presentation/admin/transaction-detail/",
      );
    }
  });
});
