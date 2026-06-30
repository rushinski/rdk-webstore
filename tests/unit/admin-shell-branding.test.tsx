import { renderToStaticMarkup } from "react-dom/server";

import { AdminTopbar } from "@/components/admin/AdminTopbar";

describe("AdminTopbar", () => {
  it("renders solesneakers admin branding", () => {
    const html = renderToStaticMarkup(<AdminTopbar />);

    expect(html).toContain("solesneakers");
  });
});
