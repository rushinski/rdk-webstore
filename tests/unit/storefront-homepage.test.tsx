import { renderToStaticMarkup } from "react-dom/server";

import HomePage from "../../app/page";

describe("app/page", () => {
  it("renders the solesneakers editorial homepage sections", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("ELEVATED CURATION OF FOOTWEAR");
    expect(html).toContain("BRAND NAME");
    expect(html).toContain("SHOP NOW");
  });
});
