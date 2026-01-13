// app/api/admin/nexus/summary/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { NexusRepository } from "@/repositories/nexus-repo";
import { TaxSettingsRepository } from "@/repositories/tax-settings-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { NEXUS_THRESHOLDS, STATE_NAMES } from "@/config/constants/nexus-thresholds";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();

    const profileRepo = new ProfileRepository(supabase);
    const profile = await profileRepo.getByUserId(session.user.id);

    if (!profile?.tenant_id) {
      return NextResponse.json(
        { error: "Tenant not found", requestId },
        { status: 404 }
      );
    }

    const nexusRepo = new NexusRepository(supabase);
    const taxSettingsRepo = new TaxSettingsRepository(supabase);

    const [registrations, taxSettings, allSales] = await Promise.all([
      nexusRepo.getRegistrationsByTenant(profile.tenant_id),
      taxSettingsRepo.getByTenant(profile.tenant_id),
      nexusRepo.getAllStateSales(profile.tenant_id, 'calendar'),
    ]);

    const homeState = taxSettings?.home_state ?? 'SC';

    const stateSummaries = Object.keys(NEXUS_THRESHOLDS).map(stateCode => {
      const threshold = NEXUS_THRESHOLDS[stateCode as keyof typeof NEXUS_THRESHOLDS];
      const registration = registrations.find(r => r.state_code === stateCode);
      const sales = allSales.get(stateCode) ?? { totalSales: 0, taxableSales: 0, transactionCount: 0 };

      const relevantSales = threshold.type === 'taxable' ? sales.taxableSales : sales.totalSales;
      const thresholdAmount = threshold.threshold;
      
      let percentageToThreshold = 0;
      if (thresholdAmount > 0) {
        percentageToThreshold = (relevantSales / thresholdAmount) * 100;
      }

      let meetsTransactionThreshold = true;
      if (threshold.transactions) {
        meetsTransactionThreshold = sales.transactionCount >= threshold.transactions;
      }

      const isRegistered = registration?.is_registered ?? false;
      const isHomeState = stateCode === homeState;
      const nexusType = isHomeState ? 'physical' : (registration?.registration_type ?? 'economic');

      return {
        stateCode,
        stateName: STATE_NAMES[stateCode],
        threshold: thresholdAmount,
        thresholdType: threshold.type,
        window: threshold.window,
        totalSales: sales.totalSales,
        taxableSales: sales.taxableSales,
        transactionCount: sales.transactionCount,
        relevantSales,
        percentageToThreshold: Math.min(percentageToThreshold, 100),
        isRegistered,
        nexusType,
        isHomeState,
        taxable: threshold.taxable,
        notes: threshold.notes ?? null,
        exemption: threshold.exemption ?? null,
        marginal: threshold.marginal ?? false,
        allOrNothing: threshold.allOrNothing ?? false,
        transactionThreshold: threshold.transactions ?? null,
        meetsTransactionThreshold,
        both: threshold.both ?? false,
      };
    });

    return NextResponse.json({
      homeState,
      states: stateSummaries,
    });
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/nexus/summary",
    });

    return NextResponse.json(
      { error: "Failed to fetch nexus summary", requestId },
      { status: 500 }
    );
  }
}