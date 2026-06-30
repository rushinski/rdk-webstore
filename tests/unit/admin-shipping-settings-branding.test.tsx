import { renderToStaticMarkup } from "react-dom/server";

import { ShippingSettingsModalShell } from "../../app/admin/settings/shipping/page";

describe("admin shipping settings branding", () => {
  it("renders modal content on shared admin surfaces", () => {
    const html = renderToStaticMarkup(
      <ShippingSettingsModalShell
        title="Edit Package Defaults"
        description="Sneakers defaults"
        onClose={() => {}}
      >
        <div>Body</div>
      </ShippingSettingsModalShell>,
    );

    expect(html).toContain("Edit Package Defaults");
    expect(html).toContain("Sneakers defaults");
    expect(html).toContain("brand-surface");
    expect(html).toContain("border-brand-border");
    expect(html).not.toContain("bg-zinc-900");
    expect(html).not.toContain("text-gray-400");
  });
});
