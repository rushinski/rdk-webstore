import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { EmailSubscriptionService } from "@/services/email-subscription-service";
import { sendEmail } from "@/lib/email/mailer";
import { buildSubscriptionConfirmedEmail } from "@/lib/email/subscription";
import { emailSubjects } from "@/config/constants/email";
import { emailConfirmTokenSchema } from "@/lib/validation/email";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { env } from "@/config/env";

const buildRedirect = (status: string) =>
  `${env.NEXT_PUBLIC_SITE_URL}/email/confirm?status=${encodeURIComponent(status)}`;

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeaders(req.headers);
  const tokenParam = req.nextUrl.searchParams.get("token") ?? undefined;
  const parsed = emailConfirmTokenSchema.safeParse({ token: tokenParam });

  if (!parsed.success) {
    return NextResponse.redirect(buildRedirect("invalid"), { status: 302 });
  }
  const { token } = parsed.data;

  try {
    const supabase = createSupabaseAdminClient();
    const service = new EmailSubscriptionService(supabase);
    const result = await service.confirmToken(token);

    if (result.status === "expired") {
      return NextResponse.redirect(buildRedirect("expired"), { status: 302 });
    }

    if (result.status === "invalid") {
      return NextResponse.redirect(buildRedirect("invalid"), { status: 302 });
    }

    if (result.status === "already_subscribed") {
      return NextResponse.redirect(buildRedirect("already"), { status: 302 });
    }

    const { html, text } = buildSubscriptionConfirmedEmail();

    try {
      await sendEmail({
        to: result.email,
        subject: emailSubjects.subscriptionConfirmed(),
        html,
        text,
      });
    } catch (emailError) {
      logError(emailError, {
        layer: "api",
        requestId,
        route: "/api/email/confirm",
        message: "email_subscription_thankyou_failed",
      });
    }

    return NextResponse.redirect(buildRedirect("success"), { status: 302 });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/email/confirm",
    });
    return NextResponse.redirect(buildRedirect("error"), { status: 302 });
  }
}
