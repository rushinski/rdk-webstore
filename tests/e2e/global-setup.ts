import "../helpers/env";
import { resetDatabase, seedBaseData } from "../helpers/db";

export default async function globalSetup() {
  const mode = process.env.E2E_MODE === "vercel" ? "vercel" : "local";
  const seedStrategy =
    process.env.E2E_SEED_STRATEGY ??
    (mode === "vercel" ? "none" : "cli");

  if (mode === "vercel") {
    return;
  }

  if (seedStrategy === "cli") {
    await resetDatabase();
    await seedBaseData();
  }
}
