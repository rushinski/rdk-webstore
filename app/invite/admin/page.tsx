"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { logError } from "@/lib/log";

type InviteState = "idle" | "accepting" | "accepted" | "error" | "missing";

type MeResponse = {
  user: { id: string; email: string } | null;
  profile: Record<string, unknown> | null;
};

export default function AdminInvitePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<InviteState>("idle");
  const [message, setMessage] = useState("");
  const [me, setMe] = useState<MeResponse | null>(null);

  const nextUrl = useMemo(() => {
    if (!token) {
      return "/invite/admin";
    }
    return `/invite/admin?token=${encodeURIComponent(token)}`;
  }, [token]);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const data = await response.json();
        setMe(data);
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_invite_load_me" });
      }
    };

    loadMe();
  }, []);

  useEffect(() => {
    if (!token) {
      setState("missing");
      setMessage("This invite link is missing a token.");
      return;
    }

    if (!me?.user || state !== "idle") {
      return;
    }

    const acceptInvite = async () => {
      setState("accepting");
      setMessage("Accepting invite...");

      try {
        const response = await fetch("/api/invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          setState("error");
          setMessage(data?.error ?? "Failed to accept invite.");
          return;
        }

        setState("accepted");
        setMessage("Invite accepted. Your account now has admin access.");
      } catch {
        setState("error");
        setMessage("Failed to accept invite.");
      }
    };

    acceptInvite();
  }, [token, me, state]);

  if (!token) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16">
        <div className="bg-zinc-900 border border-zinc-800/70 p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Invite link invalid</h1>
          <p className="text-zinc-400">This admin invite is missing a token.</p>
        </div>
      </div>
    );
  }

  if (!me?.user) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16">
        <div className="bg-zinc-900 border border-zinc-800/70 p-6 text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Admin invitation</h1>
          <p className="text-zinc-400">
            Sign in or create an account to accept this admin invitation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/auth/login?next=${encodeURIComponent(nextUrl)}`}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2"
            >
              Sign in
            </Link>
            <Link
              href={`/auth/register?next=${encodeURIComponent(nextUrl)}`}
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold px-5 py-2"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <div className="bg-zinc-900 border border-zinc-800/70 p-6 text-center space-y-3">
        <h1 className="text-2xl font-bold text-white">Admin invitation</h1>
        <p className="text-zinc-400">{message}</p>
        {state === "accepted" && (
          <Link
            href="/admin"
            className="inline-flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2"
          >
            Go to admin
          </Link>
        )}
      </div>
    </div>
  );
}
