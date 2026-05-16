import { LightspeedClient } from "@/lib/lightspeed/client";
import type { LightspeedConnection } from "@/repositories/lightspeed-settings-repo";

type SyncRun = {
  id: string;
  tenant_id: string;
  source_of_truth: string;
};

type SyncRunItem = {
  id: string;
  tenant_id: string;
  action: string;
  entity_key: string;
  payload: unknown;
};

type ApplyDecision = {
  itemId: string;
  approved: boolean;
};

export class LightspeedSyncApplyService {
  constructor(
    private readonly syncRunsRepo: {
      getRun: (syncRunId: string) => Promise<SyncRun | null>;
      listItems: (syncRunId: string) => Promise<SyncRunItem[]>;
      updateApproval: (itemId: string, approved: boolean) => Promise<void>;
      updateApplyStatus: (
        itemId: string,
        input: { applyStatus: string; failureReason: string | null },
      ) => Promise<void>;
      completeRun: (
        syncRunId: string,
        input: { status: "applied"; summary: Record<string, unknown> },
      ) => Promise<void>;
    },
    private readonly productSyncService: {
      syncWebsiteProduct: (
        productId: string,
        options: { tenantId: string; source: "create" | "update" },
      ) => Promise<unknown>;
    },
    private readonly archiveExecutor: {
      archiveLightspeedProduct: (
        tenantId: string,
        lightspeedProductId: string,
      ) => Promise<void>;
    },
    private readonly reportEmailService: {
      sendFailureReport: (input: {
        tenantId: string;
        syncRunId: string;
        failures: Array<{
          itemId: string;
          entityKey: string;
          reason: string;
        }>;
      }) => Promise<void>;
    },
  ) {}

  async applySync(input: {
    tenantId: string;
    syncRunId: string;
    mode: "accept_all" | "deny_all" | "selective";
    decisions?: ApplyDecision[];
  }) {
    const run = await this.syncRunsRepo.getRun(input.syncRunId);
    if (!run || run.tenant_id !== input.tenantId) {
      throw new Error("Sync run not found.");
    }

    const items = await this.syncRunsRepo.listItems(input.syncRunId);
    const decisionMap = new Map(
      (input.decisions ?? []).map((decision) => [decision.itemId, decision.approved]),
    );

    const results: Array<{
      itemId: string;
      entityKey: string;
      applyStatus: "applied" | "rejected" | "failed";
      failureReason: string | null;
    }> = [];

    for (const item of items) {
      const approved = this.resolveApproval(item.id, input.mode, decisionMap);
      await this.syncRunsRepo.updateApproval(item.id, approved);

      if (!approved) {
        await this.syncRunsRepo.updateApplyStatus(item.id, {
          applyStatus: "rejected",
          failureReason: null,
        });
        results.push({
          itemId: item.id,
          entityKey: item.entity_key,
          applyStatus: "rejected",
          failureReason: null,
        });
        continue;
      }

      try {
        await this.applyItem(input.tenantId, item);
        await this.syncRunsRepo.updateApplyStatus(item.id, {
          applyStatus: "applied",
          failureReason: null,
        });
        results.push({
          itemId: item.id,
          entityKey: item.entity_key,
          applyStatus: "applied",
          failureReason: null,
        });
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "Failed to apply sync item.";
        await this.syncRunsRepo.updateApplyStatus(item.id, {
          applyStatus: "failed",
          failureReason: reason,
        });
        results.push({
          itemId: item.id,
          entityKey: item.entity_key,
          applyStatus: "failed",
          failureReason: reason,
        });
      }
    }

    const summary = {
      applied: results.filter((result) => result.applyStatus === "applied").length,
      rejected: results.filter((result) => result.applyStatus === "rejected").length,
      failed: results.filter((result) => result.applyStatus === "failed").length,
    };

    await this.syncRunsRepo.completeRun(input.syncRunId, {
      status: "applied",
      summary,
    });

    const failures = results
      .filter((result) => result.applyStatus === "failed")
      .map((result) => ({
        itemId: result.itemId,
        entityKey: result.entityKey,
        reason: result.failureReason ?? "Failed to apply sync item.",
      }));

    if (failures.length > 0) {
      await this.reportEmailService.sendFailureReport({
        tenantId: input.tenantId,
        syncRunId: input.syncRunId,
        failures,
      });
    }

    return {
      syncRunId: input.syncRunId,
      summary,
      items: results,
    };
  }

  private resolveApproval(
    itemId: string,
    mode: "accept_all" | "deny_all" | "selective",
    decisionMap: Map<string, boolean>,
  ) {
    if (mode === "accept_all") {
      return true;
    }
    if (mode === "deny_all") {
      return false;
    }

    return decisionMap.get(itemId) ?? false;
  }

  private async applyItem(tenantId: string, item: SyncRunItem) {
    const payload = this.toPayloadRecord(item.payload);

    if (item.action === "create_lightspeed_product") {
      const productId = this.getStringPayload(payload, "productId");
      await this.productSyncService.syncWebsiteProduct(productId, {
        tenantId,
        source: "create",
      });
      return;
    }

    if (item.action === "archive_lightspeed_product") {
      const lightspeedProductId = this.getStringPayload(payload, "lightspeedProductId");
      await this.archiveExecutor.archiveLightspeedProduct(tenantId, lightspeedProductId);
      return;
    }

    if (item.action === "resolve_duplicate_link") {
      throw new Error("This conflict requires manual resolution before apply.");
    }

    throw new Error(`Unsupported sync action: ${item.action}`);
  }

  private getStringPayload(payload: Record<string, unknown>, key: string) {
    const value = payload[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Sync item payload is missing ${key}.`);
    }
    return value;
  }

  private toPayloadRecord(payload: unknown) {
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      return payload as Record<string, unknown>;
    }

    throw new Error("Sync item payload is invalid.");
  }
}

export const createArchiveLightspeedProductExecutor = (input: {
  getConnectionByTenant: (tenantId: string) => Promise<LightspeedConnection>;
}) => ({
  archiveLightspeedProduct: async (tenantId: string, lightspeedProductId: string) => {
    const connection = await input.getConnectionByTenant(tenantId);
    if (!connection.syncEnabled || !connection.domainPrefix || !connection.accessToken) {
      throw new Error(
        "Lightspeed sync is enabled but the store is not fully connected yet.",
      );
    }

    const client = new LightspeedClient({
      domainPrefix: connection.domainPrefix,
      accessToken: connection.accessToken,
    });

    await client.updateProduct(lightspeedProductId, {
      common: {
        is_active: false,
      },
    });
  },
});
