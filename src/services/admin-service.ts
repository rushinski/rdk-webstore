// src/services/admin-service.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";
import type { ProfileRole } from "@/config/constants/roles";
import { isDevRole, isProfileRole, isSuperAdminRole } from "@/config/constants/roles";

export class AdminService {
  static async promoteUser(
    supabase: TypedSupabaseClient,
    targetUserId: string,
    targetRole: ProfileRole = "admin",
  ) {
    // 1. Auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const repo = new ProfileRepository(supabase);

    // 2. Load caller profile
    const callerProfile = await repo.getByUserId(user.id);
    const callerRole = isProfileRole(callerProfile?.role)
      ? callerProfile.role
      : "customer";
    if (targetRole === "super_admin" && !isDevRole(callerRole)) {
      throw new Error("Forbidden: dev only");
    }
    if (targetRole === "admin" && !isSuperAdminRole(callerRole)) {
      throw new Error("Forbidden: super admin only");
    }

    // 3. Promote target
    await repo.setRole(targetUserId, targetRole);

    return { ok: true };
  }
}
