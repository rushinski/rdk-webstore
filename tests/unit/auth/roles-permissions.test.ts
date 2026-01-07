import {
  canInviteAdmins,
  canViewBank,
  isAdminRole,
  isDevRole,
  isSuperAdminRole,
} from "@/config/constants/roles";

describe("role permissions", () => {
  it("enforces admin role hierarchy", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("super_admin")).toBe(true);
    expect(isAdminRole("dev")).toBe(true);
    expect(isAdminRole("customer")).toBe(false);
  });

  it("enforces super admin and dev roles", () => {
    expect(isSuperAdminRole("super_admin")).toBe(true);
    expect(isSuperAdminRole("dev")).toBe(true);
    expect(isSuperAdminRole("admin")).toBe(false);
  });

  it("enforces dev role", () => {
    expect(isDevRole("dev")).toBe(true);
    expect(isDevRole("admin")).toBe(false);
  });

  it("maps invite and bank permissions", () => {
    expect(canInviteAdmins("admin")).toBe(false);
    expect(canInviteAdmins("super_admin")).toBe(false);
    expect(canInviteAdmins("dev")).toBe(true);
    expect(canViewBank("admin")).toBe(false);
    expect(canViewBank("super_admin")).toBe(true);
    expect(canViewBank("dev")).toBe(true);
  });
});
