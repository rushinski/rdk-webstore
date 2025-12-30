import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/mailer";
import { emailFooterHtml, emailFooterText } from "@/lib/email/footer";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { env } from "@/config/env";

const contactSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(255),
    subject: z.string().trim().min(1).max(150),
    message: z.string().trim().min(1).max(4000),
    source: z.enum(["contact_form", "bug_report"]).optional(),
  })
  .strict();

const CONTACT_TO_EMAIL = "realdealholyspill@gmail.com";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL!,
  token: env.UPSTASH_REDIS_REST_TOKEN!,
});

const contactRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
});

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getClientIp = (request: NextRequest): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
};

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const clientIp = getClientIp(request);
    let rateResult: Awaited<ReturnType<typeof contactRateLimit.limit>> | null = null;

    try {
      rateResult = await contactRateLimit.limit(`contact:${clientIp}`);
    } catch (rateLimitError) {
      logError(rateLimitError, {
        layer: "api",
        requestId,
        route: "/api/contact",
        message: "contact_rate_limit_failed",
      });
    }

    if (rateResult && !rateResult.success) {
      return NextResponse.json(
        { ok: false, error: "Rate limit exceeded. Please try again later.", requestId },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "X-RateLimit-Limit": String(rateResult.limit),
            "X-RateLimit-Remaining": String(rateResult.remaining),
            "X-RateLimit-Reset": String(rateResult.reset),
          },
        }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const source = parsed.data.source ?? "contact_form";

    const { error: insertError } = await supabase
      .from("contact_messages")
      .insert({
        name: parsed.data.name,
        email: parsed.data.email,
        subject: parsed.data.subject,
        message: parsed.data.message,
        source,
        user_id: user?.id ?? null,
      });

    if (insertError) {
      throw insertError;
    }

    const safeName = escapeHtml(parsed.data.name);
    const safeEmail = escapeHtml(parsed.data.email);
    const safeSubject = escapeHtml(parsed.data.subject);
    const safeMessage = escapeHtml(parsed.data.message);
    const heading = source === "bug_report" ? "Bug Report" : "Contact Form";
    const headline = source === "bug_report" ? "New bug report received" : "New message received";

    const footerHtml = emailFooterHtml();

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>New Contact Message</title>
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
                        ${heading}
                      </div>
                      <h1 style="margin:10px 0 0;font-size:20px;font-weight:700;color:#ffffff;">
                        ${headline}
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 24px 16px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#111114;border:1px solid #262626;">
                        <tr>
                          <td style="padding:12px;">
                            <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.14em;">
                              From
                            </div>
                            <div style="font-size:15px;color:#ffffff;font-weight:700;margin-top:4px;">
                              ${safeName}
                            </div>
                            <div style="font-size:13px;color:#d1d5db;margin-top:6px;">
                              ${safeEmail}
                            </div>
                          </td>
                          <td style="padding:12px;text-align:right;">
                            <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.14em;">
                              Subject
                            </div>
                            <div style="font-size:14px;color:#ffffff;margin-top:4px;">
                              ${safeSubject}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 24px 24px;">
                      <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#f87171;font-weight:700;">
                        Message
                      </div>
                      <div style="margin-top:10px;background:#111114;border:1px solid #262626;padding:14px;font-size:13px;line-height:1.7;color:#d1d5db;">
                        ${safeMessage.replace(/\n/g, "<br />")}
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

    const text = `New Contact Form Submission
Name: ${parsed.data.name}
Email: ${parsed.data.email}
Subject: ${parsed.data.subject}
Message:
${parsed.data.message}
${emailFooterText()}
`;

    try {
      const subjectPrefix = source === "bug_report" ? "Bug report" : "Contact";
      await sendEmail({
        to: CONTACT_TO_EMAIL,
        subject: `${subjectPrefix}: ${parsed.data.subject}`,
        html,
        text,
      });
    } catch (emailError) {
      logError(emailError, {
        layer: "api",
        requestId,
        route: "/api/contact",
        message: "contact_email_failed",
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
      route: "/api/contact",
    });
    return NextResponse.json(
      { ok: false, error: "Failed to send message", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
