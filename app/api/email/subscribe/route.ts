// app/api/email/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmailSubscriptionService } from "@/services/email-subscription-service";
import { emailSubscribeSchema } from "@/lib/validation/email";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { sendEmail } from "@/lib/email/mailer";
import {
  buildSubscriptionConfirmationEmail,
  buildSubscriptionConfirmedEmail,
} from "@/lib/email/subscription";
import { emailSubjects } from "@/config/constants/email";
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

    const sessionSupabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await sessionSupabase.auth.getUser();
    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const userEmail = user?.email?.trim().toLowerCase();
    const signedInMatch = Boolean(userEmail && userEmail === normalizedEmail);

    if (signedInMatch) {
      const status = await service.subscribeDirect(
        normalizedEmail,
        parsed.data.source ?? "website"
      );

      if (status === "subscribed") {
        const { html, text } = buildSubscriptionConfirmedEmail();

        try {
          await sendEmail({
            to: normalizedEmail,
            subject: emailSubjects.subscriptionConfirmed(),
            html,
            text,
          });
        } catch (emailError) {
          logError(emailError, {
            layer: "api",
            requestId,
            route: "/api/email/subscribe",
            message: "email_subscription_thankyou_failed",
          });
        }
      }

      return NextResponse.json(
        { ok: true },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const status = await service.requestConfirmation(
      normalizedEmail,
      parsed.data.source ?? "website",
      token,
      expiresAt
    );

    if (status === "pending") {
      const confirmUrl = `${env.NEXT_PUBLIC_SITE_URL}/api/email/confirm?token=${token}`;
      const { html, text } = buildSubscriptionConfirmationEmail(confirmUrl);

      try {
        await sendEmail({
          to: parsed.data.email,
          subject: emailSubjects.subscriptionConfirmation(),
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
