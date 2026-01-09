// tests/rls/admin-invites.test.ts
import { describe, it, expect, beforeEach } from "@jest/globals";
import { resetDatabase, seedBaseData } from "../helpers/db";
import {
  createUserWithProfile,
  signInUser,
  createAdminClient,
} from "../helpers/supabase";

describe("RLS: Admin Invites Table", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Insert Access", () => {
    it("dev can insert invites", async () => {
      const dev = await createUserWithProfile({
        email: "dev@test.com",
        password: "Password123!",
        role: "dev",
      });

      const { client } = await signInUser("dev@test.com", "Password123!");

      const { error } = await client.from("admin_invites").insert({
        created_by: dev.id,
        role: "admin",
        token_hash: "test-token-hash",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      expect(error).toBeNull();
    });

    it("super_admin cannot insert invites", async () => {
      const superAdmin = await createUserWithProfile({
        email: "super@test.com",
        password: "Password123!",
        role: "super_admin",
      });

      const { client } = await signInUser("super@test.com", "Password123!");

      const { error } = await client.from("admin_invites").insert({
        created_by: superAdmin.id,
        role: "admin",
        token_hash: "test-token-hash",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      expect(error).not.toBeNull();
    });

    it("admin cannot insert invites", async () => {
      const admin = await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const { client } = await signInUser("admin@test.com", "Password123!");

      const { error } = await client.from("admin_invites").insert({
        created_by: admin.id,
        role: "admin",
        token_hash: "test-token-hash",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      expect(error).not.toBeNull();
    });
  });

  describe("Read Access", () => {
    it("dev can read own invites", async () => {
      const dev = await createUserWithProfile({
        email: "dev@test.com",
        password: "Password123!",
        role: "dev",
      });

      const adminClient = createAdminClient();
      const { data: invite } = await adminClient
        .from("admin_invites")
        .insert({
          created_by: dev.id,
          role: "admin",
          token_hash: "test-hash",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        })
        .select()
        .single();

      const { client } = await signInUser("dev@test.com", "Password123!");

      const { data, error } = await client
        .from("admin_invites")
        .select("*")
        .eq("id", invite.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    });

    it("dev cannot read other dev invites", async () => {
      const dev1 = await createUserWithProfile({
        email: "dev1@test.com",
        password: "Password123!",
        role: "dev",
      });

      const dev2 = await createUserWithProfile({
        email: "dev2@test.com",
        password: "Password123!",
        role: "dev",
      });

      const adminClient = createAdminClient();
      const { data: invite } = await adminClient
        .from("admin_invites")
        .insert({
          created_by: dev2.id,
          role: "admin",
          token_hash: "test-hash",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        })
        .select()
        .single();

      const { client } = await signInUser("dev1@test.com", "Password123!");

      const { data, error } = await client
        .from("admin_invites")
        .select("*")
        .eq("id", invite.id)
        .single();

      expect(error).not.toBeNull();
    });

    it("admin cannot read invites", async () => {
      const admin = await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const { client } = await signInUser("admin@test.com", "Password123!");

      const { data, error } = await client
        .from("admin_invites")
        .select("*");

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });

  describe("Update/Delete Access", () => {
    it("no one can update invites via RLS", async () => {
      const dev = await createUserWithProfile({
        email: "dev@test.com",
        password: "Password123!",
        role: "dev",
      });

      const adminClient = createAdminClient();
      const { data: invite } = await adminClient
        .from("admin_invites")
        .insert({
          created_by: dev.id,
          role: "admin",
          token_hash: "test-hash",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        })
        .select()
        .single();

      const { client } = await signInUser("dev@test.com", "Password123!");

      const { error } = await client
        .from("admin_invites")
        .update({ role: "super_admin" })
        .eq("id", invite.id);

      expect(error).not.toBeNull();
    });

    it("no one can delete invites via RLS", async () => {
      const dev = await createUserWithProfile({
        email: "dev@test.com",
        password: "Password123!",
        role: "dev",
      });

      const adminClient = createAdminClient();
      const { data: invite } = await adminClient
        .from("admin_invites")
        .insert({
          created_by: dev.id,
          role: "admin",
          token_hash: "test-hash",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        })
        .select()
        .single();

      const { client } = await signInUser("dev@test.com", "Password123!");

      const { error } = await client
        .from("admin_invites")
        .delete()
        .eq("id", invite.id);

      expect(error).not.toBeNull();
    });
  });
});