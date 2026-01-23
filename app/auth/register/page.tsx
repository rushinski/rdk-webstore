// app/auth/register/page.tsx
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import AuthShell from "@/components/auth/ui/AuthShell";
import { RegisterForm } from "@/components/auth/register/RegisterForm";

export default async function RegisterPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/account");
  }

  return (
    <AuthShell leftVariant="register">
      <RegisterForm />
    </AuthShell>
  );
}
