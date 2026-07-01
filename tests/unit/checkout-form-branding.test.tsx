jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock("next/script", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/checkout/SavedAddresses", () => ({
  SavedAddresses: () => "saved-addresses",
}));

jest.mock("@/components/checkout/BillingAddressForm", () => ({
  BillingAddressForm: () => "billing-address-form",
}));

import { renderToStaticMarkup } from "react-dom/server";

import { CheckoutForm } from "@/components/checkout/CheckoutForm";

describe("CheckoutForm", () => {
  it("renders the solesneakers payment section without legacy red checkout chrome", () => {
    const html = renderToStaticMarkup(
      <CheckoutForm
        orderId="order-1"
        tokenizationKey={null}
        items={[]}
        total={250}
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
    expect(html).toContain("Secure payment processing");
    expect(html).toContain("Place Order");
    expect(html).toContain("bg-brand-surface");
    expect(html).not.toContain("bg-red-600");
    expect(html).not.toContain("text-red-500");
    expect(html).not.toContain("text-zinc-500");
    expect(html).not.toContain("pickup chat");
  });
});
