// app/checkout/page.tsx
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CheckoutGate } from "@/components/checkout/CheckoutGate";

export default async function CheckoutGatePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/checkout/start");
  }

  return <CheckoutGate />;
}
