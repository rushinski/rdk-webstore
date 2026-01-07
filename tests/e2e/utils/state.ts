import "../../helpers/env";
import { resetDatabase, seedBaseData } from "../../helpers/db";

export async function resetAndSeedForE2E() {
  const seedStrategy = process.env.E2E_SEED_STRATEGY ?? "cli";
  if (seedStrategy === "none") {
    throw new Error("E2E_SEED_STRATEGY=none is not supported for seeded E2E tests.");
  }
  await resetDatabase();
  return seedBaseData();
}
