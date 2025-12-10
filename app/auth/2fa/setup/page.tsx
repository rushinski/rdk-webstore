// app/auth/2fa/setup/page.tsx
import { EnrollmentForm } from "../../../../src/components/auth/2fa/EnrollmentForm";

export default function Page() {
  return (
    <div className="max-w-sm mx-auto py-10">
      <h1 className="text-xl font-semibold mb-4 text-center">Set Up MFA</h1>

      <EnrollmentForm />
    </div>
  );
}
