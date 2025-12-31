// app/api/email/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EmailSubscriptionService } from "@/services/email-subscription-service";
import { emailSubscribeSchema } from "@/lib/validation/email";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { sendEmail } from "@/lib/email/mailer";
import { emailFooterHtml, emailFooterText } from "@/lib/email/footer";
import { env } from "@/config/env";

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeaders(req.headers);

  try {
    const body = await req.json().catch(() => null);
    const parsed = emailSubscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabase = createSupabaseAdminClient();
    const service = new EmailSubscriptionService(supabase);

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const status = await service.requestConfirmation(
      parsed.data.email,
      parsed.data.source ?? "website",
      token,
      expiresAt
    );

    if (status === "pending") {
      const confirmUrl = `${env.NEXT_PUBLIC_SITE_URL}/api/email/confirm?token=${token}`;
      const footerHtml = emailFooterHtml();
      const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <title>Confirm your subscription</title>
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
                          Confirm Subscription
                        </div>
                        <h1 style="margin:10px 0 0;font-size:20px;font-weight:700;color:#ffffff;">
                          Finish subscribing
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 24px 24px;text-align:center;">
                        <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#d1d5db;">
                          Confirm your email to receive updates from Realdealkickzsc.
                        </p>
                        <a href="${confirmUrl}" style="display:inline-block;background:#ef4444;color:#ffffff;text-decoration:none;padding:12px 22px;font-weight:700;">
                          Confirm subscription
                        </a>
                        <p style="margin:16px 0 0;font-size:12px;color:#6b7280;">
                          This link expires in 24 hours.
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

      const text = `Confirm your Realdealkickzsc subscription
Confirm here: ${confirmUrl}
This link expires in 24 hours.
${emailFooterText()}
`;

      try {
        await sendEmail({
          to: parsed.data.email,
          subject: "Confirm your Realdealkickzsc subscription",
          html,
          text,
        });
      } catch (emailError) {
        logError(emailError, {
          layer: "api",
          requestId,
          route: "/api/email/subscribe",
          message: "email_subscription_confirmation_failed",
        });
        return NextResponse.json(
          { ok: false, error: "Failed to send confirmation email.", requestId },
          { status: 500, headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/email/subscribe",
    });
    return NextResponse.json(
      { ok: false, error: "Subscription failed", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
