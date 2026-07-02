import type { SalesLog } from "@/components/admin/nexus/stateDetailTypes";

type StateSalesLogResponse = {
  sales: SalesLog[];
  total: number;
};

export async function loadStateSalesLogRequest(
  stateCode: string,
  offset: number,
): Promise<StateSalesLogResponse> {
  const response = await fetch(
    `/api/admin/nexus/sales-log?stateCode=${stateCode}&limit=10&offset=${offset}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch sales log");
  }

  const result = await response.json().catch(() => null);

  return {
    sales: result?.sales ?? [],
    total: result?.total ?? 0,
  };
}
