import { BRAND_NAME } from "@/config/constants/brand";
import { emailFooterText } from "@/lib/email/footer";
import { renderEmailLayout } from "@/lib/email/template";
import { emailStyles } from "@/lib/email/theme";

export const buildSubscriptionConfirmedEmail = () => {
  const contentHtml = `
      <tr>
        <td style="padding:0 24px 10px;text-align:center;">
          <div style="${emailStyles.eyebrow}">Subscription confirmed</div>
          <h1 style="${emailStyles.heading}">Thanks for signing up</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 24px;text-align:center;">
          <p style="${emailStyles.copy}">You're all set to receive updates from ${BRAND_NAME}.</p>
        </td>
      </tr>
    `;

  const html = renderEmailLayout({
    title: "Subscription confirmed",
    preheader: `You're subscribed to ${BRAND_NAME} updates.`,
    contentHtml,
  });

  const text = `Subscription confirmed
Thanks for signing up for ${BRAND_NAME} updates.
${emailFooterText()}
`;

  return { html, text };
};

export const buildSubscriptionConfirmationEmail = (confirmUrl: string) => {
  const contentHtml = `
        <tr>
          <td style="padding:0 24px 10px;text-align:center;">
            <div style="${emailStyles.eyebrow}">Confirm subscription</div>
            <h1 style="${emailStyles.heading}">Finish subscribing</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 20px;text-align:center;">
            <p style="${emailStyles.copy}">Confirm your email to receive updates from ${BRAND_NAME}.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 24px;text-align:center;">
            <a href="${confirmUrl}" style="${emailStyles.button}">Confirm subscription</a>
            <p style="margin:14px 0 0;${emailStyles.subcopy}">This link expires in 24 hours.</p>
            <p style="margin:6px 0 0;${emailStyles.subcopy}">If you didn't request this email, you can safely ignore it.</p>
          </td>
        </tr>
      `;

  const html = renderEmailLayout({
    title: "Confirm your subscription",
    preheader: `Confirm your email to get ${BRAND_NAME} updates.`,
    contentHtml,
  });

  const text = `Confirm your ${BRAND_NAME} subscription
Confirm here: ${confirmUrl}
This link expires in 24 hours.
If you didn't request this email, you can safely ignore it.
${emailFooterText()}
`;

  return { html, text };
};
