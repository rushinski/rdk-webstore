// src/lib/email/mailer.ts
import { env } from "@/config/env";
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import MailComposer from "nodemailer/lib/mail-composer";

type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
  cid?: string;
  contentDisposition?: "inline" | "attachment";
};

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
};

type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
};

let sesv2: SESv2Client | null = null;
let ses: SESClient | null = null;

const getSesv2 = () => {
  if (sesv2) return sesv2;
  sesv2 = new SESv2Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return sesv2;
};

const getSes = () => {
  if (ses) return ses;
  ses = new SESClient({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return ses;
};

const buildFrom = () => `"${env.SES_FROM_NAME}" <${env.SES_FROM_EMAIL}>`;

// Prefer SESv2 for simple emails (no attachments). Use SES raw for attachments / CID.
export async function sendEmail({ to, subject, html, text, attachments }: SendEmailInput) {
  const from = buildFrom();

  if (attachments && attachments.length > 0) {
    // RAW MIME path (supports attachments + inline CID)
    const composer = new MailComposer({
      from,
      to,
      subject,
      html,
      text,
      attachments: attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
        cid: a.cid,
        contentDisposition: a.contentDisposition ?? "attachment",
      })),
    });

    const raw = await composer.compile().build(); // Buffer
    const client = getSes();

    await client.send(
      new SendRawEmailCommand({
        RawMessage: { Data: raw },
      })
    );

    return;
  }

  // Simple path (fast + clean)
  const client = getSesv2();

  await client.send(
    new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: html, Charset: "UTF-8" },
            ...(text ? { Text: { Data: text, Charset: "UTF-8" } } : {}),
          },
        },
      },
      // Optional: if you use an SES Configuration Set
      // ConfigurationSetName: env.AWS_SES_CONFIGURATION_SET,
    })
  );
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number) => {
  let timeoutId: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("email_send_timeout")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId!);
  }
};

export async function sendEmailWithRetry(input: SendEmailInput, options: RetryOptions = {}) {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 500);
  const timeoutMs = Math.max(1000, options.timeoutMs ?? 5000);

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await withTimeout(sendEmail(input), timeoutMs);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await delay(baseDelayMs * attempt);
      }
    }
  }

  throw lastError;
}
