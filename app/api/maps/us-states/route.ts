export const runtime = "nodejs";

export async function GET() {
  const upstream =
    "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

  const res = await fetch(upstream, {
    // Keep it simple—don’t add headers that trigger preflight
    cache: "force-cache",
  });

  if (!res.ok) {
    return new Response("Upstream map fetch failed", { status: 502 });
  }

  const body = await res.text();

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // optional: cache locally
      "cache-control": "public, max-age=86400",
    },
  });
}
