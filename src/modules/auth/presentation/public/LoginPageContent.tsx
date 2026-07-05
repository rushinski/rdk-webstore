import { redirect } from "next/navigation";

import AuthShell from "@/components/auth/ui/AuthShell";
import { LoginForm } from "@/components/auth/login/LoginFormRouter";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function LoginPageContent() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/account");
  }

  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
