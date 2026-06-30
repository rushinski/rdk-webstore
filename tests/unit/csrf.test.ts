import { NextRequest } from "next/server";

import { checkCsrf } from "@/proxy/csrf";

describe("checkCsrf", () => {
  it("bypasses CSRF checks for the Payrilla webhook route", () => {
    const request = new NextRequest("https://example.com/api/webhooks/payrilla", {
      method: "POST",
    });

    const result = checkCsrf(request, "req-1");

    expect(result).toBeNull();
  });
});
