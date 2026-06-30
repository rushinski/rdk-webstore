import { renderToStaticMarkup } from "react-dom/server";

import { StorefrontHeader } from "@/components/storefront/shell/StorefrontHeader";

describe("StorefrontHeader", () => {
  it("renders the solesneakers shell links", () => {
    const html = renderToStaticMarkup(
      <StorefrontHeader
        isAuthenticated={false}
        userEmail={null}
        role={null}
        cartCount={0}
      />,
    );

    expect(html).toContain("LOGIN");
    expect(html).toContain("SEARCH");
    expect(html).toContain("CART (0)");
    expect(html).toContain("solesneakers");
  });
});
