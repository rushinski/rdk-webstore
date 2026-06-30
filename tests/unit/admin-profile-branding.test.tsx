import { renderToStaticMarkup } from "react-dom/server";

import AdminProfilePage from "../../app/admin/profile/page";

describe("admin profile branding", () => {
  it("renders the loading view on shared admin surfaces", () => {
    const html = renderToStaticMarkup(<AdminProfilePage />);

    expect(html).toContain("Your Admin Settings");
    expect(html).toContain("border-brand-border");
    expect(html).toContain("text-brand-muted");
    expect(html).not.toContain("bg-zinc-900");
    expect(html).not.toContain("text-gray-400");
  });
});
