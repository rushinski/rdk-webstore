// src/services/mfa-service.ts
export async function mfaEnroll() {
  const res = await fetch("/api/auth/mfa/enroll", { method: "POST" });
  return res.json();
}

export async function mfaVerifyEnrollment(factorId: string, code: string) {
  const res = await fetch("/api/auth/mfa/verify-enrollment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ factorId, code }),
  });

  return res.json();
}

export async function mfaStartChallenge() {
  const res = await fetch("/api/auth/mfa/challenge/start", {
    method: "POST",
  });

  return res.json();
}

export async function mfaVerifyChallenge(
  factorId: string,
  challengeId: string,
  code: string
) {
  const res = await fetch("/api/auth/mfa/challenge/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ factorId, challengeId, code }),
  });

  return res.json();
}
