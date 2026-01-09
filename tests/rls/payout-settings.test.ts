// tests/rls/payout-settings.test.ts
import { describe, it, expect, beforeEach } from "@jest/globals";
import { resetDatabase, seedBaseData } from "../helpers/db";
import {
  createUserWithProfile,
  signInUser,
  createAdminClient,
} from "../helpers/supabase";

describe("RLS: Payout Settings Table", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Read Access", () => {
    it("super_admin can read payout settings", async () => {
      const superAdmin = await createUserWithProfile({
        email: "super@test.com",
        password: "Password123!",
        role: "super_admin",
      });

      const adminClient = createAdminClient();
      const { data: settings } = await adminClient
        .from("payout_settings")
        .insert({
          primary_admin_id: superAdmin.id,
          provider: "stripe",
          account_label: "Test Account",
          account_last4: "1234",
        })
        .select()
        .single();

      const { client } = await signInUser("super@test.com", "Password123!");

      const { data, error } = await client
        .from("payout_settings")
        .select("*")
        .eq("id", settings.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    });

    it("dev can read payout settings", async () => {
      const dev = await createUserWithProfile({
        email: "dev@test.com",
        password: "Password123!",
        role: "dev",
      });

      const adminClient = createAdminClient();
      const { data: settings } = await adminClient
        .from("payout_settings")
        .insert({
          primary_admin_id: dev.id,
          provider: "stripe",
          account_label: "Test Account",
          account_last4: "1234",
        })
        .select()
        .single();

      const { client } = await signInUser("dev@test.com", "Password123!");

      const { data, error } = await client
        .from("payout_settings")
        .select("*")
        .eq("id", settings.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    });

    it("admin cannot read payout settings", async () => {
      const admin = await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const { client } = await signInUser("admin@test.com", "Password123!");

      const { data, error } = await client
        .from("payout_settings")
        .select("*");

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it("customer cannot read payout settings", async () => {
      const customer = await createUserWithProfile({
        email: "customer@test.com",
        password: "Password123!",
        role: "customer",
      });

      const { client } = await signInUser("customer@test.com", "Password123!");

      const { data, error } = await client
        .from("payout_settings")
        .select("*");

      expect(error).not.toBeNull();
    });
  });

  describe("Write Access", () => {
    it("super_admin can insert payout settings", async () => {
      const superAdmin = await createUserWithProfile({
        email: "super@test.com",
        password: "Password123!",
        role: "super_admin",
      });

      const { client } = await signInUser("super@test.com", "Password123!");

      const { error } = await client.from("payout_settings").insert({
        primary_admin_id: superAdmin.id,
        provider: "stripe",
        account_label: "Test",
        account_last4: "5678",
      });

      expect(error).toBeNull();
    });

    it("dev can insert payout settings", async () => {
      const dev = await createUserWithProfile({
        email: "dev@test.com",
        password: "Password123!",
        role: "dev",
      });

      const { client } = await signInUser("dev@test.com", "Password123!");

      const { error } = await client.from("payout_settings").insert({
        primary_admin_id: dev.id,
        provider: "stripe",
        account_label: "Test",
        account_last4: "5678",
      });

      expect(error).toBeNull();
    });

    it("admin cannot insert payout settings", async () => {
      const admin = await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const { client } = await signInUser("admin@test.com", "Password123!");

      const { error } = await client.from("payout_settings").insert({
        primary_admin_id: admin.id,
        provider: "stripe",
        account_label: "Test",
        account_last4: "5678",
      });

      expect(error).not.toBeNull();
    });
  });
});