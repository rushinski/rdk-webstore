import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRepository } from "@/repositories/profile-repo";

export class AdminService {
  static async promoteUser(targetUserId: string) {
    const supabase = await createSupabaseServerClient();

    // 1. Auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const repo = new ProfileRepository(supabase);

    // 2. Load caller profile
    const callerProfile = await repo.getByUserId(user.id);
    if (!callerProfile || callerProfile.role !== "admin") {
      throw new Error("Forbidden: admin only");
    }

    // 3. Promote target
    await repo.setRole(targetUserId, "admin");

    return { ok: true };
  }
}
