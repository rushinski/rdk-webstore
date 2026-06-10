jest.mock("next/navigation", () => ({
  unstable_rethrow: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock("@/repositories/profile-repo", () => ({
  ProfileRepository: jest.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";
import { getServerSession } from "@/lib/auth/session";
import { unstable_rethrow } from "next/navigation";

const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);
const mockProfileRepository = jest.mocked(ProfileRepository);
const mockUnstableRethrow = jest.mocked(unstable_rethrow);

describe("getServerSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnstableRethrow.mockImplementation(() => {});
  });

  it("rethrows Next dynamic server errors", async () => {
    const dynamicError = new Error(
      "Dynamic server usage: Route /checkout couldn't be rendered statically because it used `cookies`.",
    );

    mockCreateSupabaseServerClient.mockRejectedValue(dynamicError);
    mockUnstableRethrow.mockImplementation((error) => {
      throw error;
    });

    await expect(getServerSession()).rejects.toBe(dynamicError);
  });

  it("returns null when supabase auth lookup throws", async () => {
    mockCreateSupabaseServerClient.mockRejectedValue(new Error("supabase unavailable"));

    await expect(getServerSession()).resolves.toBeNull();
  });

  it("returns session data when auth lookup succeeds", async () => {
    const mockGetUser = jest.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      },
      error: null,
    });
    const mockGetByUserId = jest.fn().mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      role: "admin",
      full_name: "User One",
      tenant_id: "tenant-1",
    });

    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: mockGetUser,
      },
    } as never);
    mockProfileRepository.mockImplementation(
      () =>
        ({
          getByUserId: mockGetByUserId,
        }) as never,
    );

    await expect(getServerSession()).resolves.toEqual({
      user: {
        id: "user-1",
        email: "user@example.com",
      },
      profile: {
        id: "user-1",
        email: "user@example.com",
        role: "admin",
        full_name: "User One",
        tenant_id: "tenant-1",
      },
      role: "admin",
    });
  });
});
