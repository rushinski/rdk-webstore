import { resetDatabase, seedBaseData } from "@/tests/helpers/db";
import { createUserWithProfile, signInUser, createAnonClient } from "@/tests/helpers/supabase";

describe("change password flow", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  it("updates password and prevents old password reuse", async () => {
    await createUserWithProfile({
      email: "change@test.com",
      password: "OldPassword123!",
      role: "customer",
    });

    const { client } = await signInUser("change@test.com", "OldPassword123!");
    const { error: updateError } = await client.auth.updateUser({ password: "NewPassword123!" });
    expect(updateError).toBeNull();

    await client.auth.signOut();

    const anon = createAnonClient();
    const { error: oldError } = await anon.auth.signInWithPassword({
      email: "change@test.com",
      password: "OldPassword123!",
    });
    expect(oldError).not.toBeNull();

    const { error: newError } = await anon.auth.signInWithPassword({
      email: "change@test.com",
      password: "NewPassword123!",
    });
    expect(newError).toBeNull();
  });
});
