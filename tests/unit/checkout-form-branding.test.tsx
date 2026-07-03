jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock("@/components/checkout/SavedAddresses", () => ({
  SavedAddresses: () => "saved-addresses",
}));

import { renderToStaticMarkup } from "react-dom/server";

import { CheckoutForm } from "@/components/checkout/CheckoutForm";

describe("CheckoutForm", () => {
  it("renders the solesneakers checkout section without legacy red checkout chrome", () => {
    const html = renderToStaticMarkup(
      <CheckoutForm
        orderId="order-1"
        items={[]}
        displayTotal={250}
        fulfillment="pickup"
        shippingAddress={null}
        onShippingAddressChange={() => undefined}
        onFulfillmentChange={() => undefined}
        guestEmail="guest@example.com"
        onGuestEmailChange={() => undefined}
        isGuestCheckout
      />,
    );

    expect(html).toContain("null@gmail.com");
    expect(html).toContain("Secure checkout");
    expect(html).toContain("Submit Order");
    expect(html).toContain("bg-brand-surface");
    expect(html).not.toContain("bg-red-600");
    expect(html).not.toContain("text-red-500");
    expect(html).not.toContain("text-zinc-500");
    expect(html).not.toContain("pickup chat");
  });
});
