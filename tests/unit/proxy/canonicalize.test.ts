import { canonicalizePath } from "@/proxy/canonicalize";
import { makeRequest } from "./helpers";

jest.mock("@/lib/log", () => ({ log: jest.fn() }));

describe("canonicalizePath", () => {
  it("returns null when path is already canonical", () => {
    const req = makeRequest({ url: "https://x.test/products" });
    expect(canonicalizePath(req, "req_1")).toBeNull();
  });

  it("collapses multiple slashes + removes trailing slash + lowercases", () => {
    const req = makeRequest({ url: "https://x.test/Products//Nike///" });
    const res = canonicalizePath(req, "req_1");
    expect(res?.status).toBe(308);
    expect(res?.headers.get("location")).toBe("https://x.test/products/nike");
  });

  it("resolves dot segments (path traversal defense)", () => {
    const req = makeRequest({ url: "https://x.test/admin/../api/secret" });
    expect(canonicalizePath(req, "req_1")).toBeNull();
    expect(req.nextUrl.pathname).toBe("/api/secret");
  });

  it("preserves query string and fragment", () => {
    const req = makeRequest({ url: "https://x.test/Products?Sort=DESC#reviews" });
    const res = canonicalizePath(req, "req_1");
    expect(res?.headers.get("location")).toBe("https://x.test/products?Sort=DESC#reviews");
  });

  it("never turns root '/' into empty", () => {
    const req = makeRequest({ url: "https://x.test/" });
    expect(canonicalizePath(req, "req_1")).toBeNull();
  });

  it("handles extreme long paths without throwing", () => {
    const long = "/P".repeat(6000) + "///";
    const req = makeRequest({ url: `https://x.test${long}` });
    expect(() => canonicalizePath(req, "req_1")).not.toThrow();
  });
});
