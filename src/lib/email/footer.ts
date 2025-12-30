import { env } from "@/config/env";

const siteUrl = env.NEXT_PUBLIC_SITE_URL;

export const emailFooterHtml = () => `
  <tr>
    <td style="padding:18px 24px 24px;border-top:1px solid #1f1f22;">
      <div style="font-size:11px;line-height:1.7;color:#6b7280;">
        <div style="font-weight:700;color:#d1d5db;letter-spacing:0.12em;text-transform:uppercase;">
          Realdealkickzsc
        </div>
        <div>Simpsonville, SC</div>
        <div style="margin-top:6px;">
          <a href="${siteUrl}/contact" style="color:#9ca3af;text-decoration:none;">Contact</a>
          &nbsp;|&nbsp;
          <a href="${siteUrl}/shipping" style="color:#9ca3af;text-decoration:none;">Shipping</a>
          &nbsp;|&nbsp;
          <a href="${siteUrl}/refunds" style="color:#9ca3af;text-decoration:none;">Refunds</a>
        </div>
        <div style="margin-top:6px;">
          Instagram: <a href="https://instagram.com/realdealkickzllc" style="color:#9ca3af;text-decoration:none;">@realdealkickzllc</a>
        </div>
      </div>
    </td>
  </tr>
`;

export const emailFooterText = () =>
  [
    "",
    "Realdealkickzsc",
    "Simpsonville, SC",
    `Contact: ${siteUrl}/contact`,
    `Shipping: ${siteUrl}/shipping`,
    `Refunds: ${siteUrl}/refunds`,
    "Instagram: @realdealkickzllc",
  ].join("\n");
