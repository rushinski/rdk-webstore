// tests/helpers/api-helpers.ts
export async function makeAuthenticatedRequest(
  endpoint: string,
  method: string,
  accessToken: string,
  body?: any
) {
  const response = await fetch(`http://localhost:3000${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: `sb-access-token=${accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return {
    status: response.status,
    data: await response.json().catch(() => null),
    headers: Object.fromEntries(response.headers.entries()),
  };
}

export async function expectAPIError(
  response: { status: number; data: any },
  expectedStatus: number,
  errorPattern?: RegExp
) {
  expect(response.status).toBe(expectedStatus);
  expect(response.data.ok).toBe(false);
  
  if (errorPattern) {
    expect(response.data.error).toMatch(errorPattern);
  }
}

export async function expectAPISuccess(
  response: { status: number; data: any },
  additionalChecks?: (data: any) => void
) {
  expect(response.status).toBe(200);
  expect(response.data.ok).toBe(true);
  
  if (additionalChecks) {
    additionalChecks(response.data);
  }
}

export function generateTestEmail(prefix: string = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`;
}

export function generateStrongPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}