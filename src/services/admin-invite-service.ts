// src/services/admin-invite-service.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { AdminSupabaseClient } from "@/lib/supabase/service-role";
import { AdminInvitesRepository } from "@/repositories/admin-invites-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import type { ProfileRole } from "@/config/constants/roles";
import { canInviteAdmins, isProfileRole } from "@/config/constants/roles";
import { generatePublicToken, hashString } from "@/lib/utils/crypto";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const ROLE_PRIORITY: Record<ProfileRole, number> = {
  customer: 0,
  seller: 0,
  admin: 1,
  super_admin: 2,
  dev: 3,
};

export class AdminInviteService {
  constructor(
    private readonly supabase: TypedSupabaseClient,
    private readonly adminSupabase: AdminSupabaseClient,
  ) {}

  async createInvite(input: { userId: string; role: "admin" | "super_admin" }) {
    const profileRepo = new ProfileRepository(this.supabase);
    const profile = await profileRepo.getByUserId(input.userId);
    const callerRole = isProfileRole(profile?.role) ? profile!.role : "customer";

    if (!canInviteAdmins(callerRole)) {
      throw new Error("Forbidden");
    }

    const token = generatePublicToken();
    const tokenHash = hashString(token);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

    const inviteRepo = new AdminInvitesRepository(this.supabase);
    const invite = await inviteRepo.createInvite({
      createdBy: input.userId,
      role: input.role,
      tokenHash,
      expiresAt,
    });

    return { invite, token };
  }

  async acceptInvite(input: { userId: string; userEmail: string; token: string }) {
    const tokenHash = hashString(input.token);
    const inviteRepo = new AdminInvitesRepository(this.adminSupabase);
    const invite = await inviteRepo.getByTokenHash(tokenHash);

    if (!invite) {
      throw new Error("Invite not found");
    }
    if (invite.used_at) {
      throw new Error("Invite already used");
    }

    const expiresAt = new Date(invite.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      throw new Error("Invite expired");
    }

    const profileRepo = new ProfileRepository(this.adminSupabase);
    await profileRepo.ensureProfile(input.userId, input.userEmail);

    const profile = await profileRepo.getByUserId(input.userId);
    const currentRole = isProfileRole(profile?.role) ? profile!.role : "customer";

    const targetRole = invite.role === "super_admin" ? "super_admin" : "admin";
    const nextRole =
      ROLE_PRIORITY[targetRole] > ROLE_PRIORITY[currentRole] ? targetRole : currentRole;

    if (nextRole !== currentRole) {
      await profileRepo.setRole(input.userId, nextRole);
    }

    await inviteRepo.markUsed(invite.id, input.userId);

    return { role: nextRole };
  }
}
