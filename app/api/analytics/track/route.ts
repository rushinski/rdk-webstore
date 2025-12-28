import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BLOCKED_PREFIXES = ["/admin", "/auth", "/api", "/_next", "/too-many-requests"];

const isBlockedPath = (path: string) =>
  BLOCKED_PREFIXES.some((prefix) => path.startsWith(prefix));

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const path = typeof body?.path === "string" ? body.path.trim() : "";
    const visitorId = typeof body?.visitorId === "string" ? body.visitorId.trim() : "";
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    const referrer = typeof body?.referrer === "string" ? body.referrer.trim() : null;

    if (!path || !visitorId || !sessionId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (isBlockedPath(path)) {
      return NextResponse.json({ ok: true });
    }

    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("site_pageviews").insert({
      path,
      referrer,
      visitor_id: visitorId,
      session_id: sessionId,
      user_id: userData?.user?.id ?? null,
    });

    if (error) {
      console.error("Pageview insert error:", error);
      return NextResponse.json({ error: "Failed to track pageview" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Pageview tracking error:", error);
    return NextResponse.json({ error: "Failed to track pageview" }, { status: 500 });
  }
}
