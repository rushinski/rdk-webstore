import "../../helpers/env";
import { resetDatabase, seedBaseData } from "../../helpers/db";

export async function resetAndSeedForLocal() {
  const isVercel = process.env.E2E_MODE === "vercel";
  if (isVercel) return null;
  await resetDatabase();
  return seedBaseData();
}
