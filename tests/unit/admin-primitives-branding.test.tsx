import { renderToStaticMarkup } from "react-dom/server";

import { AdminPageHeader } from "@/modules/shared/presentation/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/modules/shared/presentation/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/modules/shared/presentation/admin/ui/AdminStatusBadge";

describe("admin primitives", () => {
  it("render with solesneakers admin tokens", () => {
    const html = renderToStaticMarkup(
      <>
        <AdminPageHeader title="Dashboard" description="Overview" />
        <AdminSectionCard title="Orders">body</AdminSectionCard>
        <AdminStatusBadge tone="neutral">Open</AdminStatusBadge>
      </>,
    );

    expect(html).toContain("Dashboard");
    expect(html).toContain("Overview");
    expect(html).toContain("Orders");
    expect(html).toContain("Open");
    expect(html).toContain("brand-surface");
    expect(html).not.toContain("bg-zinc-900");
  });
});
