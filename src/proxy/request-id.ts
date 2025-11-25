const { crypto } = globalThis;

export function createRequestId(prefix = "req") {
  return `${prefix}-${crypto.randomUUID()}`;
}
