import "../helpers/env";
import { resetDatabase, seedBaseData } from "../helpers/db";

export default async function globalSetup() {
  const seedStrategy = process.env.E2E_SEED_STRATEGY ?? "cli";
  if (seedStrategy === "none") {
    return;
  }
  await resetDatabase();
  await seedBaseData();
}
