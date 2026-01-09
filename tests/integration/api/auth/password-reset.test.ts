// tests/integration/api/auth/password-reset.test.ts (continued from existing)
import { Client } from "pg";
import { resetDatabase, seedBaseData } from "../../../helpers/db";
import {
  createAdminClient,
  createUserWithProfile,
  createAnonClient,
} from "../../../helpers/supabase";

const dbUrl = process.env.SUPABASE_DB_URL ?? "";

async function expireRecoveryToken(hashedToken: string) {
  if (!dbUrl) throw new Error("SUPABASE_DB_URL missing");
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query(
      "update auth.one_time_tokens set created_at = now() - interval '2 hours' where token_hash = $1",
      [hashedToken]
    );
  } finally {
    await client.end();
  }
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Successful Requests", () => {
    it("sends reset code for existing user", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch(
        "http://localhost:3000/api/auth/forgot-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "user@test.com" }),
        }
      );

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
    });

    it("trims whitespace from email", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch(
        "http://localhost:3000/api/auth/forgot-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "  user@test.com  " }),
        }
      );

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
    });
  });

  describe("Validation", () => {
    it("requires email field", async () => {
      const response = await fetch(
        "http://localhost:3000/api/auth/forgot-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      expect(response.status).toBe(400);
    });

    it("validates email format", async () => {
      const response = await fetch(
        "http://localhost:3000/api/auth/forgot-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "invalid" }),
        }
      );

      expect(response.status).toBe(400);
    });
  });

  describe("Security", () => {
    it("does not reveal user existence (no enumeration)", async () => {
      const response = await fetch(
        "http://localhost:3000/api/auth/forgot-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "nonexistent@test.com" }),
        }
      );

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
    });

    it("includes Cache-Control header", async () => {
      const response = await fetch(
        "http://localhost:3000/api/auth/forgot-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "user@test.com" }),
        }
      );

      expect(response.headers.get("cache-control")).toBe("no-store");
    });
  });

  describe("Rate Limiting", () => {
    it("handles rapid requests", async () => {
      const promises = Array.from({ length: 10 }, () =>
        fetch("http://localhost:3000/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "user@test.com" }),
        })
      );

      const responses = await Promise.all(promises);
      expect(responses.every((r) => r.status === 200 || r.status === 429)).toBe(
        true
      );
    });
  });
});

describe("POST /api/auth/forgot-password/verify-code", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Successful Verification", () => {
    it("verifies valid reset code", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const admin = createAdminClient();
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: "user@test.com",
      });

      const properties = linkData?.properties as any;
      const token = properties?.email_otp;

      const response = await fetch(
        "http://localhost:3000/api/auth/forgot-password/verify-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "user@test.com",
            code: token,
          }),
        }
      );

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
    });

    it("creates recovery session", async () => {
      // Recovery session allows password update
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const admin = createAdminClient();
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: "user@test.com",
      });

      const properties = linkData?.properties as any;
      const token = properties?.email_otp;

      const response = await fetch(
        "http://localhost:3000/api/auth/forgot-password/verify-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "user@test.com",
            code: token,
          }),
        }
      );

      expect(response.status).toBe(200);

      // Should set session cookies
      const cookies = response.headers.get("set-cookie");
      expect(cookies).toBeTruthy();
    });
  });

  describe("Invalid Codes", () => {
    it("rejects invalid code", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const response = await fetch(
        "http://localhost:3000/api/auth/forgot-password/verify-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "user@test.com",
            code: "invalid",
          }),
        }
      );

      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.ok).toBe(false);
    });

    it("rejects code for wrong email", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const admin = createAdminClient();
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: "user@test.com",
      });

      const properties = linkData?.properties as any;
      const token = properties?.email_otp;

      const response = await fetch(
        "http://localhost:3000/api/auth/forgot-password/verify-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "other@test.com",
            code: token,
          }),
        }
      );

      const json = await response.json();
      expect(json.ok).toBe(false);
    });
  });

  describe("Admin 2FA", () => {
    it("requires 2FA setup for admin", async () => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const admin = createAdminClient();
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: "admin@test.com",
      });

      const properties = linkData?.properties as any;
      const token = properties?.email_otp;

      const response = await fetch(
        "http://localhost:3000/api/auth/forgot-password/verify-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "admin@test.com",
            code: token,
          }),
        }
      );

      const json = await response.json();

      expect(json.ok).toBe(true);
      expect(json.requiresTwoFASetup).toBe(true);
    });
  });

  describe("Validation", () => {
    it("requires email field", async () => {
      const response = await fetch(
        "http://localhost:3000/api/auth/forgot-password/verify-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: "123456" }),
        }
      );

      expect(response.status).toBe(400);
    });

    it("requires code field", async () => {
      const response = await fetch(
        "http://localhost:3000/api/auth/forgot-password/verify-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "user@test.com" }),
        }
      );

      expect(response.status).toBe(400);
    });
  });
});

describe("password reset OTP flow", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  it("rejects token reuse and wrong user", async () => {
    const admin = createAdminClient();
    await createUserWithProfile({
      email: "reset@test.com",
      password: "Password123!",
      role: "customer",
    });

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "recovery",
        email: "reset@test.com",
      });
    expect(linkError).toBeNull();

    const properties = linkData?.properties as any;
    const token =
      properties?.email_otp ??
      (properties?.action_link
        ? new URL(properties.action_link).searchParams.get("token")
        : null);
    expect(token).toBeTruthy();

    const anon = createAnonClient();
    const { error: verifyError } = await anon.auth.verifyOtp({
      email: "reset@test.com",
      token: token as string,
      type: "recovery",
    });
    expect(verifyError).toBeNull();

    const { error: reuseError } = await anon.auth.verifyOtp({
      email: "reset@test.com",
      token: token as string,
      type: "recovery",
    });
    expect(reuseError).not.toBeNull();

    const { error: wrongUserError } = await anon.auth.verifyOtp({
      email: "other@test.com",
      token: token as string,
      type: "recovery",
    });
    expect(wrongUserError).not.toBeNull();
  });

  it("rejects expired recovery tokens", async () => {
    const admin = createAdminClient();
    await createUserWithProfile({
      email: "expired@test.com",
      password: "Password123!",
      role: "customer",
    });

    const { data: linkData } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: "expired@test.com",
    });

    const properties = linkData?.properties as any;
    const token =
      properties?.email_otp ??
      (properties?.action_link
        ? new URL(properties.action_link).searchParams.get("token")
        : null);
    const hashedToken = properties?.hashed_token as string | undefined;

    if (hashedToken) {
      await expireRecoveryToken(hashedToken);
    }

    const anon = createAnonClient();
    const { error: verifyError } = await anon.auth.verifyOtp({
      email: "expired@test.com",
      token: token as string,
      type: "recovery",
    });
    expect(verifyError).not.toBeNull();
  });
});
