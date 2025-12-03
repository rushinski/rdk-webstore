// app/auth/components/mfa/ChallengeForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  mfaStartChallenge,
  mfaVerifyChallenge,
} from "@/services/mfa-service";

export function ChallengeForm() {
  const router = useRouter();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await mfaStartChallenge();
      if (res.error) return setMsg(res.error);

      setFactorId(res.factorId);
      setChallengeId(res.challengeId);
    })();
  }, []);

  async function verify() {
    if (!factorId || !challengeId) {
      return setMsg("Challenge not initialized.");
    }

    const res = await mfaVerifyChallenge(factorId, challengeId, code);
    if (res.error) return setMsg(res.error);

    router.push("/admin");
  }

  return (
    <div>
      <input
        placeholder="6-digit code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      {msg && <p>{msg}</p>}

      <button onClick={verify}>Verify</button>
    </div>
  );
}
