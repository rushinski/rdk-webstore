import { TextEncoder, TextDecoder } from "node:util";
import "./tests/helpers/env";

(globalThis as any).TextEncoder = TextEncoder;
(globalThis as any).TextDecoder = TextDecoder;

if (typeof (globalThis as any).atob !== "function") {
  (globalThis as any).atob = (b64: string) =>
    Buffer.from(b64, "base64").toString("binary");
}

if (!globalThis.crypto) {
  (globalThis as any).crypto = require("node:crypto").webcrypto;
}

jest
  .spyOn(globalThis.crypto, "randomUUID")
  .mockReturnValue("00000000-0000-0000-0000-000000000000");
