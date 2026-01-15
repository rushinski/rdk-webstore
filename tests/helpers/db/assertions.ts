// tests/helpers/db/assertions.ts
import { expect } from "@jest/globals";
import { createAdminClient } from "../supabase/clients";
import type { Database } from "@/types/db/database.types";
import { resetDatabase, seedBaseData, resetAndSeed } from "./lifecycle";

export { resetDatabase, seedBaseData, resetAndSeed };

// NOTE: Most Supabase generated types look like Database["public"]["Tables"]
type PublicTables = Database["public"]["Tables"];
export type TableName = keyof PublicTables & string;
type Row<T extends TableName> = PublicTables[T]["Row"];

export async function fetchRecords<T extends TableName>(
  tableName: T,
  where?: Partial<Row<T>>,
): Promise<Row<T>[]> {
  const admin = createAdminClient();
  let query = admin.from(tableName).select("*");

  if (where) {
    for (const [key, value] of Object.entries(where)) {
      query = query.eq(key as string, value as any);
    }
  }

  const { data, error } = await query.overrideTypes<Row<T>[], { merge: false }>();
  if (error) throw error;

  return data ?? [];
}

export async function countRecords<T extends TableName>(
  tableName: T,
  where?: Partial<Row<T>>,
): Promise<number> {
  const admin = createAdminClient();
  let query = admin.from(tableName).select("*", { count: "exact", head: true });

  if (where) {
    for (const [key, value] of Object.entries(where)) {
      query = query.eq(key as string, value as any);
    }
  }

  const { count, error } = await query.overrideTypes<null, { merge: false }>();
  if (error) throw error;

  return count ?? 0;
}

export async function expectRecordExists<T extends TableName>(
  tableName: T,
  where: Partial<Row<T>>,
) {
  const rows = await fetchRecords(tableName, where);
  expect(rows.length).toBeGreaterThan(0);
  return rows[0];
}

export async function expectRecordNotExists<T extends TableName>(
  tableName: T,
  where: Partial<Row<T>>,
) {
  const rows = await fetchRecords(tableName, where);
  expect(rows.length).toBe(0);
}

export async function cleanupByEmailPattern(pattern: string) {
  const admin = createAdminClient();

  const { error } = await admin.from("profiles").delete().ilike("email", `%${pattern}%`);

  if (error) throw error;
}

export async function createTestTenant(name: string = "Test Tenant") {
  const admin = createAdminClient();

  const { data, error } = await admin.from("tenants").insert({ name }).select().single();

  if (error) throw error;
  return data;
}
