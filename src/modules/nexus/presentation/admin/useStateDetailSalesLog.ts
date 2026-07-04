"use client";

import { useState } from "react";

import { loadStateSalesLogRequest } from "@/modules/nexus/presentation/admin/stateDetailRequests";
import type { SalesLog } from "@/modules/nexus/presentation/admin/stateDetailTypes";
import { logError } from "@/lib/utils/log";

export function useStateDetailSalesLog(stateCode: string, hasSales: boolean) {
  const [salesLog, setSalesLog] = useState<SalesLog[]>([]);
  const [salesLogTotal, setSalesLogTotal] = useState(0);
  const [salesLogPage, setSalesLogPage] = useState(0);
  const [loadingSalesLog, setLoadingSalesLog] = useState(false);
  const [hasCheckedSales, setHasCheckedSales] = useState(false);

  const fetchSalesLog = async (offset: number = 0) => {
    try {
      setLoadingSalesLog(true);
      const result = await loadStateSalesLogRequest(stateCode, offset);
      setSalesLog(result.sales ?? []);
      setSalesLogTotal(result.total ?? 0);
      setHasCheckedSales(true);
    } catch (err) {
      logError(err, { layer: "frontend", event: "nexus_state_sales_log_failed" });
      setSalesLog([]);
      setSalesLogTotal(0);
      setHasCheckedSales(true);
    } finally {
      setLoadingSalesLog(false);
    }
  };

  const handleViewSalesLog = () => {
    if (!hasSales) {
      return;
    }
    setSalesLogPage(0);
    void fetchSalesLog(0);
  };

  const handleSalesLogPageChange = (newPage: number) => {
    setSalesLogPage(newPage);
    void fetchSalesLog(newPage * 10);
  };

  return {
    handleSalesLogPageChange,
    handleViewSalesLog,
    hasCheckedSales,
    loadingSalesLog,
    salesLog,
    salesLogPage,
    salesLogTotal,
  };
}
