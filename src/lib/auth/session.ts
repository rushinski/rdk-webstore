// src/lib/auth/session.ts
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";
import type { ProfileRole } from "@/config/constants/roles";
import { isAdminRole, isProfileRole } from "@/config/constants/roles";

export interface ServerSession {
  user: {
    id: string;
    email: string;
  };
  profile: {
    id: string;
    email: string;
    role: ProfileRole;
    full_name: string | null;
    tenant_id: string | null;
  } | null;
  role: ProfileRole;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function getServerSessionUncached(): Promise<ServerSession | null> {
  const supabase = await createSupabaseServerClient();

  // ✅ Correct: validates user by contacting Supabase Auth server
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const profileRepo = new ProfileRepository(supabase);
  const row = await profileRepo.getByUserId(user.id);

  const profile = row
    ? {
        id: row.id,
        email: row.email ?? user.email ?? "",
        role: isProfileRole(row.role) ? row.role : "customer",
        full_name: row.full_name ?? null,
        tenant_id: row.tenant_id ?? null,
      }
    : null;

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
    },
    profile,
    role: profile?.role ?? "customer",
  };
}

export const getServerSession = getServerSessionUncached;

/**
 * PAGE GUARDS (Server Components / Pages)
 * These keep your current behavior (redirects).
 */
export async function requireUser(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");
  return session;
}

export async function requireAdmin(): Promise<ServerSession> {
  const session = await requireUser();
  if (!isAdminRole(session.role)) redirect("/");
  return session;
}

/**
 * API GUARDS (Route Handlers)
 * Never redirect inside API routes; throw typed errors with status instead.
 */
export async function requireUserApi(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) throw new AuthError("Unauthorized", 401);
  return session;
}

export async function requireAdminApi(): Promise<ServerSession> {
  const session = await requireUserApi();
  if (!isAdminRole(session.role)) throw new AuthError("Forbidden", 403);
  return session;
}
