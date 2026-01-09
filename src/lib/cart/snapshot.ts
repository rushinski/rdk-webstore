// src/lib/cart/snapshot.ts

import crypto from "crypto";
import type { CartItem } from "@/types/views/cart";
import { env } from "@/config/env";

const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;

type SnapshotPayload = {
  items: CartItem[];
  createdAt: string;
};

const signPayload = (data: string) =>
  crypto.createHmac("sha256", env.ORDER_ACCESS_TOKEN_SECRET).update(data).digest("hex");

export function serializeCartSnapshot(items: CartItem[]): string {
  const payload: SnapshotPayload = {
    items,
    createdAt: new Date().toISOString(),
  };
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(data);
  return `${data}.${signature}`;
}

export function parseCartSnapshot(value: string): CartItem[] | null {
  const [data, signature] = value.split(".");
  if (!data || !signature) return null;

  const expected = signPayload(data);
  const signatureBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (signatureBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(signatureBuf, expectedBuf)) return null;

  let payload: SnapshotPayload;
  try {
    const raw = Buffer.from(data, "base64url").toString("utf8");
    payload = JSON.parse(raw) as SnapshotPayload;
  } catch {
    return null;
  }

  if (!payload?.createdAt || !Array.isArray(payload.items)) return null;
  const createdAt = new Date(payload.createdAt).getTime();
  if (!Number.isFinite(createdAt)) return null;
  if (Date.now() - createdAt > SNAPSHOT_TTL_MS) return null;

  return payload.items;
}
