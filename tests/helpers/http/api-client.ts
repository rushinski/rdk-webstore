// tests/helpers/http/api-client.ts
import { testConfig } from "../config";

type Json = any;

export async function httpJson(params: {
  endpoint: string;
  method?: string;
  accessToken?: string;
  body?: Json;
}) {
  const { endpoint, method = "GET", accessToken, body } = params;

  const url = new URL(endpoint, testConfig.baseUrl).toString();

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Cookie: `sb-access-token=${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return {
    status: response.status,
    data: await response.json().catch(() => null),
    headers: Object.fromEntries(response.headers.entries()),
  };
}

export function expectAPIError(
  response: { status: number; data: any },
  expectedStatus: number,
  errorPattern?: RegExp
) {
  expect(response.status).toBe(expectedStatus);
  expect(response.data?.ok).toBe(false);

  if (errorPattern) {
    expect(response.data?.error).toMatch(errorPattern);
  }
}

export function expectAPISuccess(
  response: { status: number; data: any },
  additionalChecks?: (data: any) => void
) {
  expect(response.status).toBe(200);
  expect(response.data?.ok).toBe(true);

  if (additionalChecks) additionalChecks(response.data);
}

export function generateTestEmail(prefix: string = "test") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}@test.com`;
}

export function generateStrongPassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
  return password;
}
