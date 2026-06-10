import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAdminRole, isProfileRole } from "@/config/constants/roles";
import { security, startsWithAny } from "@/config/security";
import { verifyAdminSessionToken } from "@/lib/http/admin-session";
import { createSupabaseProxyClient } from "@/lib/supabase/proxy";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { logError } from "@/lib/utils/log";
import { ProfileRepository } from "@/repositories/profile-repo";
import { TenantRepository } from "@/repositories/tenant-repo";
import { StoreAccessSettingsService } from "@/services/store-access-settings-service";

function isApiPath(pathname: string) {
  return pathname.startsWith("/api");
}

async function awaitMaybeVerify(token: string) {
  try {
    return await verifyAdminSessionToken(token);
  } catch {
    return null;
  }
}

async function getLockSettings() {
  const supabase = createSupabaseAdminClient();
  const tenantRepo = new TenantRepository(supabase);
  const tenantId = await tenantRepo.getFirstTenantId();

  if (!tenantId) {
    return null;
  }

  const service = new StoreAccessSettingsService(supabase);
  const settings = await service.getSettings(tenantId);

  return { service, settings };
}

async function isSignedInAdmin(request: NextRequest): Promise<boolean> {
  const supabase = createSupabaseProxyClient(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return false;
  }

  const profileRepo = new ProfileRepository(supabase);
  const profile = await profileRepo.getByUserId(user.id);
  const role = isProfileRole(profile?.role) ? profile.role : "customer";

  return isAdminRole(role);
}

export async function checkSiteLock(
  request: NextRequest,
  requestId: string,
): Promise<NextResponse | null> {
  const { pathname, search } = request.nextUrl;
  let lockSettings: Awaited<ReturnType<typeof getLockSettings>>;

  try {
    lockSettings = await getLockSettings();
  } catch (error) {
    logError(error, {
      layer: "proxy",
      requestId,
      route: pathname,
      message: "site_lock_settings_lookup_failed",
    });
    return null;
  }

  if (!lockSettings) {
    return null;
  }

  const { service, settings } = lockSettings;

  if (!service.isSiteLocked(settings)) {
    return null;
  }

  const unlockAt = settings.siteUnlockAt ? new Date(settings.siteUnlockAt) : null;

  const allowPrefixes = [
    "/locked",
    "/auth",
    "/api/auth",
    "/admin",
    "/api/admin",
    "/images",
  ];

  if (startsWithAny(pathname, allowPrefixes)) {
    return null;
  }

  const adminCookieValue = request.cookies.get(
    security.proxy.adminSession.cookieName,
  )?.value;
  if (adminCookieValue) {
    const session = await awaitMaybeVerify(adminCookieValue);
    if (session) {
      return null;
    }
  }

  try {
    if (await isSignedInAdmin(request)) {
      return null;
    }
  } catch (error) {
    logError(error, {
      layer: "proxy",
      requestId,
      route: pathname,
      message: "site_lock_admin_bypass_lookup_failed",
    });
  }

  if (isApiPath(pathname)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Site is locked",
        unlocksAt: unlockAt?.toISOString() ?? null,
        requestId,
      },
      { status: 423, headers: { "Cache-Control": "no-store" } },
    );
  }

  const accept = request.headers.get("accept") || "";
  const isHtmlNav = accept.includes("text/html");

  if (!isHtmlNav) {
    return null;
  }

  const lockedUrl = request.nextUrl.clone();
  lockedUrl.pathname = "/locked";
  lockedUrl.search = `?next=${encodeURIComponent(pathname + (search || ""))}`;

  const res = NextResponse.redirect(lockedUrl);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
