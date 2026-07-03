import { NextRequest } from "next/server";

import { checkCsrf } from "@/proxy/csrf";

describe("checkCsrf", () => {
  it("bypasses CSRF checks for configured webhook routes", () => {
    const request = new NextRequest("https://example.com/api/webhooks/shippo", {
      method: "POST",
    });

    const result = checkCsrf(request, "req-1");

    expect(result).toBeNull();
  });
});
