import nodemailer from "nodemailer";
import { env } from "@/config/env";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
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

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const mailer = getTransporter();
  await mailer.sendMail({
    from: `"${env.SES_FROM_NAME}" <${env.SES_FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
  });
}
