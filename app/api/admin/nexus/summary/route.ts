// app/api/admin/nexus/summary/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { NexusRepository } from "@/repositories/nexus-repo";
import { TaxSettingsRepository } from "@/repositories/tax-settings-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { StripeTaxService } from "@/services/stripe-tax-service";
import { NEXUS_THRESHOLDS, STATE_NAMES } from "@/config/constants/nexus-thresholds";

function getResetDate(window: string): string {
  const now = new Date();
  
  if (window === 'calendar year') {
    return `Jan 1, ${now.getFullYear() + 1}`;
  } else if (window === 'rolling 12 months') {
    const future = new Date(now);
    future.setMonth(future.getMonth() + 1);
    return `${future.toLocaleString('default', { month: 'short' })} 1, ${future.getFullYear()}`;
  }
  
  return 'N/A';
}

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
    const taxService = new StripeTaxService(supabase);

    // Fetch all data in parallel
    const [registrations, taxSettings, allSales, stripeRegistrations] = await Promise.all([
      nexusRepo.getRegistrationsByTenant(profile.tenant_id),
      taxSettingsRepo.getByTenant(profile.tenant_id),
      nexusRepo.getAllStateSales(profile.tenant_id, 'calendar'),
      taxService.getStripeRegistrations(),
    ]);

    const homeState = taxSettings?.home_state ?? 'SC';

    const stateSummaries = Object.keys(NEXUS_THRESHOLDS).map(stateCode => {
      const threshold = NEXUS_THRESHOLDS[stateCode as keyof typeof NEXUS_THRESHOLDS];
      const registration = registrations.find(r => r.state_code === stateCode);
      const sales = allSales.get(stateCode) ?? { totalSales: 0, taxableSales: 0, transactionCount: 0, taxCollected: 0 };
      const stripeReg = stripeRegistrations.get(stateCode);

      // Determine relevant sales based on threshold type
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
        taxCollected: sales.taxCollected, // NEW: Show tax collected for registered states
        relevantSales,
        percentageToThreshold: Math.min(percentageToThreshold, 100),
        isRegistered,
        nexusType,
        isHomeState,
        taxable: threshold.taxable,
        transactionThreshold: threshold.transactions ?? null,
        meetsTransactionThreshold,
        both: threshold.both ?? false,
        stripeRegistered: stripeReg?.active ?? false,
        resetDate: getResetDate(threshold.window),
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