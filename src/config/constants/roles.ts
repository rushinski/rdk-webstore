// src/config/constants/roles.ts

export const PROFILE_ROLES = ["customer", "seller", "admin", "super_admin", "dev"] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export const ADMIN_ROLES = ["admin", "super_admin", "dev"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const SUPER_ADMIN_ROLES = ["super_admin", "dev"] as const;
export type SuperAdminRole = (typeof SUPER_ADMIN_ROLES)[number];

export const ADMIN_PERMISSIONS: Record<
  ProfileRole,
  { canInvite: boolean; canViewBank: boolean }
> = {
  customer: { canInvite: false, canViewBank: false },
  seller: { canInvite: false, canViewBank: false },
  admin: { canInvite: false, canViewBank: false },
  super_admin: { canInvite: false, canViewBank: true },
  dev: { canInvite: true, canViewBank: true },
} as const;

// Typed includes helper (fixes TS2345 + gives type guards)
function includesConst<T extends readonly string[]>(
  arr: T,
  value: string
): value is T[number] {
  return (arr as readonly string[]).includes(value);
}

export function isProfileRole(value: unknown): value is ProfileRole {
  return typeof value === "string" && includesConst(PROFILE_ROLES, value);
}

export function isAdminRole(role: ProfileRole): role is AdminRole {
  return includesConst(ADMIN_ROLES, role);
}

export function isSuperAdminRole(role: ProfileRole): role is SuperAdminRole {
  return includesConst(SUPER_ADMIN_ROLES, role);
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
