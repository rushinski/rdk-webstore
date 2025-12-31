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
import { security } from "@/config/security";
import { BUG_REPORT_EMAIL, SUPPORT_EMAIL } from "@/config/constants/contact";

const contactSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(255),
    subject: z.string().trim().min(1).max(150),
    message: z.string().trim().min(1).max(4000),
    source: z.enum(["contact_form", "bug_report"]).optional(),
  })
  .strict();

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL!,
  token: env.UPSTASH_REDIS_REST_TOKEN!,
});

const contactRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    security.contact.rateLimit.maxRequests,
    security.contact.rateLimit.window
  ),
});

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isFileValue = (value: FormDataEntryValue): value is File =>
  typeof value === "object" && value !== null && "arrayBuffer" in value;

const detectImageType = (bytes: Uint8Array): { mime: string; ext: string } | null => {
  if (bytes.length >= 8) {
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
    if (isPng) return { mime: "image/png", ext: "png" };
  }

  if (bytes.length >= 3) {
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (isJpeg) return { mime: "image/jpeg", ext: "jpg" };
  }

  if (bytes.length >= 12) {
    const isWebp =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;
    if (isWebp) return { mime: "image/webp", ext: "webp" };
  }

  return null;
};

const sanitizeFilename = (name: string, fallback: string) => {
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe.length > 0 ? safe : fallback;
};

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
          status: security.contact.rateLimit.blockStatus,
          headers: {
            "Cache-Control": "no-store",
            "X-RateLimit-Limit": String(rateResult.limit),
            "X-RateLimit-Remaining": String(rateResult.remaining),
            "X-RateLimit-Reset": String(rateResult.reset),
          },
        }
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");
    let body: Record<string, unknown> | null = null;
    let attachments: { filename: string; content: Buffer; contentType?: string }[] = [];

    if (isMultipart) {
      const formData = await request.formData();
      body = {
        name: typeof formData.get("name") === "string" ? formData.get("name") : undefined,
        email: typeof formData.get("email") === "string" ? formData.get("email") : undefined,
        subject: typeof formData.get("subject") === "string" ? formData.get("subject") : undefined,
        message: typeof formData.get("message") === "string" ? formData.get("message") : undefined,
        source: typeof formData.get("source") === "string" ? formData.get("source") : undefined,
      };

      const fileEntries = formData.getAll("attachments").filter(isFileValue);

      if (fileEntries.length > MAX_ATTACHMENTS) {
        return NextResponse.json(
          { ok: false, error: `You can upload up to ${MAX_ATTACHMENTS} images.`, requestId },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }

      for (const [index, file] of fileEntries.entries()) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          return NextResponse.json(
            { ok: false, error: `${file.name || "Attachment"} exceeds 5MB.`, requestId },
            { status: 400, headers: { "Cache-Control": "no-store" } }
          );
        }

        if (file.type && !ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
          return NextResponse.json(
            { ok: false, error: `${file.name || "Attachment"} is not a supported image type.`, requestId },
            { status: 400, headers: { "Cache-Control": "no-store" } }
          );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const signature = detectImageType(new Uint8Array(buffer));

        if (!signature) {
          return NextResponse.json(
            { ok: false, error: `${file.name || "Attachment"} is not a valid image.`, requestId },
            { status: 400, headers: { "Cache-Control": "no-store" } }
          );
        }

        if (file.type && signature.mime !== file.type) {
          return NextResponse.json(
            { ok: false, error: `${file.name || "Attachment"} failed image validation.`, requestId },
            { status: 400, headers: { "Cache-Control": "no-store" } }
          );
        }

        const fallbackName = `attachment-${index + 1}.${signature.ext}`;
        const filename = sanitizeFilename(file.name, fallbackName);
        attachments.push({
          filename: filename.toLowerCase().endsWith(`.${signature.ext}`)
            ? filename
            : `${filename}.${signature.ext}`,
          content: buffer,
          contentType: signature.mime,
        });
      }
    } else {
      body = await request.json().catch(() => null);
    }

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
    const recipientEmail = source === "bug_report" ? BUG_REPORT_EMAIL : SUPPORT_EMAIL;
    const textHeading = source === "bug_report"
      ? "New Bug Report Submission"
      : "New Contact Form Submission";
    const attachmentsText = attachments.length > 0
      ? attachments.map((file) => file.filename).join(", ")
      : "None";
    const attachmentsHtml = attachments.length > 0
      ? `
        <tr>
          <td style="padding:0 24px 24px;">
            <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#f87171;font-weight:700;">
              Attachments
            </div>
            <div style="margin-top:10px;background:#111114;border:1px solid #262626;padding:14px;font-size:13px;line-height:1.7;color:#d1d5db;">
              ${attachments.map((file) => escapeHtml(file.filename)).join("<br />")}
            </div>
          </td>
        </tr>
      `
      : "";

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
                  ${attachmentsHtml}
                  ${footerHtml}
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const text = `${textHeading}
Name: ${parsed.data.name}
Email: ${parsed.data.email}
Subject: ${parsed.data.subject}
Attachments: ${attachmentsText}
Message:
${parsed.data.message}
${emailFooterText()}
`;

    try {
      const subjectPrefix = source === "bug_report" ? "Bug report" : "Contact";
      await sendEmail({
        to: recipientEmail,
        subject: `${subjectPrefix}: ${parsed.data.subject}`,
        html,
        text,
        attachments,
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
