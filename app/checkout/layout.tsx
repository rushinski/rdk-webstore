// app/checkout/layout.tsx
// Loads the NoFraud device fingerprinting script on all checkout pages.
// The snippet sets a device token cookie that the checkout form reads and sends
// as `nfToken` with the checkout POST for improved fraud screening accuracy.

import Script from "next/script";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const nofraudCode = process.env.NEXT_PUBLIC_NOFRAUD_CUSTOMER_CODE;

  return (
    <>
      {nofraudCode && (
        <Script
          src={`https://services.nofraud.com/js/${nofraudCode}/customer_code.js`}
          strategy="afterInteractive"
        />
      )}
      {children}
    </>
  );
}
