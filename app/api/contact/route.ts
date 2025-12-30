import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/mailer";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const contactSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(255),
    subject: z.string().trim().min(1).max(150),
    message: z.string().trim().min(1).max(4000),
  })
  .strict();

const CONTACT_TO_EMAIL = "dsrush13@gmail.com";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
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

    const { error: insertError } = await supabase
      .from("contact_messages")
      .insert({
        name: parsed.data.name,
        email: parsed.data.email,
        subject: parsed.data.subject,
        message: parsed.data.message,
        source: "contact_form",
        user_id: user?.id ?? null,
      });

    if (insertError) {
      throw insertError;
    }

    const safeName = escapeHtml(parsed.data.name);
    const safeEmail = escapeHtml(parsed.data.email);
    const safeSubject = escapeHtml(parsed.data.subject);
    const safeMessage = escapeHtml(parsed.data.message);

    const html = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Subject:</strong> ${safeSubject}</p>
      <p><strong>Message:</strong></p>
      <p>${safeMessage.replace(/\n/g, "<br />")}</p>
    `;

    const text = `New Contact Form Submission
Name: ${parsed.data.name}
Email: ${parsed.data.email}
Subject: ${parsed.data.subject}
Message:
${parsed.data.message}
`;

    try {
      await sendEmail({
        to: CONTACT_TO_EMAIL,
        subject: `Contact: ${parsed.data.subject}`,
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
