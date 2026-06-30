jest.mock("@/components/cart/CartProvider", () => ({
  useCart: () => ({
    addItem: jest.fn(),
    items: [],
  }),
}));

import { renderToStaticMarkup } from "react-dom/server";

import { ProductDetail } from "@/components/store/ProductDetail";

const product = {
  id: "product-1",
  name: "Sample Product",
  brand: "Brand Name",
  condition: "new",
  description: "Sample description",
  images: [{ id: "img-1", url: "/sample.jpg", is_primary: true }],
  variants: [{ id: "var-1", size_label: "10", sale_price_cents: 25000, stock: 2 }],
  tags: [],
};

describe("ProductDetail", () => {
  it("renders the two-column solesneakers layout", () => {
    const html = renderToStaticMarkup(<ProductDetail product={product as never} />);

    expect(html).toContain("Sample Product");
    expect(html).toContain("ADD TO CART");
  });
});
