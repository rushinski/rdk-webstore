import fs from "node:fs";
import path from "node:path";

describe("orders module migration structure", () => {
  it("makes module application and infrastructure files the source of truth", () => {
    const ordersServiceSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/application/orders-service.ts",
      ),
      "utf8",
    );
    const orderStatusHelperSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/application/order-status-helpers.ts",
      ),
      "utf8",
    );
    const ordersRepoSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/infrastructure/orders-repo.ts",
      ),
      "utf8",
    );
    const ordersRepoHelperSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/orders/infrastructure/orders-repo-helpers.ts",
      ),
      "utf8",
    );

    expect(ordersServiceSource).toContain("export class OrdersService");
    expect(orderStatusHelperSource).toContain("buildOrderStatusResponse");
    expect(ordersRepoSource).toContain("export class OrdersRepository");
    expect(ordersRepoHelperSource).toContain("ORDER_LIST_SELECT");
  });

  it("keeps legacy shared paths as thin re-export shims", () => {
    const legacyOrdersServiceSource = fs.readFileSync(
      path.join(process.cwd(), "src/services/orders-service.ts"),
      "utf8",
    );
    const legacyOrderStatusHelperSource = fs.readFileSync(
      path.join(process.cwd(), "src/services/order-status-helpers.ts"),
      "utf8",
    );
    const legacyOrdersRepoSource = fs.readFileSync(
      path.join(process.cwd(), "src/repositories/orders-repo.ts"),
      "utf8",
    );
    const legacyOrdersRepoHelperSource = fs.readFileSync(
      path.join(process.cwd(), "src/repositories/orders-repo-helpers.ts"),
      "utf8",
    );

    expect(legacyOrdersServiceSource.trim()).toBe(
      'export { OrdersService } from "@/modules/orders/application/orders-service";',
    );
    expect(legacyOrderStatusHelperSource).toContain(
      '@/modules/orders/application/order-status-helpers',
    );
    expect(legacyOrdersRepoSource).toContain(
      '@/modules/orders/infrastructure/orders-repo',
    );
    expect(legacyOrdersRepoHelperSource).toContain(
      '@/modules/orders/infrastructure/orders-repo-helpers',
    );
  });
});
