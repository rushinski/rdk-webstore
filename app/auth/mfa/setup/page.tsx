// app/auth/mfa/setup/page.tsx
import { EnrollmentForm } from "../../components/mfa/EnrollmentForm";

export default function Page() {
  return (
    <div className="max-w-sm mx-auto py-10">
      <h1 className="text-xl font-semibold mb-4 text-center">
        Set Up MFA
      </h1>

      <EnrollmentForm />
    </div>
  );
}
