export const PROFILE_ROLES = ["customer", "admin", "super_admin", "dev"] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export const ADMIN_ROLES = ["admin", "super_admin", "dev"] as const;
export const SUPER_ADMIN_ROLES = ["super_admin", "dev"] as const;

export const ADMIN_PERMISSIONS: Record<
  ProfileRole,
  { canInvite: boolean; canViewBank: boolean }
> = {
  customer: { canInvite: false, canViewBank: false },
  admin: { canInvite: false, canViewBank: false },
  super_admin: { canInvite: false, canViewBank: true },
  dev: { canInvite: true, canViewBank: true },
} as const;

export function isProfileRole(value: unknown): value is ProfileRole {
  return PROFILE_ROLES.includes(value as ProfileRole);
}

export function isAdminRole(role: ProfileRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isSuperAdminRole(role: ProfileRole): boolean {
  return SUPER_ADMIN_ROLES.includes(role);
}

export function isDevRole(role: ProfileRole): boolean {
  return role === "dev";
}

export function canInviteAdmins(role: ProfileRole): boolean {
  return ADMIN_PERMISSIONS[role]?.canInvite ?? false;
}

export function canViewBank(role: ProfileRole): boolean {
  return ADMIN_PERMISSIONS[role]?.canViewBank ?? false;
}
