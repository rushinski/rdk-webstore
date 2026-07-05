import { redirect } from "next/navigation";

import AuthShell from "@/components/auth/ui/AuthShell";
import { RegisterForm } from "@/components/auth/register/RegisterForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function RegisterPageContent() {
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
