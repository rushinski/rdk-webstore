// app/auth/password/forgot/page.tsx
import { ForgotPasswordForm } from "../../components/auth-forms";

export default function ForgotPasswordPage() {
  return (
    <div className="max-w-sm mx-auto py-10">
      <h1 className="text-xl font-semibold mb-6 text-center">Reset Password</h1>
      <ForgotPasswordForm />
    </div>
  );
}
