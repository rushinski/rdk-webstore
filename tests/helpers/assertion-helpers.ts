// tests/helpers/assertion-helpers.ts
export function expectDateRecent(date: string | Date, withinSeconds: number = 5) {
  const timestamp = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = Math.abs(now.getTime() - timestamp.getTime());
  
  expect(diff).toBeLessThan(withinSeconds * 1000);
}

export function expectEmailFormat(email: string) {
  expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
}

export function expectUUID(id: string) {
  expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
}

export function expectStrongPassword(password: string) {
  expect(password.length).toBeGreaterThanOrEqual(8);
  expect(password).toMatch(/[A-Z]/); // At least one uppercase
  expect(password).toMatch(/[a-z]/); // At least one lowercase
  expect(password).toMatch(/[0-9]/); // At least one number
}

export function expectSessionCookie(cookieHeader: string | null) {
  expect(cookieHeader).toBeTruthy();
  expect(cookieHeader).toContain("HttpOnly");
  expect(cookieHeader).toContain("SameSite");
}

export function expectNoCacheHeaders(headers: Record<string, string>) {
  expect(headers["cache-control"]).toBe("no-store");
}