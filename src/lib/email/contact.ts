import { emailFooterText } from "@/lib/email/footer";
import { renderEmailLayout } from "@/lib/email/template";
import { EMAIL_COLORS, emailStyles } from "@/lib/email/theme";

type ContactSource = "contact_form" | "bug_report";

type ContactAttachmentPreview = {
  filename: string;
  cid?: string | null;
};

type ContactEmailInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
  source: ContactSource;
  attachments: ContactAttachmentPreview[];
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const buildContactSubmissionEmail = (input: ContactEmailInput) => {
  const safeName = escapeHtml(input.name);
  const safeEmail = escapeHtml(input.email);
  const safeSubject = escapeHtml(input.subject);
  const safeMessage = escapeHtml(input.message);
  const heading = input.source === "bug_report" ? "Bug Report" : "Contact Form";
  const headline =
    input.source === "bug_report" ? "New bug report received" : "New message received";
  const textHeading =
    input.source === "bug_report"
      ? "New Bug Report Submission"
      : "New Contact Form Submission";
  const attachmentsText =
    input.attachments.length > 0
      ? input.attachments.map((file) => file.filename).join(", ")
      : "None";
  const attachmentsHtml =
    input.attachments.length > 0
      ? `
        <tr>
          <td style="padding:0 24px 24px;">
            <div style="${emailStyles.labelAccent}">Attachments</div>
            <div style="margin-top:10px;${emailStyles.panel}padding:14px;font-size:13px;line-height:1.7;color:${EMAIL_COLORS.muted};">
              ${input.attachments.map((file) => escapeHtml(file.filename)).join("<br />")}
            </div>
            <div style="margin-top:14px;">
              ${input.attachments
                .map((file) =>
                  file.cid
                    ? `<div style="margin-top:12px;">
                        <img
                          src="cid:${file.cid}"
                          alt="${escapeHtml(file.filename)}"
                          style="display:block;width:100%;max-width:420px;border:1px solid ${EMAIL_COLORS.panelBorder};background:${EMAIL_COLORS.surface};"
                        />
                      </div>`
                    : ""
                )
                .join("")}
            </div>
          </td>
        </tr>
      `
      : "";

  const contentHtml = `
      <tr>
        <td style="padding:0 24px 10px;text-align:center;">
          <div style="${emailStyles.eyebrow}">${heading}</div>
          <h1 style="${emailStyles.heading}">${headline}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${emailStyles.panel}">
            <tr>
              <td style="padding:12px;">
                <div style="${emailStyles.label}">From</div>
                <div style="font-size:15px;color:#ffffff;font-weight:700;margin-top:4px;">
                  ${safeName}
                </div>
                <div style="font-size:13px;color:${EMAIL_COLORS.muted};margin-top:6px;">
                  ${safeEmail}
                </div>
              </td>
              <td style="padding:12px;text-align:right;">
                <div style="${emailStyles.label}">Subject</div>
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
          <div style="${emailStyles.labelAccent}">Message</div>
          <div style="margin-top:10px;${emailStyles.panel}padding:14px;font-size:13px;line-height:1.7;color:${EMAIL_COLORS.muted};">
            ${safeMessage.replace(/\n/g, "<br />")}
          </div>
        </td>
      </tr>
      ${attachmentsHtml}
    `;

  const html = renderEmailLayout({
    title: headline,
    preheader: textHeading,
    contentHtml,
  });

  const text = `${textHeading}
Name: ${input.name}
Email: ${input.email}
Subject: ${input.subject}
Attachments: ${attachmentsText}
Message:
${input.message}
${emailFooterText()}
`;

  const subjectPrefix = input.source === "bug_report" ? "Bug report" : "Contact";

  return { html, text, subjectPrefix };
};
