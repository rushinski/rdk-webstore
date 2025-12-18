type CookieJar = Record<string, string | undefined>;

export function makeRequest(opts: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  cookies?: CookieJar;
}) {
  const u = new URL(opts.url);
  const headers = new Headers(opts.headers ?? {});
  const cookies = opts.cookies ?? {};

  const nextUrl = Object.assign(u, {
    clone: () => new URL(u.toString()),
    host: u.host,
    pathname: u.pathname,
  });

  return {
    method: opts.method ?? "GET",
    headers,
    nextUrl,
    url: u.toString(),
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name]! } : undefined),
    },
  } as any;
}
