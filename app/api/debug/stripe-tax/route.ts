// app/api/debug/stripe-tax/route.ts
// ⚠️ REMOVE THIS FILE AFTER DEBUGGING - IT EXPOSES SENSITIVE INFO

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { requireAdminApi } from "@/lib/auth/session";
import { ProfileRepository } from "@/repositories/profile-repo";
import { TaxSettingsRepository } from "@/repositories/tax-settings-repo";
import { StripeTaxService } from "@/services/stripe-tax-service";

export async function GET(request: NextRequest) {
  try {
    // Require admin to run this
    const session = await requireAdminApi();
    
    const supabase = await createSupabaseServerClient();
    const adminSupabase = createSupabaseAdminClient();
    
    const profileRepo = new ProfileRepository(adminSupabase);
    const taxSettingsRepo = new TaxSettingsRepository(adminSupabase);
    
    // Get user's profile to find tenant
    const profile = await profileRepo.getByUserId(session.user.id);
    
    if (!profile?.tenant_id) {
      return NextResponse.json({ error: "No tenant found" }, { status: 400 });
    }
    
    const tenantId = profile.tenant_id;
    
    // Get Stripe Connect account
    const stripeAccountId = await profileRepo.getStripeAccountIdForTenant(tenantId);
    
    if (!stripeAccountId) {
      return NextResponse.json({ error: "No Stripe Connect account" }, { status: 400 });
    }
    
    // Get tax settings from DB
    const taxSettings = await taxSettingsRepo.getByTenant(tenantId);
    
    // Create tax service
    const taxService = new StripeTaxService(adminSupabase, stripeAccountId);
    
    // Get Stripe tax configuration
    const headOffice = await taxService.getHeadOfficeAddress();
    const isConfigured = await taxService.isHeadOfficeConfigured();
    const registrations = await taxService.getStripeRegistrations();
    
    // Test tax calculation for PA
    let paTestResult = null;
    try {
      paTestResult = await taxService.calculateTax({
        currency: "usd",
        customerAddress: {
          line1: "123 Market St",
          city: "Philadelphia", 
          state: "PA",
          postal_code: "19019",
          country: "US",
        },
        lineItems: [{
          amount: 10000, // $100
          quantity: 1,
          productId: "test",
          category: "apparel",
        }],
        shippingCost: 500, // $5
        taxEnabled: true,
      });
    } catch (error: any) {
      paTestResult = { error: error.message };
    }
    
    return NextResponse.json({
      tenant: {
        id: tenantId,
        stripeAccountId,
      },
      database: {
        taxSettings: {
          homeState: taxSettings?.home_state,
          taxEnabled: taxSettings?.tax_enabled,
          businessName: taxSettings?.business_name,
          stripeTaxSettingsId: taxSettings?.stripe_tax_settings_id,
          taxCodeOverrides: taxSettings?.tax_code_overrides,
        },
      },
      stripe: {
        headOfficeConfigured: isConfigured,
        headOfficeAddress: headOffice,
        registrations: Array.from(registrations.entries()).map(([state, reg]) => ({
          state,
          id: reg.id,
          active: reg.active,
        })),
      },
      test: {
        paAddress: {
          line1: "123 Market St",
          city: "Philadelphia",
          state: "PA",
          postal_code: "19019",
        },
        result: paTestResult,
      },
      diagnosis: {
        hasStripeAccount: !!stripeAccountId,
        taxEnabledInDB: taxSettings?.tax_enabled === true,
        headOfficeConfigured: isConfigured,
        paRegistrationActive: registrations.get("PA")?.active ?? false,
        shouldCalculateTax: !!(
          stripeAccountId &&
          taxSettings?.tax_enabled &&
          isConfigured &&
          registrations.get("PA")?.active
        ),
      },
    }, { headers: { "Cache-Control": "no-store" } });
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}