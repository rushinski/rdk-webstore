export type JWTPayload = Record<string, unknown> & {
  sub?: string;
  iat?: number;
  exp?: number;
};

const encode = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const decode = (value: string) =>
  JSON.parse(Buffer.from(value, "base64url").toString("utf8"));

export class EncryptJWT {
  private payload: JWTPayload;
  private header: Record<string, unknown> = {};

  constructor(payload: JWTPayload) {
    this.payload = { ...payload };
  }

  setProtectedHeader(header: Record<string, unknown>) {
    this.header = { ...header };
    return this;
  }

  setIssuedAt(iat: number) {
    this.payload.iat = iat;
    return this;
  }

  setExpirationTime(exp: number) {
    this.payload.exp = exp;
    return this;
  }

  async encrypt(_key: Uint8Array) {
    const nonce = Math.random().toString(36).slice(2);
    const payloadWithNonce = { ...this.payload, n: nonce };
    return `${encode(this.header)}.${encode(payloadWithNonce)}.${encode({ nonce })}`;
  }
}

export async function jwtDecrypt(token: string, _key: Uint8Array, _options?: unknown) {
  const parts = token.split(".");
  if (parts.length < 3) {
    throw new Error("invalid_token");
  }

  const protectedHeader = decode(parts[0]);
  const payload = decode(parts[1]);

  return { payload, protectedHeader };
}
