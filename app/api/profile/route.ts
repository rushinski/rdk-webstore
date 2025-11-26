import { NextRequest, NextResponse } from "next/server";
import { createRlsClient } from "@/lib/supabase";
import { ProfilesRepo } from "@/repositories/profiles-repo";
import { ProfileService } from "@/services/profile-service";

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? null;

  const supabase = createRlsClient(token ?? undefined, requestId);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = new ProfileService({
    repos: { profiles: new ProfilesRepo({ supabase, requestId, userId: user.id }) },
    requestId,
    userId: user.id,
  });

  const data = await service.getSelf();

  return NextResponse.json({ data, requestId });
}

export async function PUT(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? null;

  const supabase = createRlsClient(token ?? undefined, requestId);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const service = new ProfileService({
    repos: { profiles: new ProfilesRepo({ supabase, requestId, userId: user.id }) },
    requestId,
    userId: user.id,
  });

  const updated = await service.updateSelf(body);

  return NextResponse.json({ data: updated, requestId });
}
