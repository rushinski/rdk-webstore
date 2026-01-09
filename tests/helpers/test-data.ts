// tests/helpers/test-data.ts
export const TEST_USERS = {
  customer: {
    email: "customer@test.com",
    password: "CustomerPass123!",
    role: "customer" as const,
  },
  admin: {
    email: "admin@test.com",
    password: "AdminPass123!",
    role: "admin" as const,
  },
  superAdmin: {
    email: "super@test.com",
    password: "SuperPass123!",
    role: "super_admin" as const,
  },
  dev: {
    email: "dev@test.com",
    password: "DevPass123!",
    role: "dev" as const,
  },
};

export const VALID_PASSWORDS = [
  "Password123!",
  "SecureP@ss2024",
  "MyP@ssw0rd",
  "C0mpl3x!Pass",
  "Test1234!@#$",
];

export const INVALID_PASSWORDS = [
  "short",
  "12345678",
  "aaaaaaaa",
  "password",
  "",
];

export const VALID_EMAILS = [
  "user@example.com",
  "test.user@example.com",
  "user+tag@example.com",
  "user@sub.example.com",
];

export const INVALID_EMAILS = [
  "invalid",
  "@example.com",
  "user@",
  "user @example.com",
  "",
];