import fs from "node:fs";
import path from "node:path";

describe("tag modals structure", () => {
  it("delegates create, edit, and disable modal surfaces to focused components", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/catalog/components/TagModals.tsx"),
      "utf8",
    );

    expect(source).toContain("./CreateTagModals");
    expect(source).toContain("./EditTagModal");
    expect(source).toContain("./ConfirmDisableTagModal");
    expect(source).toContain("<CreateTagModals");
    expect(source).toContain("<EditTagModal");
    expect(source).toContain("<ConfirmDisableTagModal");
  });
});
