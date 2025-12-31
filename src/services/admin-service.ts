import type { TypedSupabaseClient } from "@/lib/supabase/server";
import {
  ProfileRepository,
  type ProfileRole,
  isProfileRole,
  isSuperAdminRole,
  isDevRole,
} from "@/repositories/profile-repo";

export class AdminService {
  static async promoteUser(
    supabase: TypedSupabaseClient,
    targetUserId: string,
    targetRole: ProfileRole = "admin"
  ) {

    // 1. Auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const repo = new ProfileRepository(supabase);

    // 2. Load caller profile
    const callerProfile = await repo.getByUserId(user.id);
    const callerRole = isProfileRole(callerProfile?.role) ? callerProfile.role : "customer";
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
