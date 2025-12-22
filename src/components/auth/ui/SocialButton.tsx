// src/components/auth/ui/SocialButton.tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Provider = "google" | "facebook";

interface SocialButtonProps {
  provider: Provider;
  label: string;
  nextOverride?: string;
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M21.6 12.2273C21.6 11.5182 21.5364 10.8364 21.4182 10.1818H12V14.05H17.3818C17.15 15.3 16.4545 16.3455 15.4091 17.0455V19.5546H18.6C20.4727 17.8364 21.6 15.2727 21.6 12.2273Z"
        fill="#4285F4"
      />
      <path
        d="M12 21.9999C14.7 21.9999 16.9636 21.1045 18.6 19.5545L15.4091 17.0454C14.5091 17.6454 13.3545 18.0045 12 18.0045C9.39095 18.0045 7.19095 16.2727 6.4045 13.9H3.1095V16.4909C4.73677 19.759 8.09095 21.9999 12 21.9999Z"
        fill="#34A853"
      />
      <path
        d="M6.40455 13.9C6.19546 13.3 6.08182 12.6545 6.08182 11.9999C6.08182 11.3454 6.19546 10.6999 6.40455 10.0999V7.50903H3.10955C2.40455 8.86358 2 10.3863 2 11.9999C2 13.6136 2.40455 15.1363 3.10955 16.4908L6.40455 13.9Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.99545C13.4864 5.99545 14.8182 6.50909 15.8773 7.5L18.6727 4.70455C16.9636 3.10455 14.7 2.00001 12 2.00001C8.09095 2.00001 4.73677 4.24092 3.1095 7.5091L6.4045 10.1C7.19095 7.72728 9.39095 5.99545 12 5.99545Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06C2 17.083 5.657 21.245 10.438 22v-6.999H7.898v-2.94h2.54V9.845c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.196 2.238.196v2.47h-1.26c-1.243 0-1.63.775-1.63 1.567v1.882h2.773l-.443 2.94h-2.33V22C18.343 21.245 22 17.083 22 12.06Z" />
    </svg>
  );
}

export function SocialButton({
  provider,
  label,
  nextOverride,
}: SocialButtonProps) {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  const next = nextOverride ?? searchParams.get("next") ?? "/";

  const handleClick = async () => {
    try {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (error) {
        console.error("OAuth error:", error);
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="h-11 w-full flex items-center justify-center gap-3 bg-zinc-900 border border-zinc-800 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {provider === "google" ? <GoogleIcon /> : <FacebookIcon />}
      <span>{loading ? "Connecting..." : label}</span>
    </button>
  );
}