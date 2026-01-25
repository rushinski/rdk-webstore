// src/services/mfa-service.ts
export async function mfaEnroll(skipQR = false) {
  const res = await fetch(`/api/auth/2fa/enroll${skipQR ? "?skipQR=true" : ""}`, {
    method: "POST",
  });
  return res.json();
}

export async function mfaVerifyEnrollment(factorId: string, code: string) {
  const res = await fetch("/api/auth/2fa/verify-enrollment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ factorId, code }),
  });
  return res.json();
}

export async function mfaVerifyChallenge(code: string) {
  const res = await fetch("/api/auth/2fa/challenge/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  return res.json();
}
