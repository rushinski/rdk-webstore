import { SignupForm } from "../components/auth-forms";

export default function SignUpPage() {
  return (
    <div className="max-w-sm mx-auto py-10">
      <h1 className="text-xl font-semibold mb-6 text-center">Create Account</h1>
      <SignupForm />
    </div>
  );
}
