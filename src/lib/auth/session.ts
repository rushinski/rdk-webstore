// src/lib/auth/session.ts
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ProfileRepository,
  type ProfileRole,
  isProfileRole,
  isAdminRole,
} from "@/repositories/profile-repo";

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

async function getServerSessionUncached(): Promise<ServerSession | null> {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error } = await supabase.auth.getUser();
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
