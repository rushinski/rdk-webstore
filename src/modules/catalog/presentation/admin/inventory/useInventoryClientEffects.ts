"use client";

import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import {
  getInventoryListResetState,
  getInventoryLoadDebounceMs,
  getInventoryRealtimeRefreshDelayMs,
  getNextInventoryPage,
  shouldCloseInventoryMenu,
} from "@/modules/catalog/presentation/admin/inventory/inventoryClientLifecycle";
import {
  getInventoryRealtimeChannelName,
  getInventoryRealtimeTables,
  shouldClearInventoryRefreshTimer,
} from "@/modules/catalog/presentation/admin/inventory/inventoryClientRealtime";
import type {
  InventoryFilters,
  StockStatus,
} from "@/modules/catalog/presentation/admin/inventory/inventoryClientData";
import type { Category, Condition } from "@/types/domain/product";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type UseInventoryClientEffectsArgs = {
  page: number;
  totalPages: number;
  searchQuery: string;
  categoryFilter: Category | "all";
  conditionFilter: Condition | "all";
  stockStatusFilter: StockStatus;
  currentFilters: InventoryFilters;
  openMenuId: string | null;
  loadProducts: (filters?: InventoryFilters, showLoading?: boolean) => Promise<void>;
  setPage: Dispatch<SetStateAction<number>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setSelectAllMatching: Dispatch<SetStateAction<boolean>>;
  setExpandedVariants: Dispatch<SetStateAction<Record<string, boolean>>>;
  setOpenMenuId: Dispatch<SetStateAction<string | null>>;
  filtersRef: MutableRefObject<InventoryFilters>;
  refreshTimerRef: MutableRefObject<number | null>;
};

export function useInventoryClientEffects({
  page,
  totalPages,
  searchQuery,
  categoryFilter,
  conditionFilter,
  stockStatusFilter,
  currentFilters,
  openMenuId,
  loadProducts,
  setPage,
  setSelectedIds,
  setSelectAllMatching,
  setExpandedVariants,
  setOpenMenuId,
  filtersRef,
  refreshTimerRef,
}: UseInventoryClientEffectsArgs) {
  useEffect(() => {
    setPage(1);
  }, [searchQuery, categoryFilter, conditionFilter, stockStatusFilter, setPage]);

  useEffect(() => {
    const resetState = getInventoryListResetState();
    setSelectedIds(resetState.selectedIds);
    setSelectAllMatching(resetState.selectAllMatching);
    setExpandedVariants(resetState.expandedVariants);
  }, [
    page,
    searchQuery,
    categoryFilter,
    conditionFilter,
    stockStatusFilter,
    setExpandedVariants,
    setSelectAllMatching,
    setSelectedIds,
  ]);

  useEffect(() => {
    const nextPage = getNextInventoryPage({ page, totalPages });
    if (nextPage !== null) {
      setPage(nextPage);
    }
  }, [page, totalPages, setPage]);

  useEffect(() => {
    filtersRef.current = currentFilters;

    const timeout = window.setTimeout(() => {
      void loadProducts(filtersRef.current);
    }, getInventoryLoadDebounceMs());

    return () => window.clearTimeout(timeout);
  }, [
    searchQuery,
    categoryFilter,
    conditionFilter,
    stockStatusFilter,
    page,
    currentFilters,
    loadProducts,
    filtersRef,
  ]);

  useEffect(() => {
    if (!openMenuId) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const activeMenus = Array.from(
        document.querySelectorAll(`[data-menu-id="${openMenuId}"]`),
      );

      if (!shouldCloseInventoryMenu({ openMenuId, target, activeMenus })) {
        return;
      }

      setOpenMenuId(null);
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId, setOpenMenuId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const realtimeTables = getInventoryRealtimeTables();

    const scheduleRefresh = () => {
      if (shouldClearInventoryRefreshTimer(refreshTimerRef.current)) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(() => {
        void loadProducts(filtersRef.current, false);
      }, getInventoryRealtimeRefreshDelayMs());
    };

    const channel = supabase
      .channel(getInventoryRealtimeChannelName())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: realtimeTables[0] },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: realtimeTables[1] },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (shouldClearInventoryRefreshTimer(refreshTimerRef.current)) {
        window.clearTimeout(refreshTimerRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [filtersRef, loadProducts, refreshTimerRef]);
}
