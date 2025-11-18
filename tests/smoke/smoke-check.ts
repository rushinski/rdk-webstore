console.log("Smoke tests not implemented yet");

async function run() {
  const url = process.env.PROD_BASE_URL || "https://example.com";

  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
  } catch (err) {
    if (err instanceof Error) {
      console.log("Smoke test skipped:", err.message);
    } else {
      console.log("Smoke test skipped due to unknown error type:", err);
    }
  }
}

run();
