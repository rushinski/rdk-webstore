// app/api/analytics/track/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AnalyticsService } from "@/services/analytics-service";
import { analyticsTrackSchema } from "@/lib/validation/analytics";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

const BLOCKED_PREFIXES = ["/admin", "/auth", "/api", "/_next", "/too-many-requests"];

const isBlockedPath = (path: string) =>
  BLOCKED_PREFIXES.some((prefix) => path.startsWith(prefix));

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const body = await request.json().catch(() => null);
    const parsed = analyticsTrackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { path, visitorId, sessionId, referrer } = parsed.data;

    if (isBlockedPath(path)) {
      return NextResponse.json(
        { ok: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    const service = new AnalyticsService(supabase);
    await service.trackPageview({
      path,
      referrer: referrer ?? null,
      visitorId,
      sessionId,
      userId: userData?.user?.id ?? null,
    });

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/analytics/track",
    });
    return NextResponse.json(
      { error: "Failed to track pageview", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
