// src/lib/http/request-id.ts (NEW)

import { randomUUID } from "crypto";

import { security } from "@/config/security";

export function generateRequestId(): string {
  return randomUUID();
}

export function getRequestIdFromHeaders(headers: Headers): string {
  const header = headers.get(security.proxy.requestIdHeader);
  if (header && header.trim().length > 0) {
    return header;
  }
  return generateRequestId();
}
