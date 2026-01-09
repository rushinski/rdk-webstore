// tests/helpers/database-helpers.ts
import { createAdminClient } from "./supabase";

export async function cleanupTestData(pattern: string) {
  const admin = createAdminClient();
  
  // Clean up test users
  await admin
    .from("profiles")
    .delete()
    .ilike("email", `%${pattern}%`);
}

export async function verifyDatabaseState(
  tableName: string,
  conditions: Record<string, any>
) {
  const admin = createAdminClient();
  
  let query = admin.from(tableName).select("*");
  
  for (const [key, value] of Object.entries(conditions)) {
    query = query.eq(key, value);
  }
  
  const { data, error } = await query;
  
  return { data, error };
}

export async function countRecords(
  tableName: string,
  where?: Record<string, any>
) {
  const admin = createAdminClient();
  
  let query = admin.from(tableName).select("*", { count: "exact", head: true });
  
  if (where) {
    for (const [key, value] of Object.entries(where)) {
      query = query.eq(key, value);
    }
  }
  
  const { count } = await query;
  
  return count || 0;
}

export async function createTestTenant(name: string = "Test Tenant") {
  const admin = createAdminClient();
  
  const { data, error } = await admin
    .from("tenants")
    .insert({ name })
    .select()
    .single();
  
  if (error) throw error;
  
  return data;
}