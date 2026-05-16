import type { TypedSupabaseClient } from "@/lib/supabase/server";

export type LightspeedSyncRunSummary = {
  added: number;
  modified: number;
  archived: number;
  conflicts: number;
  skipped: number;
};

export type LightspeedSyncRunItemInsert = {
  tenantId: string;
  changeType: "added" | "modified" | "archived" | "conflicts" | "skipped";
  action: string;
  entityType: "product" | "variant" | "link";
  entityKey: string;
  payload: Record<string, unknown>;
};

export class LightspeedSyncRunsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async createRun(input: {
    tenantId: string;
    startedBy: string | null;
    sourceOfTruth: "lightspeed_inventory" | "website_inventory";
    status: "preview" | "applied";
    summary: LightspeedSyncRunSummary;
  }) {
    const { data, error } = await this.supabase
      .from("lightspeed_sync_runs")
      .insert({
        tenant_id: input.tenantId,
        started_by: input.startedBy,
        source_of_truth: input.sourceOfTruth,
        status: input.status,
        summary: input.summary as never,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as {
      id: string;
    };
  }

  async createItems(syncRunId: string, items: LightspeedSyncRunItemInsert[]) {
    if (items.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("lightspeed_sync_run_items")
      .insert(
        items.map((item) => ({
          sync_run_id: syncRunId,
          tenant_id: item.tenantId,
          change_type: item.changeType,
          action: item.action,
          entity_type: item.entityType,
          entity_key: item.entityKey,
          payload: item.payload as never,
        })),
      )
      .select("*");

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async getRun(syncRunId: string) {
    const { data, error } = await this.supabase
      .from("lightspeed_sync_runs")
      .select("*")
      .eq("id", syncRunId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async listItems(syncRunId: string) {
    const { data, error } = await this.supabase
      .from("lightspeed_sync_run_items")
      .select("*")
      .eq("sync_run_id", syncRunId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async updateApproval(itemId: string, approved: boolean) {
    const { error } = await this.supabase
      .from("lightspeed_sync_run_items")
      .update({
        approved,
      })
      .eq("id", itemId);

    if (error) {
      throw error;
    }
  }

  async updateApplyStatus(
    itemId: string,
    input: { applyStatus: string; failureReason: string | null },
  ) {
    const { error } = await this.supabase
      .from("lightspeed_sync_run_items")
      .update({
        apply_status: input.applyStatus,
        failure_reason: input.failureReason,
      })
      .eq("id", itemId);

    if (error) {
      throw error;
    }
  }

  async completeRun(
    syncRunId: string,
    input: { status: "applied"; summary: Record<string, unknown> },
  ) {
    const { error } = await this.supabase
      .from("lightspeed_sync_runs")
      .update({
        status: input.status,
        summary: input.summary as never,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncRunId);

    if (error) {
      throw error;
    }
  }
}
