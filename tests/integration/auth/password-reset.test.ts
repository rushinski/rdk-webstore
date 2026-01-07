import { Client } from "pg";
import { resetDatabase, seedBaseData } from "@/tests/helpers/db";
import { createAdminClient, createUserWithProfile, createAnonClient } from "@/tests/helpers/supabase";

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

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: "reset@test.com",
    });
    expect(linkError).toBeNull();

    const properties = linkData?.properties as any;
    const token =
      properties?.email_otp ??
      (properties?.action_link ? new URL(properties.action_link).searchParams.get("token") : null);
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
      (properties?.action_link ? new URL(properties.action_link).searchParams.get("token") : null);
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
