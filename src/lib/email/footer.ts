// src/lib/email/footer.ts
import { env } from "@/config/env";
import {
  EMAIL_BRAND,
  EMAIL_COLORS,
  EMAIL_FONT_STACK,
  emailStyles,
} from "@/lib/email/theme";

const siteUrl = env.NEXT_PUBLIC_SITE_URL;

export const emailFooterHtml = () => `
  <tr>
    <td style="padding:18px 24px 24px;border-top:1px solid ${EMAIL_COLORS.border};">
      <div style="font-size:11px;line-height:1.7;color:${EMAIL_COLORS.subtle};font-family:${EMAIL_FONT_STACK};">
        <div style="font-weight:700;color:${EMAIL_COLORS.text};letter-spacing:0.22em;text-transform:uppercase;">
          ${EMAIL_BRAND.name}
        </div>
        <div style="margin-top:4px;color:${EMAIL_COLORS.muted};">Simpsonville, SC</div>
        <div style="margin-top:8px;">
          <a href="${siteUrl}/contact" style="${emailStyles.link}">Contact</a>
          &nbsp;|&nbsp;
          <a href="${siteUrl}/shipping" style="${emailStyles.link}">Shipping</a>
          &nbsp;|&nbsp;
          <a href="${siteUrl}/refunds" style="${emailStyles.link}">Returns &amp; Refunds</a>
        </div>
        <div style="margin-top:6px;color:${EMAIL_COLORS.muted};">
          Instagram: <a href="https://instagram.com/realdealkickzsc" style="${emailStyles.link}">@realdealkickzsc</a>
        </div>
      </div>
    </td>
  </tr>
`;

export const emailFooterText = () =>
  [
    "",
    EMAIL_BRAND.name,
    "Simpsonville, SC",
    `Contact: ${siteUrl}/contact`,
    `Shipping: ${siteUrl}/shipping`,
    `Returns & Refunds: ${siteUrl}/refunds`,
    "Instagram: @realdealkickzsc",
  ].join("\n");
