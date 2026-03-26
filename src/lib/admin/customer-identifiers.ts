import crypto from "node:crypto";

export type CustomerIdentity =
  | { kind: "account"; userId: string }
  | { kind: "guest"; email: string };

export function normalizeCustomerEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildCustomerRouteId(identity: CustomerIdentity) {
  if (identity.kind === "account") {
    return `acct_${identity.userId}`;
  }

  return `guest_${encodeURIComponent(normalizeCustomerEmail(identity.email))}`;
}

export function parseCustomerRouteId(routeId: string): CustomerIdentity | null {
  if (routeId.startsWith("acct_")) {
    const userId = routeId.slice("acct_".length).trim();
    return userId ? { kind: "account", userId } : null;
  }

  if (routeId.startsWith("guest_")) {
    const rawValue = routeId.slice("guest_".length).trim();
    if (!rawValue) {
      return null;
    }

    try {
      const decodedEmail = decodeURIComponent(rawValue);
      if (decodedEmail.includes("@")) {
        return { kind: "guest", email: normalizeCustomerEmail(decodedEmail) };
      }
    } catch {}

    try {
      const email = Buffer.from(rawValue, "base64url").toString("utf8");
      return email ? { kind: "guest", email: normalizeCustomerEmail(email) } : null;
    } catch {
      return null;
    }
  }

  return null;
}

export function buildCustomerDisplayId(identity: CustomerIdentity) {
  if (identity.kind === "account") {
    return `ACC-${identity.userId.slice(0, 8).toUpperCase()}`;
  }

  const digest = crypto
    .createHash("sha256")
    .update(normalizeCustomerEmail(identity.email))
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();

  return `GST-${digest}`;
}
