// app/auth/password/update/page.tsx
import { UpdatePasswordForm } from "../../components/auth-forms";

export default function UpdatePasswordPage() {
  return (
    <div className="max-w-sm mx-auto py-10">
      <h1 className="text-xl font-semibold mb-4">Reset your password</h1>
      <UpdatePasswordForm />
    </div>
  );
}
