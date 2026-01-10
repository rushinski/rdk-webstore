import { BRAND_NAME } from "@/config/constants/brand";
import { emailFooterText } from "@/lib/email/footer";
import { renderEmailLayout } from "@/lib/email/template";
import { emailStyles } from "@/lib/email/theme";

export const buildPasswordUpdatedEmail = (accountUrl: string) => {
  const contentHtml = `
      <tr>
        <td style="padding:0 24px 10px;text-align:center;">
          <div style="${emailStyles.eyebrow}">Security notice</div>
          <h1 style="${emailStyles.heading}">Your password was updated</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 20px;text-align:center;">
          <p style="${emailStyles.copy}">
            We're confirming that your ${BRAND_NAME} account password was changed successfully.
          </p>
          <p style="margin:10px 0 0;${emailStyles.subcopy}">
            If you did not make this change, reset your password right away and contact support.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 24px;text-align:center;">
          <a href="${accountUrl}" style="${emailStyles.button}">Go to your account</a>
        </td>
      </tr>
    `;

  const html = renderEmailLayout({
    title: "Password Updated",
    preheader: `Your ${BRAND_NAME} password was updated.`,
    contentHtml,
  });

  const text = `Your password was updated

We're confirming that your ${BRAND_NAME} account password was changed successfully.
If you did not make this change, reset your password right away and contact support.
Review your account: ${accountUrl}
${emailFooterText()}
`;

  return { html, text };
};
