import { renderToStaticMarkup } from "react-dom/server";

import NexusMap from "@/modules/nexus/presentation/admin/NexusMap";

jest.mock("@vnedyalk0v/react19-simple-maps", () => ({
  ComposableMap: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
  Geographies: ({
    children,
  }: {
    children: (args: {
      geographies: Array<{ rsmKey: string; properties: { name: string } }>;
    }) => React.ReactNode;
  }) => <g>{children({ geographies: [] })}</g>,
  Geography: () => null,
}));

describe("admin nexus branding", () => {
  it("renders the nexus map on shared admin surfaces", () => {
    const html = renderToStaticMarkup(
      <NexusMap
        states={[]}
        onStateClick={() => {}}
        getStateColor={() => "#374151"}
        formatCurrency={() => "$0"}
        legendItems={[{ label: "Registered", color: "#22c55e" }]}
      />,
    );

    expect(html).toContain("United States Nexus Map");
    expect(html).toContain("brand-surface");
    expect(html).not.toContain("bg-zinc-900");
  });
});
