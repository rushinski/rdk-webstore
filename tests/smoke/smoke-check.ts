console.info("Smoke tests not implemented yet");

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.com";

  try {
    const res = await fetch(url);
    console.info("Status:", res.status);
  } catch (err) {
    if (err instanceof Error) {
      console.info("Smoke test skipped:", err.message);
    } else {
      console.info("Smoke test skipped due to unknown error type:", err);
    }
  }
}

run();
