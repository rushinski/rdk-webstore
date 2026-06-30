import { renderToStaticMarkup } from "react-dom/server";

import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";

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
