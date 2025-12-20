// src/services/session-service.ts

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRepository, type ProfileRole } from "@/repositories/profile-repo";

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
  } | null;
  role: ProfileRole;
}

export async function getServerSession(): Promise<ServerSession | null> {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) return null;

  const profileRepo = new ProfileRepository(supabase);
  const profile = await profileRepo.getByUserId(user.id);

  return {
    user: {
      id: user.id,
      email: user.email || '',
    },
    profile,
    role: profile?.role || 'customer',
  };
}

export async function requireUser(): Promise<ServerSession> {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/auth/login');
  }
  
  return session;
}

export async function requireAdmin(): Promise<ServerSession> {
  const session = await requireUser();
  
  if (session.role !== 'admin') {
    redirect('/');
  }
  
  return session;
}