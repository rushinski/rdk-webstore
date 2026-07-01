import { renderToStaticMarkup } from "react-dom/server";

import { InventoryClientHeaderActions } from "@/components/admin/inventory/InventoryClientHeaderActions";

describe("InventoryClientHeaderActions", () => {
  it("renders export and create product controls", () => {
    const html = renderToStaticMarkup(
      <InventoryClientHeaderActions onExport={() => {}} />,
    );

    expect(html).toContain("Export Inventory");
    expect(html).toContain("/admin/inventory/create");
    expect(html).toContain("Create Product");
  });
});
