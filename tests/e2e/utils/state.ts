// tests/e2e/utils/state.ts
import { resetAndSeed } from "../../helpers/db/lifecycle";

export async function resetAndSeedForE2E() {
  const seedStrategy = process.env.E2E_SEED_STRATEGY ?? "truncate";
  if (seedStrategy === "none") {
    throw new Error("E2E_SEED_STRATEGY=none is not supported for seeded E2E tests.");
  }
  return resetAndSeed();
}
