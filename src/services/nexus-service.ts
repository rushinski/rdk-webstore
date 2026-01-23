// src/services/nexus-service.ts
import { NEXUS_THRESHOLDS, STATE_NAMES } from "@/config/constants/nexus-thresholds";
import type { NexusRepository } from "@/repositories/nexus-repo";
import type { TaxSettingsRepository } from "@/repositories/tax-settings-repo";
import type { StripeTaxService } from "@/services/stripe-tax-service";

type Window = "calendar year" | "rolling 12 months" | "none";

type SalesAgg = {
  totalSales: number;
  taxableSales: number;
  transactionCount: number;
  taxCollected: number;
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function startOfYear(year: number): Date {
  return new Date(year, 0, 1, 0, 0, 0, 0);
}

function addYears(d: Date, years: number): Date {
  const out = new Date(d);
  out.setFullYear(out.getFullYear() + years);
  return out;
}

/**
 * Rolling reset = exact anniversary of tracking start.
 * Example: start Jan 16, 2026 => reset Jan 16, 2027
 */
function getRollingReset(trackingStartedAtISO: string): string {
  const start = new Date(trackingStartedAtISO);
  const end = addYears(start, 1);
  return fmtDate(end);
}

function getRollingEndDate(trackingStartedAtISO: string): Date {
  const start = new Date(trackingStartedAtISO);
  return addYears(start, 1);
}

export class NexusSummaryService {
  constructor(
    private readonly nexusRepo: NexusRepository,
    private readonly taxSettingsRepo: TaxSettingsRepository,
    private readonly stripeTax: StripeTaxService | null,
  ) {}

  async buildSummary(
    tenantId: string,
  ): Promise<{ homeState: string; states: any[]; taxEnabled: boolean }> {
    // NOTE:
    // - calendarSales: sums current year (calendar year window)
    // - rollingSales: sums last 12 months by month buckets (your repo implementation)
    // Display reset dates for rolling uses tracking_started_at anniversary.
    const [taxSettings, registrations, calendarSales, rollingSales] = await Promise.all([
      this.taxSettingsRepo.getByTenant(tenantId),
      this.nexusRepo.getRegistrationsByTenant(tenantId),
      this.nexusRepo.getAllStateSales(tenantId, "calendar"),
      this.nexusRepo.getAllStateSales(tenantId, "rolling"),
    ]);

    const taxEnabled = taxSettings?.tax_enabled ?? false;
    const stripeRegs =
      taxEnabled && this.stripeTax
        ? await this.stripeTax.getStripeRegistrations()
        : new Map<string, { id: string; state: string; active: boolean }>();

    const homeState = taxSettings?.home_state ?? "SC";
    const now = new Date();

    const states = Object.keys(NEXUS_THRESHOLDS).map((stateCode) => {
      const threshold = NEXUS_THRESHOLDS[stateCode as keyof typeof NEXUS_THRESHOLDS];
      const window = threshold.window as Window;

      const registration =
        registrations.find((r: any) => r.state_code === stateCode) ?? null;
      const stripeReg = stripeRegs.get(stateCode);

      const salesMap =
        window === "rolling 12 months"
          ? rollingSales
          : window === "calendar year"
            ? calendarSales
            : null;

      const sales: SalesAgg = (salesMap?.get(stateCode) as SalesAgg) ?? {
        totalSales: 0,
        taxableSales: 0,
        transactionCount: 0,
        taxCollected: 0,
      };

      // Relevant sales depends on threshold type
      const relevantSales =
        threshold.type === "taxable" ? sales.taxableSales : sales.totalSales;
      const thresholdAmount = threshold.threshold;

      const percentageToThreshold =
        thresholdAmount > 0 ? Math.min((relevantSales / thresholdAmount) * 100, 100) : 0;

      let meetsTransactionThreshold = true;
      if (threshold.transactions) {
        meetsTransactionThreshold = sales.transactionCount >= threshold.transactions;
      }

      const isHomeState = stateCode === homeState;
      const nexusType = isHomeState
        ? "physical"
        : (registration?.registration_type ?? "economic");
      const isRegistered = registration?.is_registered ?? false;

      // Tracking display fields
      let trackingStartDate: string | null = null;
      let trackingEndDate: string | null = null;
      let resetDate: string | undefined = undefined;

      if (window === "calendar year") {
        const start = startOfYear(now.getFullYear());
        const end = startOfYear(now.getFullYear() + 1); // resets Jan 1 next year
        trackingStartDate = fmtDate(start);
        trackingEndDate = fmtDate(end);
        resetDate = fmtDate(end);
      }

      if (window === "rolling 12 months") {
        // Correct rolling reset depends on an actual start date, not month buckets.
        const startedAt: string | null = registration?.tracking_started_at ?? null;

        if (startedAt) {
          const end = getRollingEndDate(startedAt);
          trackingStartDate = fmtDate(new Date(startedAt));
          trackingEndDate = fmtDate(end);
          resetDate = getRollingReset(startedAt);
        } else {
          // No start date recorded yet (no tracking begun, or migration not applied)
          trackingStartDate = null;
          trackingEndDate = null;
          resetDate = undefined;
        }
      }

      return {
        stateCode,
        stateName: STATE_NAMES[stateCode],
        threshold: thresholdAmount,
        thresholdType: threshold.type,
        window: threshold.window,

        totalSales: sales.totalSales,
        taxableSales: sales.taxableSales,
        transactionCount: sales.transactionCount,
        taxCollected: sales.taxCollected,

        relevantSales,
        percentageToThreshold,

        isRegistered,
        nexusType,
        isHomeState,

        taxable: threshold.taxable,
        notes: threshold.notes,

        transactionThreshold: threshold.transactions ?? null,
        meetsTransactionThreshold,
        both: threshold.both ?? false,

        stripeRegistered: stripeReg?.active ?? false,

        // UI display helpers
        trackingStartDate,
        trackingEndDate,
        resetDate,
      };
    });

    return { homeState, states, taxEnabled };
  }
}
