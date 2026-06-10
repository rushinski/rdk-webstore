jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/store-access/get-store-access-settings", () => ({
  getStoreAccessSettings: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/components/checkout/CheckoutLockedNotice", () => ({
  CheckoutLockedNotice: ({ message }: { message: string }) => `locked:${message}`,
}));

jest.mock("@/components/checkout/CheckoutGate", () => ({
  CheckoutGate: () => "checkout-gate",
}));

import CheckoutGatePage from "../../app/checkout/page";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { getStoreAccessSettings } from "@/lib/store-access/get-store-access-settings";

const mockRedirect = jest.mocked(redirect);
const mockGetServerSession = jest.mocked(getServerSession);
const mockGetStoreAccessSettings = jest.mocked(getStoreAccessSettings);

describe("app/checkout/page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStoreAccessSettings.mockResolvedValue(null);
  });

  it("renders the checkout gate when there is no active session", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await CheckoutGatePage();

    expect(result).toMatchObject({
      props: {},
    });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects authenticated users to the checkout start page", async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
      },
      profile: null,
      role: "customer",
    });

    await CheckoutGatePage();

    expect(mockRedirect).toHaveBeenCalledWith("/checkout/start");
  });
});
