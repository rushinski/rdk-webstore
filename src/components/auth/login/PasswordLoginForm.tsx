// src/components/auth/login/PasswordLoginForm.tsx
"use client";

import { useReducer } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AuthHeader } from "@/components/auth/ui/AuthHeader";
import { authStyles } from "@/components/auth/ui/authStyles";
import { SocialButton } from "../ui/SocialButton";
import { PasswordField } from "./PasswordField";

interface PasswordLoginFormProps {
  onRequiresEmailVerification: (email: string) => void;
  onSwitchToOtp: () => void;
  onForgotPassword: () => void;
}

type State = {
  password: string;
  isSubmitting: boolean;
  error: string | null;
};

type Action =
  | { type: "SET_PASSWORD"; password: string }
  | { type: "START_SUBMIT" }
  | { type: "ERROR"; error: string }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_PASSWORD":
      return { ...state, password: action.password };
    case "START_SUBMIT":
      return { ...state, isSubmitting: true, error: null };
    case "ERROR":
      return { ...state, isSubmitting: false, error: action.error };
    case "RESET":
      return { ...state, isSubmitting: false, error: null };
    default:
      return state;
  }
}

export function PasswordLoginForm({
  onRequiresEmailVerification,
  onSwitchToOtp,
  onForgotPassword,
}: PasswordLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, dispatch] = useReducer(reducer, {
    password: "",
    isSubmitting: false,
    error: null,
  });

  const nextUrl = searchParams.get("next") || "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: "START_SUBMIT" });

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const email = String(formData.get("email") ?? "").trim();
    const passwordValue = String(formData.get("password") ?? "");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: passwordValue }),
      });

      const json = await res.json();

      if (json.requiresEmailVerification) {
        onRequiresEmailVerification(email);
        dispatch({ type: "RESET" });
        return;
      }

      if (!json.ok) {
        dispatch({ type: "ERROR", error: json.error ?? "Login failed" });
        return;
      }

      if (json.isAdmin && json.requiresTwoFASetup) {
        return router.push("/auth/2fa/setup");
      }
      if (json.isAdmin && json.requiresTwoFAChallenge) {
        return router.push("/auth/2fa/challenge");
      }

      const destination = json.isAdmin ? "/admin" : nextUrl;
      router.push(destination);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      dispatch({ type: "ERROR", error: message });
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href={nextUrl}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to shopping
      </Link>

      <form onSubmit={handleSubmit} className="space-y-6">
        <AuthHeader title="Sign in" />

        {state.error && <div className={authStyles.errorBox}>{state.error}</div>}

        <div className="space-y-3">
          <SocialButton provider="google" label="Continue with Google" />
        </div>

        <div className={authStyles.divider}>
          <div className={authStyles.dividerLine} />
          <span>or</span>
          <div className={authStyles.dividerLine} />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-white">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={authStyles.input}
              data-testid="login-email"
              disabled={state.isSubmitting}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-white">
                Password
              </label>
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs text-red-600 hover:text-red-500 transition-colors"
              >
                Forgot?
              </button>
            </div>
            <PasswordField
              name="password"
              label=""
              value={state.password}
              onChange={(password) => dispatch({ type: "SET_PASSWORD", password })}
              autoComplete="current-password"
              dataTestId="login-password"
            />
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="submit"
            disabled={state.isSubmitting}
            className={authStyles.primaryButton}
            data-testid="login-submit"
          >
            {state.isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          <button
            type="button"
            onClick={onSwitchToOtp}
            className="w-full text-center text-sm text-zinc-500 hover:text-white transition-colors"
          >
            Sign in with email code instead
          </button>
        </div>

        <p className="text-sm text-center text-zinc-500">
          Don't have an account?{" "}
          <Link
            href={`/auth/register${nextUrl !== "/" ? `?next=${encodeURIComponent(nextUrl)}` : ""}`}
            className={authStyles.inlineAccentLink}
          >
            Create account
          </Link>
        </p>
      </form>
    </div>
  );
}