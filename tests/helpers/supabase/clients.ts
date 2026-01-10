// tests/helpers/supabase/clients.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { ProfileRole } from "@/config/constants/roles";
import { testConfig } from "../config";

export const createAdminClient = () =>
  createClient<Database>(testConfig.supabase.url, testConfig.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export const createAnonClient = () =>
  createClient<Database>(testConfig.supabase.url, testConfig.supabase.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export async function createUserWithProfile(params: {
  email: string;
  password: string;
  role?: ProfileRole;
  tenantId?: string | null;
  isPrimaryAdmin?: boolean;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw error ?? new Error("Failed to create user");
  }

  const profileInsert = {
    id: data.user.id,
    email: params.email,
    role: params.role ?? "customer",
    tenant_id: params.tenantId ?? null,
    is_primary_admin: params.isPrimaryAdmin ?? false,
  };

  const { error: profileError } = await admin.from("profiles").insert(profileInsert);
  if (profileError) throw profileError;

  return data.user;
}

export async function signInUser(email: string, password: string) {
  const client = createAnonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client, user: data.user };
}
