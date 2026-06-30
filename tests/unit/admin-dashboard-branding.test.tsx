import { renderToStaticMarkup } from "react-dom/server";

import DashboardPage from "../../app/admin/dashboard/page";

describe("app/admin/dashboard/page", () => {
  it("renders the admin overview framing", () => {
    const html = renderToStaticMarkup(<DashboardPage />);

    expect(html).toContain("Dashboard");
    expect(html).not.toContain("bg-zinc-900");
  });
});
