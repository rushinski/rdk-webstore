// app/checkout/page.tsx
import { CheckoutGatePageContent } from "@/modules/checkout";

export const dynamic = "force-dynamic";

export default async function CheckoutGatePage() {
  return <CheckoutGatePageContent />;
}
