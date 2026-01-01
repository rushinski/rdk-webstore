// app/api/account/password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUserApi } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/mailer";
import { emailFooterText } from "@/lib/email/footer";
import { renderEmailLayout } from "@/lib/email/template";
import { emailStyles } from "@/lib/email/theme";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { isPasswordValid } from "@/lib/validation/password";
import { env } from "@/config/env";

const passwordSchema = z
  .object({
    password: z.string().min(1).max(128),
  })
  .strict();

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireUserApi();
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

    const accountUrl = `${env.NEXT_PUBLIC_SITE_URL}/account`;
    const contentHtml = `
      <tr>
        <td style="padding:0 24px 10px;text-align:center;">
          <div style="${emailStyles.eyebrow}">Security notice</div>
          <h1 style="${emailStyles.heading}">Your password was updated</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 20px;text-align:center;">
          <p style="${emailStyles.copy}">
            We're confirming that your Realdealkickzsc account password was changed successfully.
          </p>
          <p style="margin:10px 0 0;${emailStyles.subcopy}">
            If you did not make this change, reset your password right away and contact support.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 24px;text-align:center;">
          <a href="${accountUrl}" style="${emailStyles.button}">Go to your account</a>
        </td>
      </tr>
    `;
    const html = renderEmailLayout({
      title: "Password Updated",
      preheader: "Your Realdealkickzsc password was updated.",
      contentHtml,
    });

    const text = `Your password was updated

We're confirming that your Realdealkickzsc account password was changed successfully.
If you did not make this change, reset your password right away and contact support.
Review your account: ${accountUrl}
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
