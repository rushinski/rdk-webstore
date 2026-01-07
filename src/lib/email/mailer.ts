// src/lib/email/mailer.ts
import nodemailer from "nodemailer";
import { env } from "@/config/env";

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

let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (transporter) return transporter;
  const port = Number(env.SES_SMTP_PORT);
  transporter = nodemailer.createTransport({
    host: env.SES_SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: env.SES_SMTP_USER,
      pass: env.SES_SMTP_PASS,
    },
  });
  return transporter;
};

export async function sendEmail({ to, subject, html, text, attachments }: SendEmailInput) {
  const mailer = getTransporter();
  await mailer.sendMail({
    from: `"${env.SES_FROM_NAME}" <${env.SES_FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
    attachments,
  });
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

export async function sendEmailWithRetry(
  input: SendEmailInput,
  options: RetryOptions = {}
) {
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
