// src/proxy/auth.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ProfileRepository } from "@/repositories/profile-repo";
import { verifyAdminSessionToken } from "@/lib/crypto/admin-session";
import { security } from "@/config/security";
import { log } from "@/lib/log";

/**
 * Multi-layered admin authentication guard.
 * 
 * This function enforces a defense-in-depth strategy for admin access:
 * 
 * **Layer 1: Supabase User Session**
 * - Validates that the user has an active Supabase authentication session
 * 
 * **Layer 2: Profile Role Check**
 * - Verifies the user's profile exists in the database
 * - Confirms their role is explicitly set to "admin"
 * 
 * **Layer 3: Admin Session Token**
 * - Requires a separate, short-lived encrypted token (JWE)
 * - This token is NOT the Supabase session - it's an additional proof
 * - Provides time-boxing for admin privileges (24h default)
 * - Token is bound to the specific user ID to prevent token floating
 * 
 * **Layer 4: MFA Verification**
 * - When Supabase requires MFA (AAL2), redirects to challenge page
 * - Ensures admins have completed two-factor authentication
 * 
 * **Why this design?**
 * - Supabase session alone is insufficient for high-privilege operations
 * - Admin token adds time-bounded elevation (like sudo timeout)
 * - Binding to user ID prevents session fixation attacks
 * - MFA adds strong authentication factor
 * - Fail-closed: on any error, we deny access and clear credentials
 * 
 * @param request - The incoming Next.js request
 * @param requestId - Correlation ID for logging/tracing
 * @param supabase - Authenticated Supabase client
 * 
 * @returns NextResponse when access is denied (redirect or JSON error)
 * @returns null when access is granted (allows request to proceed)
 */
export async function protectAdminRoute(
  request: NextRequest,
  requestId: string,
  supabase: SupabaseClient
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // Determine response type based on route type:
  // - Admin API routes (/api/admin/*) return JSON errors
  // - Admin page routes (/admin/*) redirect to appropriate pages
  const isAdminApi = pathname.startsWith("/api/admin");

  /**
   * Centralized response builder for consistency.
   * Automatically chooses JSON error vs redirect based on route type.
   */
  const respond = (
    status: number,
    apiError: string,
    pageRedirectPath: string
  ): NextResponse => {
    if (isAdminApi) {
      return NextResponse.json({ error: apiError, requestId }, { status });
    }

    return NextResponse.redirect(new URL(pageRedirectPath, request.url));
  };

  /**
   * Emergency cleanup function.
   * 
   * Called when admin credentials are invalid/expired/tampered.
   * 
   * **Fail-closed behavior:**
   * - Attempts to sign out from Supabase (revokes all sessions)
   * - Clears the admin session cookie unconditionally
   * - Returns the blocking response regardless of signOut success
   * 
   * This ensures that even if Supabase is temporarily unavailable,
   * we still clear local state and block the request.
   */
  const signOutAndClearAdminCookie = async (
    response: NextResponse
  ): Promise<NextResponse> => {
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      // Log the failure but continue - we still want to block access
      log({
        level: "warn",
        layer: "proxy",
        message: "admin_guard_signout_failed",
        requestId,
        route: pathname,
        event: "admin_guard",
        error: signOutError instanceof Error ? signOutError.message : String(signOutError),
      });
    }

    // Clear the admin session cookie regardless of signOut success
    response.cookies.delete(security.proxy.adminSession.cookieName);

    return response;
  };

  // ============================================================================
  // LAYER 1: Supabase User Session
  // ============================================================================
  
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    log({
      level: "warn",
      layer: "proxy",
      message: "admin_guard_no_user_session",
      requestId,
      route: pathname,
      event: "admin_guard",
      error: userError?.message,
    });

    return respond(
      security.proxy.admin.unauthorizedStatus,
      "Unauthorized",
      security.proxy.admin.loginPath
    );
  }

  const user = userData.user;

  // ============================================================================
  // LAYER 2: Profile Role Check
  // ============================================================================
  
  const profileRepo = new ProfileRepository(supabase);

  let profile: Awaited<ReturnType<typeof profileRepo.getByUserId>> | null;

  try {
    profile = await profileRepo.getByUserId(user.id);
  } catch (profileError) {
    // Database query failed - fail closed
    log({
      level: "error",
      layer: "proxy",
      message: "admin_guard_profile_lookup_failed",
      requestId,
      route: pathname,
      userId: user.id,
      event: "admin_guard",
      error: profileError instanceof Error ? profileError.message : String(profileError),
    });

    return respond(
      security.proxy.admin.errorStatus,
      "Profile lookup failed",
      security.proxy.admin.loginPath
    );
  }

  // Profile doesn't exist - user account is in inconsistent state
  if (!profile) {
    log({
      level: "warn",
      layer: "proxy",
      message: "admin_guard_profile_missing",
      requestId,
      route: pathname,
      userId: user.id,
      event: "admin_guard",
    });

    return respond(
      security.proxy.admin.forbiddenStatus,
      "Profile missing",
      security.proxy.admin.homePath
    );
  }

  // Profile exists but user is not an admin
  if (profile.role !== "admin") {
    log({
      level: "warn",
      layer: "proxy",
      message: "admin_guard_insufficient_role",
      requestId,
      route: pathname,
      userId: user.id,
      role: profile.role,
      event: "admin_guard",
    });

    return respond(
      security.proxy.admin.forbiddenStatus,
      "Forbidden",
      security.proxy.admin.homePath
    );
  }

  // ============================================================================
  // LAYER 3: Admin Session Token (Short-lived Elevation)
  // ============================================================================
  
  const adminCookieValue = request.cookies.get(
    security.proxy.adminSession.cookieName
  )?.value;

  // Admin cookie is missing
  if (!adminCookieValue) {
    log({
      level: "warn",
      layer: "proxy",
      message: "admin_guard_missing_admin_cookie",
      requestId,
      route: pathname,
      userId: user.id,
      event: "admin_guard",
    });

    const response = respond(
      security.proxy.admin.unauthorizedStatus,
      "Unauthorized",
      security.proxy.admin.loginPath
    );

    return signOutAndClearAdminCookie(response);
  }

  // Verify and decrypt the admin session token
  let adminSession: Awaited<ReturnType<typeof verifyAdminSessionToken>> | null;

  try {
    adminSession = await verifyAdminSessionToken(adminCookieValue);
  } catch (verifyError) {
    // Token decryption/parsing failed - likely tampered or corrupted
    log({
      level: "warn",
      layer: "proxy",
      message: "admin_guard_token_verify_error",
      requestId,
      route: pathname,
      userId: user.id,
      event: "admin_guard",
      error: verifyError instanceof Error ? verifyError.message : String(verifyError),
    });

    adminSession = null;
  }

  // Token is invalid, expired, or tampered
  if (!adminSession) {
    log({
      level: "warn",
      layer: "proxy",
      message: "admin_guard_invalid_admin_token",
      requestId,
      route: pathname,
      userId: user.id,
      event: "admin_guard",
    });

    const response = respond(
      security.proxy.admin.unauthorizedStatus,
      "Unauthorized",
      security.proxy.admin.loginPath
    );

    return signOutAndClearAdminCookie(response);
  }

  // Token is valid but bound to a different user (session fixation attempt)
  if (adminSession.sub !== user.id) {
    log({
      level: "error",
      layer: "proxy",
      message: "admin_guard_token_user_mismatch",
      requestId,
      route: pathname,
      userId: user.id,
      tokenUserId: adminSession.sub,
      event: "admin_guard",
      severity: "SECURITY_INCIDENT",
    });

    const response = respond(
      security.proxy.admin.unauthorizedStatus,
      "Unauthorized",
      security.proxy.admin.loginPath
    );

    return signOutAndClearAdminCookie(response);
  }

  // ============================================================================
  // LAYER 4: MFA Verification (AAL2)
  // ============================================================================
  
  const { data: aalData, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError || !aalData) {
    log({
      level: "error",
      layer: "proxy",
      message: "admin_guard_mfa_state_error",
      requestId,
      route: pathname,
      userId: user.id,
      event: "admin_guard",
      error: aalError?.message,
    });

    return respond(
      security.proxy.admin.errorStatus,
      "MFA state error",
      security.proxy.admin.loginPath
    );
  }

  const mfaRequired = aalData.nextLevel === "aal2";
  const mfaNotCompleted = aalData.currentLevel !== "aal2";

  // Supabase is requiring MFA but user hasn't completed the challenge
  if (mfaRequired && mfaNotCompleted) {
    log({
      level: "info",
      layer: "proxy",
      message: "admin_guard_mfa_required",
      requestId,
      route: pathname,
      userId: user.id,
      event: "admin_guard",
      currentLevel: aalData.currentLevel,
      requiredLevel: aalData.nextLevel,
    });

    return respond(
      security.proxy.admin.forbiddenStatus,
      "MFA required",
      security.proxy.admin.mfaChallengePath
    );
  }

  // ============================================================================
  // SUCCESS: All checks passed
  // ============================================================================
  
  // Optional: Log successful admin access for audit trail
  // (Can be disabled in production if too noisy, but useful for security monitoring)
  log({
    level: "info",
    layer: "proxy",
    message: "admin_guard_access_granted",
    requestId,
    route: pathname,
    userId: user.id,
    event: "admin_guard",
  });

  // Return null to indicate the request should proceed
  return null;
}