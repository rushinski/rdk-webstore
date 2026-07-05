import AuthShell from "@/components/auth/ui/AuthShell";
import { ChallengeForm } from "@/components/auth/2fa/ChallengeForm";

export function TwoFactorChallengePageContent() {
  return (
    <AuthShell leftVariant="login">
      <ChallengeForm />
    </AuthShell>
  );
}
