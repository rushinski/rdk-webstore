// src/lib/http/request-id.ts (NEW)

import { randomUUID } from 'crypto';

export function generateRequestId(): string {
  return randomUUID();
}