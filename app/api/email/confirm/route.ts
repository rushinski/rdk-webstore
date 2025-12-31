import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EmailSubscriptionService } from "@/services/email-subscription-service";
import { sendEmail } from "@/lib/email/mailer";
import { emailFooterHtml, emailFooterText } from "@/lib/email/footer";
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

    const footerHtml = emailFooterHtml();
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Subscription confirmed</title>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
        </head>
        <body style="margin:0;padding:0;background:#050505;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505;padding:32px 12px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#0b0b0c;border:1px solid #1f1f22;">
                  <tr>
                    <td style="padding:24px;text-align:center;">
                      <img
                        src="https://fbwosmpjzbpojsftydwn.supabase.co/storage/v1/object/public/assets/rdk-logo.png"
                        alt="Realdealkickzsc"
                        style="max-width:180px;width:100%;height:auto;display:block;margin:0 auto;"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 24px 16px;text-align:center;">
                      <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#f87171;font-weight:700;">
                        Subscription confirmed
                      </div>
                      <h1 style="margin:10px 0 0;font-size:20px;font-weight:700;color:#ffffff;">
                        Thanks for signing up
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 24px 24px;text-align:center;">
                      <p style="margin:0;font-size:14px;line-height:1.7;color:#d1d5db;">
                        You&apos;re all set to receive updates from Realdealkickzsc.
                      </p>
                    </td>
                  </tr>
                  ${footerHtml}
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

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
