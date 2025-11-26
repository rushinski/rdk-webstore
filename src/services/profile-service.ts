// src/services/profile-service.ts

import type { ProfilesRepo } from "@/repositories/profiles-repo";
import { z } from "zod";

const updateProfileSchema = z.object({
  display_name: z.string().min(1).optional(),
  avatar_url: z.string().url().optional(),
  twofa_enabled: z.boolean().optional(),
});

export class ProfileService {
  private profiles: ProfilesRepo;
  private requestId?: string;
  private userId?: string | null;

  constructor(opts: {
    repos: {
      profiles: ProfilesRepo;
    };
    requestId?: string;
    userId?: string | null;
  }) {
    this.profiles = opts.repos.profiles;
    this.requestId = opts.requestId;
    this.userId = opts.userId;
  }

  async getSelf() {
    if (!this.userId) throw new Error("Unauthorized");
    return this.profiles.getById(this.userId);
  }

  async updateSelf(input: z.infer<typeof updateProfileSchema>) {
    if (!this.userId) throw new Error("Unauthorized");

    const validated = updateProfileSchema.parse(input);
    return this.profiles.update(this.userId, validated);
  }

  async isAdmin() {
    if (!this.userId) return false;
    return this.profiles.isAdmin(this.userId);
  }
}
