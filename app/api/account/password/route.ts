// app/api/account/password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/mailer";
import { emailFooterHtml, emailFooterText } from "@/lib/email/footer";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { isPasswordValid } from "@/lib/validation/password";

const passwordSchema = z
  .object({
    password: z.string().min(1).max(128),
  })
  .strict();

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = passwordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!isPasswordValid(parsed.data.password)) {
      return NextResponse.json(
        { error: "Password does not meet the required criteria.", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message, requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const footerHtml = emailFooterHtml();
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Password Updated</title>
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
                        Security Notice
                      </div>
                      <h1 style="margin:10px 0 0;font-size:20px;font-weight:700;color:#ffffff;">
                        Your password was updated
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 24px 24px;">
                      <div style="font-size:13px;line-height:1.7;color:#d1d5db;">
                        We&apos;re confirming that your Realdealkickzsc account password was changed successfully.
                        If you did not make this change, please reset your password right away and contact support.
                      </div>
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

    const text = `Your password was updated

We’re confirming that your Realdealkickzsc account password was changed successfully.
If you did not make this change, please reset your password right away and contact support.
${emailFooterText()}
`;

    try {
      await sendEmail({
        to: session.user.email,
        subject: "Your Realdealkickzsc password was updated",
        html,
        text,
      });
    } catch (emailError) {
      logError(emailError, {
        layer: "api",
        requestId,
        route: "/api/account/password",
        message: "password_change_email_failed",
      });
    }

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/account/password",
    });
    return NextResponse.json(
      { error: "Failed to change password", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
