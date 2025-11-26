import { URL } from "url";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function createNextRequest(path: string, options: any = {}) {
  const url = new URL(`https://example.com${path}`);

  return {
    nextUrl: url,
    method: options.method ?? "GET",
    headers: new Map(Object.entries(options.headers ?? {})),
    cookies: {
      get: (name: string) => ({ value: options.cookies?.[name] }),
    },
  } as unknown as NextRequest;
}

export function createNextResponse() {
  return NextResponse.next();
}
