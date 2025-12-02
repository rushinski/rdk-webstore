import { LoginForm } from "../components/auth-forms";

export default function LoginPage() {
  return (
    <div className="max-w-sm mx-auto py-10">
      <h1 className="text-xl font-semibold mb-6 text-center">Sign In</h1>
      <LoginForm />
    </div>
  );
}
