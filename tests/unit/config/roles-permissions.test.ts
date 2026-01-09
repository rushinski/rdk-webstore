// tests/unit/auth/roles-permissions.test.ts
import {
  isAdminRole,
  isSuperAdminRole,
  isDevRole,
  canInviteAdmins,
  canViewBank,
  isProfileRole,
  type ProfileRole,
} from "@/config/constants/roles";

describe("role permissions", () => {
  describe("isAdminRole", () => {
    it("returns true for admin", () => {
      expect(isAdminRole("admin")).toBe(true);
    });

    it("returns true for super_admin", () => {
      expect(isAdminRole("super_admin")).toBe(true);
    });

    it("returns true for dev", () => {
      expect(isAdminRole("dev")).toBe(true);
    });

    it("returns false for customer", () => {
      expect(isAdminRole("customer")).toBe(false);
    });

    it("returns false for seller", () => {
      expect(isAdminRole("seller")).toBe(false);
    });

    it("handles null", () => {
      expect(isAdminRole(null as any)).toBe(false);
    });

    it("handles undefined", () => {
      expect(isAdminRole(undefined as any)).toBe(false);
    });

    it("handles empty string", () => {
      expect(isAdminRole("" as any)).toBe(false);
    });

    it("handles invalid role", () => {
      expect(isAdminRole("invalid" as any)).toBe(false);
    });
  });

  describe("isSuperAdminRole", () => {
    it("returns true for super_admin", () => {
      expect(isSuperAdminRole("super_admin")).toBe(true);
    });

    it("returns true for dev", () => {
      expect(isSuperAdminRole("dev")).toBe(true);
    });

    it("returns false for admin", () => {
      expect(isSuperAdminRole("admin")).toBe(false);
    });

    it("returns false for customer", () => {
      expect(isSuperAdminRole("customer")).toBe(false);
    });
  });

  describe("isDevRole", () => {
    it("returns true for dev", () => {
      expect(isDevRole("dev")).toBe(true);
    });

    it("returns false for super_admin", () => {
      expect(isDevRole("super_admin")).toBe(false);
    });

    it("returns false for admin", () => {
      expect(isDevRole("admin")).toBe(false);
    });

    it("returns false for customer", () => {
      expect(isDevRole("customer")).toBe(false);
    });
  });

  describe("canInviteAdmins", () => {
    it("returns true for dev", () => {
      expect(canInviteAdmins("dev")).toBe(true);
    });

    it("returns false for super_admin", () => {
      expect(canInviteAdmins("super_admin")).toBe(false);
    });

    it("returns false for admin", () => {
      expect(canInviteAdmins("admin")).toBe(false);
    });

    it("returns false for customer", () => {
      expect(canInviteAdmins("customer")).toBe(false);
    });
  });

  describe("canViewBank", () => {
    it("returns true for dev", () => {
      expect(canViewBank("dev")).toBe(true);
    });

    it("returns true for super_admin", () => {
      expect(canViewBank("super_admin")).toBe(true);
    });

    it("returns false for admin", () => {
      expect(canViewBank("admin")).toBe(false);
    });

    it("returns false for customer", () => {
      expect(canViewBank("customer")).toBe(false);
    });
  });

  describe("isProfileRole", () => {
    it("validates all valid roles", () => {
      const validRoles: ProfileRole[] = [
        "customer",
        "seller",
        "admin",
        "super_admin",
        "dev",
      ];

      validRoles.forEach((role) => {
        expect(isProfileRole(role)).toBe(true);
      });
    });

    it("rejects invalid roles", () => {
      const invalidRoles = ["invalid", "user", "moderator", "", null, undefined];

      invalidRoles.forEach((role) => {
        expect(isProfileRole(role as any)).toBe(false);
      });
    });
  });

  describe("Role Hierarchy", () => {
    it("maintains correct permission hierarchy", () => {
      // dev > super_admin > admin > customer/seller

      // Dev can do everything
      expect(isAdminRole("dev")).toBe(true);
      expect(isSuperAdminRole("dev")).toBe(true);
      expect(canInviteAdmins("dev")).toBe(true);
      expect(canViewBank("dev")).toBe(true);

      // Super admin can do most things
      expect(isAdminRole("super_admin")).toBe(true);
      expect(isSuperAdminRole("super_admin")).toBe(true);
      expect(canInviteAdmins("super_admin")).toBe(false);
      expect(canViewBank("super_admin")).toBe(true);

      // Admin has limited permissions
      expect(isAdminRole("admin")).toBe(true);
      expect(isSuperAdminRole("admin")).toBe(false);
      expect(canInviteAdmins("admin")).toBe(false);
      expect(canViewBank("admin")).toBe(false);

      // Customer has no admin permissions
      expect(isAdminRole("customer")).toBe(false);
      expect(isSuperAdminRole("customer")).toBe(false);
      expect(canInviteAdmins("customer")).toBe(false);
      expect(canViewBank("customer")).toBe(false);
    });

    it("ensures no permission gaps", () => {
      const allRoles: ProfileRole[] = [
        "customer",
        "seller",
        "admin",
        "super_admin",
        "dev",
      ];

      allRoles.forEach((role) => {
        // Every role should have defined permissions
        expect(typeof isAdminRole(role)).toBe("boolean");
        expect(typeof canInviteAdmins(role)).toBe("boolean");
        expect(typeof canViewBank(role)).toBe("boolean");
      });
    });
  });
});
