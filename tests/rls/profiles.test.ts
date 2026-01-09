// tests/rls/profiles.test.ts
import { describe, it, expect, beforeEach } from "@jest/globals";
import { resetDatabase, seedBaseData } from "../helpers/db";
import {
  createUserWithProfile,
  signInUser,
  createAdminClient,
} from "../helpers/supabase";

describe("RLS: Profiles Table", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Read Access", () => {
    it("user can read own profile", async () => {
      const user = await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const { client } = await signInUser("user@test.com", "Password123!");

      const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.id).toBe(user.id);
    });

    it("user cannot read other user profiles", async () => {
      const user1 = await createUserWithProfile({
        email: "user1@test.com",
        password: "Password123!",
        role: "customer",
      });

      const user2 = await createUserWithProfile({
        email: "user2@test.com",
        password: "Password123!",
        role: "customer",
      });

      const { client } = await signInUser("user1@test.com", "Password123!");

      const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", user2.id)
        .single();

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it("admin can read all profiles", async () => {
      const user = await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const admin = await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const { client } = await signInUser("admin@test.com", "Password123!");

      const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    });

    it("anonymous cannot read profiles", async () => {
      const user = await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const anonClient = createAnonClient();

      const { data, error } = await anonClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it("service role can read all profiles", async () => {
      const user = await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const admin = createAdminClient();

      const { data, error } = await admin
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    });
  });

  describe("Update Access", () => {
    it("user can update own profile fields", async () => {
      const user = await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const { client } = await signInUser("user@test.com", "Password123!");

      const { error } = await client
        .from("profiles")
        .update({ full_name: "Test User" })
        .eq("id", user.id);

      expect(error).toBeNull();
    });

    it("user cannot update own role", async () => {
      const user = await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const { client } = await signInUser("user@test.com", "Password123!");

      const { error } = await client
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", user.id);

      expect(error).not.toBeNull();
    });

    it("user cannot update other user profiles", async () => {
      const user1 = await createUserWithProfile({
        email: "user1@test.com",
        password: "Password123!",
        role: "customer",
      });

      const user2 = await createUserWithProfile({
        email: "user2@test.com",
        password: "Password123!",
        role: "customer",
      });

      const { client } = await signInUser("user1@test.com", "Password123!");

      const { error } = await client
        .from("profiles")
        .update({ full_name: "Hacked" })
        .eq("id", user2.id);

      expect(error).not.toBeNull();
    });

    it("admin cannot escalate own role to dev", async () => {
      const admin = await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const { client } = await signInUser("admin@test.com", "Password123!");

      const { error } = await client
        .from("profiles")
        .update({ role: "dev" })
        .eq("id", admin.id);

      expect(error).not.toBeNull();
    });

    it("service role can update any profile", async () => {
      const user = await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const admin = createAdminClient();

      const { error } = await admin
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", user.id);

      expect(error).toBeNull();
    });
  });

  describe("Delete Access", () => {
    it("user cannot delete own profile", async () => {
      const user = await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const { client } = await signInUser("user@test.com", "Password123!");

      const { error } = await client
        .from("profiles")
        .delete()
        .eq("id", user.id);

      expect(error).not.toBeNull();
    });

    it("user cannot delete other profiles", async () => {
      const user1 = await createUserWithProfile({
        email: "user1@test.com",
        password: "Password123!",
        role: "customer",
      });

      const user2 = await createUserWithProfile({
        email: "user2@test.com",
        password: "Password123!",
        role: "customer",
      });

      const { client } = await signInUser("user1@test.com", "Password123!");

      const { error } = await client
        .from("profiles")
        .delete()
        .eq("id", user2.id);

      expect(error).not.toBeNull();
    });

    it("admin cannot delete profiles", async () => {
      const user = await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const admin = await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const { client } = await signInUser("admin@test.com", "Password123!");

      const { error } = await client
        .from("profiles")
        .delete()
        .eq("id", user.id);

      expect(error).not.toBeNull();
    });

    it("service role can delete profiles", async () => {
      const user = await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const admin = createAdminClient();

      const { error } = await admin
        .from("profiles")
        .delete()
        .eq("id", user.id);

      expect(error).toBeNull();
    });
  });

  describe("Insert Access", () => {
    it("users cannot insert profiles directly", async () => {
      const user = await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const { client } = await signInUser("user@test.com", "Password123!");

      const { error } = await client.from("profiles").insert({
        id: "new-user-id",
        email: "newuser@test.com",
        role: "admin",
      });

      expect(error).not.toBeNull();
    });

    it("service role can insert profiles", async () => {
      const admin = createAdminClient();

      const { error } = await admin.from("profiles").insert({
        id: "new-user-id",
        email: "newuser@test.com",
        role: "customer",
      });

      expect(error).toBeNull();
    });
  });

  describe("Tenant Isolation", () => {
    it("enforces tenant isolation", async () => {
      const baseData = await seedBaseData();
      
      // Create second tenant
      const admin = createAdminClient();
      const { data: tenant2 } = await admin
        .from("tenants")
        .insert({ name: "Tenant 2" })
        .select()
        .single();

      const user1 = await createUserWithProfile({
        email: "user1@test.com",
        password: "Password123!",
        role: "customer",
        tenantId: baseData.tenantId,
      });

      const user2 = await createUserWithProfile({
        email: "user2@test.com",
        password: "Password123!",
        role: "customer",
        tenantId: tenant2.id,
      });

      const { client } = await signInUser("user1@test.com", "Password123!");

      const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", user2.id)
        .single();

      // Should not be able to access different tenant
      expect(error).not.toBeNull();
    });
  });
});