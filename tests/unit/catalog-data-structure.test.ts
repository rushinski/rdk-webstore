import fs from "node:fs";
import path from "node:path";

describe("catalog data structure", () => {
  it("delegates catalog loading requests to a focused request module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/catalog/useAdminCatalogData.ts"),
      "utf8",
    );

    expect(source).toContain("@/components/admin/catalog/catalogDataRequests");
    expect(source).toContain("loadAdminCatalogDataRequest()");
  });

  it("keeps catalog endpoint fan-out in the request module", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/catalog/catalogDataRequests.ts"),
      "utf8",
    );

    expect(source).toContain(
      'fetch("/api/admin/catalog/brand-groups?includeInactive=1")',
    );
    expect(source).toContain('fetch("/api/admin/catalog/candidates?status=new")');
    expect(source).toContain("Promise.all");
  });
});
