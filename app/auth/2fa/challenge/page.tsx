// app/auth/2fa/challenge/page.tsx
import { ChallengeForm } from "@/components/auth/2fa/ChallengeForm";

export default function Page() {
  return (
    <div className="max-w-sm mx-auto py-10">
      <h1 className="text-xl font-semibold mb-4 text-center">
        Confirm your sign-in
      </h1>

      <ChallengeForm />
    </div>
  );
}
