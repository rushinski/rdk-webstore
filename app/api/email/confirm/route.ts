import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EmailSubscriptionService } from "@/services/email-subscription-service";
import { sendEmail } from "@/lib/email/mailer";
import { emailFooterText } from "@/lib/email/footer";
import { renderEmailLayout } from "@/lib/email/template";
import { emailStyles } from "@/lib/email/theme";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { env } from "@/config/env";

const buildRedirect = (status: string) =>
  `${env.NEXT_PUBLIC_SITE_URL}/email/confirm?status=${encodeURIComponent(status)}`;

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeaders(req.headers);
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(buildRedirect("invalid"), { status: 302 });
  }

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

    const contentHtml = `
      <tr>
        <td style="padding:0 24px 10px;text-align:center;">
          <div style="${emailStyles.eyebrow}">Subscription confirmed</div>
          <h1 style="${emailStyles.heading}">Thanks for signing up</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 24px;text-align:center;">
          <p style="${emailStyles.copy}">You're all set to receive updates from Realdealkickzsc.</p>
        </td>
      </tr>
    `;
    const html = renderEmailLayout({
      title: "Subscription confirmed",
      preheader: "You're subscribed to Realdealkickzsc updates.",
      contentHtml,
    });

    const text = `Subscription confirmed
Thanks for signing up for Realdealkickzsc updates.
${emailFooterText()}
`;

    try {
      await sendEmail({
        to: result.email,
        subject: "Thanks for subscribing to Realdealkickzsc",
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
