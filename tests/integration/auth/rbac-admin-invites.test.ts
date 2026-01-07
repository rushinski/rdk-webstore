import { resetDatabase, seedBaseData } from "@/tests/helpers/db";
import { createUserWithProfile, signInUser, createAdminClient } from "@/tests/helpers/supabase";

describe("RBAC admin invites and payout settings", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  it("allows dev to create invites and blocks admin/super_admin", async () => {
    const devUser = await createUserWithProfile({
      email: "dev@test.com",
      password: "Password123!",
      role: "dev",
    });
    await createUserWithProfile({
      email: "super@test.com",
      password: "Password123!",
      role: "super_admin",
    });
    await createUserWithProfile({
      email: "admin@test.com",
      password: "Password123!",
      role: "admin",
    });

    const devSession = await signInUser("dev@test.com", "Password123!");
    const superSession = await signInUser("super@test.com", "Password123!");
    const adminSession = await signInUser("admin@test.com", "Password123!");

    const { error: devError } = await devSession.client.from("admin_invites").insert({
      created_by: devUser.id,
      role: "admin",
      token_hash: "token-dev-1",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(devError).toBeNull();

    const { error: superError } = await superSession.client.from("admin_invites").insert({
      created_by: superSession.user?.id,
      role: "admin",
      token_hash: "token-super-1",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(superError).not.toBeNull();

    const { error: adminError } = await adminSession.client.from("admin_invites").insert({
      created_by: adminSession.user?.id,
      role: "admin",
      token_hash: "token-admin-1",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(adminError).not.toBeNull();
  });

  it("restricts payout settings to super_admin/dev only", async () => {
    await createUserWithProfile({
      email: "super@test.com",
      password: "Password123!",
      role: "super_admin",
    });
    await createUserWithProfile({
      email: "admin@test.com",
      password: "Password123!",
      role: "admin",
    });

    const superSession = await signInUser("super@test.com", "Password123!");
    const adminSession = await signInUser("admin@test.com", "Password123!");

    const { data: superProfile } = await createAdminClient()
      .from("profiles")
      .select("id")
      .eq("email", "super@test.com")
      .single();

    const { error: insertError } = await superSession.client
      .from("payout_settings")
      .insert({
        primary_admin_id: superProfile?.id,
        provider: "stripe",
        account_label: "Test",
        account_last4: "4242",
      });
    expect(insertError).toBeNull();

    const { data: adminRows } = await adminSession.client
      .from("payout_settings")
      .select("id");
    expect(adminRows ?? []).toHaveLength(0);
  });
});
