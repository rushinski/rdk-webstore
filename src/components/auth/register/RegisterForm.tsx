// src/components/auth/register/RegisterForm.tsx
"use client";

import { useReducer } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { isPasswordValid } from "@/lib/validation/password";
import { AuthHeader } from "@/components/auth/ui/AuthHeader";
import { authStyles } from "@/components/auth/ui/authStyles";

import { SocialButton } from "../ui/SocialButton";
import { PasswordField } from "../login/PasswordField";

import { PasswordRequirements } from "./PasswordRequirements";

type State = {
  error: string | null;
  isSubmitting: boolean;
  password: string;
  confirmPassword: string;
  updatesOptIn: boolean;
};

type Action =
  | { type: "SET_PASSWORD"; password: string }
  | { type: "SET_CONFIRM_PASSWORD"; confirmPassword: string }
  | { type: "SET_UPDATES_OPT_IN"; value: boolean }
  | { type: "START_SUBMIT" }
  | { type: "ERROR"; error: string }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_PASSWORD":
      return { ...state, password: action.password };
    case "SET_CONFIRM_PASSWORD":
      return { ...state, confirmPassword: action.confirmPassword };
    case "SET_UPDATES_OPT_IN":
      return { ...state, updatesOptIn: action.value };
    case "START_SUBMIT":
      return { ...state, isSubmitting: true, error: null };
    case "ERROR":
      return { ...state, isSubmitting: false, error: action.error };
    case "RESET":
      return {
        ...state,
        isSubmitting: false,
        error: null,
        password: "",
        confirmPassword: "",
      };
    default:
      return state;
  }
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, dispatch] = useReducer(reducer, {
    error: null,
    isSubmitting: false,
    password: "",
    confirmPassword: "",
    updatesOptIn: false,
  });

  const nextUrl = searchParams.get("next") || "/";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    const email = String(formData.get("email") ?? "").trim();
    const passwordValue = String(formData.get("password") ?? "");
    const confirmValue = String(formData.get("confirmPassword") ?? "");

    if (passwordValue !== confirmValue) {
      dispatch({ type: "ERROR", error: "Passwords do not match." });
      return;
    }

    if (!isPasswordValid(passwordValue)) {
      dispatch({ type: "ERROR", error: "Password does not meet minimum requirements." });
      return;
    }

    dispatch({ type: "START_SUBMIT" });

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: passwordValue,
          updatesOptIn: state.updatesOptIn,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        dispatch({ type: "ERROR", error: json.error ?? "Sign up failed" });
        return;
      }

      const verifyUrl = `/auth/login?flow=verify-email&verifyFlow=signup&email=${encodeURIComponent(email)}${nextUrl !== "/" ? `&next=${encodeURIComponent(nextUrl)}` : ""}`;
      router.push(verifyUrl);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
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

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <AuthHeader
          title="Create account"
          description="Join thousands of verified buyers"
        />

        {state.error && <div className={authStyles.errorBox}>{state.error}</div>}

        {/* <div className="space-y-3">
          <SocialButton provider="google" label="Continue with Google" />
        </div>

        <div className={authStyles.divider}>
          <div className={authStyles.dividerLine} />
          <span>or</span>
          <div className={authStyles.dividerLine} />
        </div> */}

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
              disabled={state.isSubmitting}
            />
          </div>

          <PasswordField
            name="password"
            label="Password"
            value={state.password}
            onChange={(password) => dispatch({ type: "SET_PASSWORD", password })}
            autoComplete="new-password"
          />

          <PasswordField
            name="confirmPassword"
            label="Confirm password"
            value={state.confirmPassword}
            onChange={(confirmPassword) =>
              dispatch({ type: "SET_CONFIRM_PASSWORD", confirmPassword })
            }
            autoComplete="new-password"
          />

          <PasswordRequirements password={state.password} />
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={state.updatesOptIn}
            onChange={(e) =>
              dispatch({ type: "SET_UPDATES_OPT_IN", value: e.target.checked })
            }
            className="rdk-checkbox mt-0.5"
            disabled={state.isSubmitting}
          />
          <span className="text-sm text-zinc-400">
            Send me drop alerts and exclusive offers
          </span>
        </label>

        <button
          type="submit"
          disabled={state.isSubmitting}
          className={authStyles.primaryButton}
        >
          {state.isSubmitting ? "Creating account..." : "Create account"}
        </button>

        <p className="text-xs text-center text-zinc-600">
          By signing up, you agree to our{" "}
          <Link href="/legal/terms" className="underline hover:text-zinc-400">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline hover:text-zinc-400">
            Privacy Policy
          </Link>
        </p>

        <p className="text-sm text-center text-zinc-500">
          Already have an account?{" "}
          <Link
            href={`/auth/login${nextUrl !== "/" ? `?next=${encodeURIComponent(nextUrl)}` : ""}`}
            className={authStyles.inlineAccentLink}
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
