// app/api/email/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EmailSubscriptionService } from "@/services/email-subscription-service";
import { emailSubscribeSchema } from "@/lib/validation/email";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { sendEmail } from "@/lib/email/mailer";
import { emailFooterText } from "@/lib/email/footer";
import { renderEmailLayout } from "@/lib/email/template";
import { emailStyles } from "@/lib/email/theme";
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
      const contentHtml = `
        <tr>
          <td style="padding:0 24px 10px;text-align:center;">
            <div style="${emailStyles.eyebrow}">Confirm subscription</div>
            <h1 style="${emailStyles.heading}">Finish subscribing</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 20px;text-align:center;">
            <p style="${emailStyles.copy}">Confirm your email to receive updates from Realdealkickzsc.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 24px;text-align:center;">
            <a href="${confirmUrl}" style="${emailStyles.button}">Confirm subscription</a>
            <p style="margin:14px 0 0;${emailStyles.subcopy}">This link expires in 24 hours.</p>
          </td>
        </tr>
      `;
      const html = renderEmailLayout({
        title: "Confirm your subscription",
        preheader: "Confirm your email to get Realdealkickzsc updates.",
        contentHtml,
      });

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
