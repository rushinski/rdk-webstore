// app/api/contact/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { sendEmail } from "@/lib/email/mailer";
import { buildContactSubmissionEmail } from "@/lib/email/contact";
import { ContactMessagesRepository } from "@/repositories/contact-messages-repo";
import { ContactAttachmentService } from "@/services/contact-attachment-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";
import { env } from "@/config/env";
import { security } from "@/config/security";
import { BUG_REPORT_EMAIL, SUPPORT_EMAIL } from "@/config/constants/contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contactSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(255),
    subject: z.string().trim().min(1).max(150),
    message: z.string().trim().min(1).max(4000),
    source: z.enum(["contact_form", "bug_report"]).optional(),
  })
  .strict();

type ContactSource = "contact_form" | "bug_report";

const attachmentConfig = security.contact.attachments;
const ALLOWED_ATTACHMENT_TYPES = new Set<string>(attachmentConfig.allowedTypes);
const MAX_ATTACHMENT_SIZE_MB = Math.max(
  1,
  Math.round(attachmentConfig.maxBytes / (1024 * 1024)),
);

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL!,
  token: env.UPSTASH_REDIS_REST_TOKEN!,
});

const contactRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    security.contact.rateLimit.maxRequests,
    security.contact.rateLimit.window,
  ),
});

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
    if (isPng) {
      return { mime: "image/png", ext: "png" };
    }
  }

  if (bytes.length >= 3) {
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (isJpeg) {
      return { mime: "image/jpeg", ext: "jpg" };
    }
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
    if (isWebp) {
      return { mime: "image/webp", ext: "webp" };
    }
  }

  return null;
};

const sanitizeFilename = (name: string, fallback: string) => {
  const trimmed = name.trim();
  if (!trimmed) {
    return fallback;
  }
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe.length > 0 ? safe : fallback;
};

const getClientIp = (request: NextRequest): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
};

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    // Rate limit
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
        },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");

    let body: Record<string, unknown> | null = null;

    // For EMAIL (CID inline)
    let emailAttachments: {
      filename: string;
      content: Buffer;
      contentType?: string;
      cid?: string;
      contentDisposition?: "inline" | "attachment";
    }[] = [];

    // For STORAGE upload
    let validatedUploads: Array<{ file: File; filename: string }> = [];

    if (isMultipart) {
      const formData = await request.formData();

      body = {
        name: typeof formData.get("name") === "string" ? formData.get("name") : undefined,
        email:
          typeof formData.get("email") === "string" ? formData.get("email") : undefined,
        subject:
          typeof formData.get("subject") === "string"
            ? formData.get("subject")
            : undefined,
        message:
          typeof formData.get("message") === "string"
            ? formData.get("message")
            : undefined,
        source:
          typeof formData.get("source") === "string" ? formData.get("source") : undefined,
      };

      const fileEntries = formData.getAll("attachments").filter(isFileValue);

      if (fileEntries.length > attachmentConfig.maxFiles) {
        return NextResponse.json(
          {
            ok: false,
            error: `You can upload up to ${attachmentConfig.maxFiles} images.`,
            requestId,
          },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      for (const [index, file] of fileEntries.entries()) {
        if (file.size > attachmentConfig.maxBytes) {
          return NextResponse.json(
            {
              ok: false,
              error: `${file.name || "Attachment"} exceeds ${MAX_ATTACHMENT_SIZE_MB}MB.`,
              requestId,
            },
            { status: 400, headers: { "Cache-Control": "no-store" } },
          );
        }

        if (file.type && !ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
          return NextResponse.json(
            {
              ok: false,
              error: `${file.name || "Attachment"} is not a supported image type.`,
              requestId,
            },
            { status: 400, headers: { "Cache-Control": "no-store" } },
          );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const signature = detectImageType(new Uint8Array(buffer));

        if (!signature) {
          return NextResponse.json(
            {
              ok: false,
              error: `${file.name || "Attachment"} is not a valid image.`,
              requestId,
            },
            { status: 400, headers: { "Cache-Control": "no-store" } },
          );
        }

        if (file.type && signature.mime !== file.type) {
          return NextResponse.json(
            {
              ok: false,
              error: `${file.name || "Attachment"} failed image validation.`,
              requestId,
            },
            { status: 400, headers: { "Cache-Control": "no-store" } },
          );
        }

        const fallbackName = `attachment-${index + 1}.${signature.ext}`;
        const filename = sanitizeFilename(file.name, fallbackName);
        const finalFilename = filename.toLowerCase().endsWith(`.${signature.ext}`)
          ? filename
          : `${filename}.${signature.ext}`;

        // email CID inline
        const contentId = `attachment-${index + 1}@realdealkickzsc`;
        emailAttachments.push({
          filename: finalFilename,
          content: buffer,
          contentType: signature.mime,
          cid: contentId,
          contentDisposition: "inline",
        });

        // storage upload later
        validatedUploads.push({ file, filename: finalFilename });
      }
    } else {
      body = await request.json().catch(() => null);
    }

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const source = (parsed.data.source ?? "contact_form") as ContactSource;

    // Insert message (user/anon client is fine for insert if your RLS permits it)
    const supabase = await createSupabaseServerClient();
    const contactRepo = new ContactMessagesRepository(supabase);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const messageId = await contactRepo.insertMessage({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
      source,
      user_id: user?.id ?? null,
    });

    // Upload + write attachments with ADMIN (avoid RLS update failures)
    let storedAttachments: Array<{
      filename: string;
      bucket: string;
      path: string;
      signedUrl: string;
      mimeType: string;
      bytes: number;
      hash: string;
    }> = [];

    if (validatedUploads.length > 0) {
      const supabaseAdmin = createSupabaseAdminClient();
      const uploadService = new ContactAttachmentService(supabaseAdmin);

      for (const item of validatedUploads) {
        const result = await uploadService.uploadContactAttachment({
          messageId,
          source,
          file: item.file,
          filename: item.filename,
        });

        storedAttachments.push({
          filename: item.filename,
          bucket: result.bucket,
          path: result.path,
          signedUrl: result.signedUrl,
          mimeType: result.mimeType,
          bytes: result.bytes,
          hash: result.hash,
        });
      }

      // IMPORTANT: update via ADMIN so anon RLS can’t block it.
      const { error: updateErr } = await supabaseAdmin
        .from("contact_messages")
        .update({ attachments: storedAttachments })
        .eq("id", messageId);

      if (updateErr) {
        // If this fails, that means the column is missing or some other schema/RLS mismatch.
        logError(updateErr, {
          layer: "api",
          requestId,
          route: "/api/contact",
          message: "contact_set_attachments_failed",
        });
      }
    }

    // Email
    const recipientEmail = source === "bug_report" ? BUG_REPORT_EMAIL : SUPPORT_EMAIL;

    const { html, text, subjectPrefix } = buildContactSubmissionEmail({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
      source,
      attachments: emailAttachments.map((file) => ({
        filename: file.filename,
        cid: file.cid,
      })),
    });

    try {
      await sendEmail({
        to: recipientEmail,
        subject: `${subjectPrefix}: ${parsed.data.subject}`,
        html,
        text,
        attachments: emailAttachments,
      });
    } catch (emailError) {
      logError(emailError, {
        layer: "api",
        requestId,
        route: "/api/contact",
        message: "contact_email_failed",
      });
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/contact",
    });

    return NextResponse.json(
      { ok: false, error: "Failed to send message", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
