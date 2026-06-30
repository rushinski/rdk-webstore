import { renderToStaticMarkup } from "react-dom/server";

import AdminErrorPage from "../../app/admin/error";

describe("admin error branding", () => {
  it("renders the admin error view with shared admin tokens", () => {
    const html = renderToStaticMarkup(
      <AdminErrorPage error={new Error("boom")} reset={() => {}} />,
    );

    expect(html).toContain("Admin error");
    expect(html).toContain("text-brand-muted");
    expect(html).toContain("border-brand-border");
    expect(html).not.toContain("bg-zinc-900");
    expect(html).not.toContain("text-zinc-400");
  });
});
