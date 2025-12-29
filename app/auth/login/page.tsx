// app/auth/login/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import AuthShell from "@/components/auth/ui/AuthShell";
import { LoginForm } from "@/components/auth/login/LoginFormRouter";

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/account");

  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
