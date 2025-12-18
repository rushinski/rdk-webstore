import { checkCsrf } from "@/proxy/csrf";
import { makeRequest } from "./helpers";

jest.mock("@/lib/log", () => ({ log: jest.fn() }));

describe("checkCsrf", () => {
  it("does nothing for safe methods even without Origin", () => {
    const req = makeRequest({ url: "https://x.test/api/x", method: "GET" });
    expect(checkCsrf(req, "req_1")).toBeNull();
  });

  it("blocks missing Origin on unsafe methods", () => {
    const req = makeRequest({ url: "https://x.test/api/x", method: "POST" });
    const res = checkCsrf(req, "req_1");
    expect(res?.status).toBe(403);
  });

  it("blocks Origin=null on unsafe methods", () => {
    const req = makeRequest({
      url: "https://x.test/api/x",
      method: "POST",
      headers: { origin: "null", host: "x.test" },
    });
    const res = checkCsrf(req, "req_1");
    expect(res?.status).toBe(403);
  });

  it("blocks malformed Origin", () => {
    const req = makeRequest({
      url: "https://x.test/api/x",
      method: "POST",
      headers: { origin: "::::not-a-url", host: "x.test" },
    });
    const res = checkCsrf(req, "req_1");
    expect(res?.status).toBe(403);
  });

  it("blocks Origin host mismatch", () => {
    const req = makeRequest({
      url: "https://x.test/api/x",
      method: "POST",
      headers: { origin: "https://evil.test", host: "x.test" },
    });
    const res = checkCsrf(req, "req_1");
    expect(res?.status).toBe(403);
  });

  it("allows matching Origin host", () => {
    const req = makeRequest({
      url: "https://x.test/api/x",
      method: "POST",
      headers: { origin: "https://x.test", host: "x.test" },
    });
    expect(checkCsrf(req, "req_1")).toBeNull();
  });

  it("bypasses webhook route (Origin not required there)", () => {
    const req = makeRequest({
      url: "https://x.test/api/stripe/webhook",
      method: "POST",
      headers: { host: "x.test" },
    });
    expect(checkCsrf(req, "req_1")).toBeNull();
  });
});
