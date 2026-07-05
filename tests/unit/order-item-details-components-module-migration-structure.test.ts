import fs from "node:fs";
import path from "node:path";

describe("order item details components module migration structure", () => {
  it("makes image gallery and metadata panel module-owned", () => {
    const imageGallerySource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/order-item-details/OrderItemImageGallery.tsx",
      ),
      "utf8",
    );
    const metadataPanelSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/presentation/admin/order-item-details/OrderItemMetadataPanel.tsx",
      ),
      "utf8",
    );

    expect(imageGallerySource).toContain("export function OrderItemImageGallery");
    expect(metadataPanelSource).toContain("export function OrderItemMetadataPanel");
  });

  it("removes legacy order item detail component duplicates after module migration", () => {
    const legacyPaths = [
      "src/components/admin/orders/OrderItemImageGallery.tsx",
      "src/components/admin/orders/OrderItemMetadataPanel.tsx",
    ];

    for (const legacyPath of legacyPaths) {
      expect(fs.existsSync(path.join(process.cwd(), legacyPath))).toBe(false);
    }
  });
});
