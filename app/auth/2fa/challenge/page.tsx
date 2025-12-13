import AuthShell from "@/components/auth/ui/AuthShell";
import { ChallengeForm } from "@/components/auth/2fa/ChallengeForm";

export default function Page() {
  return (
    <AuthShell leftVariant="login">
      <ChallengeForm />
    </AuthShell>
  );
}
