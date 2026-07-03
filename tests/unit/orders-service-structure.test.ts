import fs from "node:fs";
import path from "node:path";

describe("orders service structure", () => {
  it("delegates order-status response shaping and captured-payment reconciliation to focused helpers", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/services/orders-service.ts"),
      "utf8",
    );
    const helperSource = fs.readFileSync(
      path.join(process.cwd(), "src/services/order-status-helpers.ts"),
      "utf8",
    );

    expect(source).toContain("@/services/order-status-helpers");
    expect(helperSource).toContain("buildOrderStatusResponse");
    expect(helperSource).toContain("reconcileCapturedOrderPayment");
  });
});
