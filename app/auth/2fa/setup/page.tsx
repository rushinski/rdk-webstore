// app/auth/2fa/challenge/page.tsx
import AuthShell from "@/components/auth/ui/AuthShell";
import { EnrollmentForm } from "@/components/auth/2fa/EnrollmentForm";

export default function Page() {
  return (
    <AuthShell leftVariant="login">
      <EnrollmentForm />
    </AuthShell>
  );
}
