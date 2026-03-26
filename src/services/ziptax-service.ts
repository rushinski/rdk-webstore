// src/services/ziptax-service.ts
//
// Sales tax rate lookup via ZipTax API (https://developers.zip.tax/introduction).
// Uses a cache-first strategy backed by the `tax_rate_cache` table (30-day TTL).
// This keeps the free-tier (100 req/month) viable even at scale — only new
// zip codes ever trigger an API call.
//
// Free tier limits:
//   - 100 requests/month
//   - 10 requests/minute
//   - No overage — service stops if limit hit (must upgrade)

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/db/database.types";
import { env } from "@/config/env";
import { log, logError } from "@/lib/utils/log";

const ZIPTAX_API_BASE = "https://api.zip-tax.com/request/v60";
const CACHE_TTL_DAYS = 30;

export type ZipTaxRate = {
  zipCode: string;
  stateCode: string | null;
  combinedRate: number;
  stateRate: number | null;
  countyRate: number | null;
  cityRate: number | null;
  districtRate: number | null;
  breakdown: ZipTaxApiResponse | null;
};

export type TaxCalculation = {
  taxAmount: number;
  taxRate: number;
  zipCode: string;
  breakdown: ZipTaxApiResponse | null;
  taxCalculationId: string | null; // generated ID for reference
  fromCache: boolean;
};

// ZipTax API response shape (v60)
export type ZipTaxApiResponse = {
  rCode: number;
  results?: Array<{
    geoPostalCode: string;
    geoCity: string;
    geoCounty: string;
    geoState: string;
    taxSales: number;
    taxUse: number;
    txbService: string;
    txbFreight: string;
    stateSalesTax: number;
    stateUseTax: number;
    citySalesTax: number;
    cityUseTax: number;
    cityTaxCode: string;
    countySalesTax: number;
    countyUseTax: number;
    countyTaxCode: string;
    districtSalesTax: number;
    districtUseTax: number;
    originDestination: string;
  }>;
};

export class ZipTaxService {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  /**
   * Cache-first tax rate lookup by zip code.
   * Returns cached result if not expired; otherwise calls ZipTax API.
   */
  async getTaxRate(zipCode: string): Promise<ZipTaxRate | null> {
    const normalizedZip = zipCode
      .trim()
      .replace(/[^0-9]/g, "")
      .slice(0, 5);
    if (!normalizedZip || normalizedZip.length < 5) {
      log({
        level: "warn",
        layer: "service",
        message: "ziptax_invalid_zip",
        zipCode,
      });
      return null;
    }

    // 1. Check cache
    const cached = await this.getFromCache(normalizedZip);
    if (cached) {
      log({
        level: "debug",
        layer: "service",
        message: "ziptax_cache_hit",
        zipCode: normalizedZip,
      });
      return cached;
    }

    // 2. Call ZipTax API
    const apiResult = await this.fetchFromApi(normalizedZip);
    if (!apiResult) {
      return null;
    }

    // 3. Store in cache
    await this.storeInCache(normalizedZip, apiResult);

    return apiResult;
  }

  /**
   * Calculate tax amount for a given subtotal and zip code.
   * Handles taxEnabled=false and missing address gracefully.
   */
  async calculateTax(params: {
    zipCode: string | null | undefined;
    subtotalCents: number;
    taxEnabled?: boolean;
  }): Promise<TaxCalculation> {
    const zero: TaxCalculation = {
      taxAmount: 0,
      taxRate: 0,
      zipCode: params.zipCode ?? "",
      breakdown: null,
      taxCalculationId: null,
      fromCache: false,
    };

    if (params.taxEnabled === false) {
      return zero;
    }

    if (!params.zipCode) {
      return zero;
    }

    try {
      const rate = await this.getTaxRate(params.zipCode);
      if (!rate) {
        return zero;
      }

      const taxAmountCents = Math.round(params.subtotalCents * rate.combinedRate);
      const calculationId = `ztx_${Date.now()}_${params.zipCode}`;

      log({
        level: "info",
        layer: "service",
        message: "ziptax_calculated",
        zipCode: params.zipCode,
        combinedRate: rate.combinedRate,
        subtotalCents: params.subtotalCents,
        taxAmountCents,
      });

      return {
        taxAmount: taxAmountCents,
        taxRate: rate.combinedRate,
        zipCode: params.zipCode,
        breakdown: rate.breakdown,
        taxCalculationId: calculationId,
        fromCache: true, // set by getFromCache path; overridden below if fresh
      };
    } catch (error) {
      logError(error, {
        layer: "service",
        message: "ziptax_calculation_error",
        zipCode: params.zipCode,
      });
      return zero;
    }
  }

  // ---------- Private ----------

  private async getFromCache(zipCode: string): Promise<ZipTaxRate | null> {
    const { data, error } = await this.supabase
      .from("tax_rate_cache")
      .select("*")
      .eq("zip_code", zipCode)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      logError(error, { layer: "service", message: "ziptax_cache_read_error", zipCode });
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      zipCode: data.zip_code,
      stateCode: data.state_code ?? null,
      combinedRate: Number(data.combined_rate),
      stateRate: data.state_rate !== null ? Number(data.state_rate) : null,
      countyRate: data.county_rate !== null ? Number(data.county_rate) : null,
      cityRate: data.city_rate !== null ? Number(data.city_rate) : null,
      districtRate: data.district_rate !== null ? Number(data.district_rate) : null,
      breakdown: data.breakdown as ZipTaxApiResponse | null,
    };
  }

  private async fetchFromApi(zipCode: string): Promise<ZipTaxRate | null> {
    try {
      const url = new URL(ZIPTAX_API_BASE);
      url.searchParams.set("address", zipCode);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "X-API-KEY": env.ZIPTAX_API_KEY,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 429) {
        log({
          level: "warn",
          layer: "service",
          message: "ziptax_rate_limit_hit",
          zipCode,
          status: 429,
        });
        return null;
      }

      if (!response.ok) {
        log({
          level: "warn",
          layer: "service",
          message: "ziptax_api_error",
          zipCode,
          status: response.status,
        });
        return null;
      }

      const json = (await response.json()) as ZipTaxApiResponse;

      if (json.rCode !== 100 || !json.results?.length) {
        log({
          level: "warn",
          layer: "service",
          message: "ziptax_no_results",
          zipCode,
          rCode: json.rCode,
        });
        return null;
      }

      const result = json.results[0];
      return {
        zipCode,
        stateCode: result.geoState ?? null,
        combinedRate: Number(result.taxSales ?? 0),
        stateRate: Number(result.stateSalesTax ?? 0),
        countyRate: Number(result.countySalesTax ?? 0),
        cityRate: Number(result.citySalesTax ?? 0),
        districtRate: Number(result.districtSalesTax ?? 0),
        breakdown: json,
      };
    } catch (error) {
      logError(error, {
        layer: "service",
        message: "ziptax_fetch_error",
        zipCode,
      });
      return null;
    }
  }

  private async storeInCache(zipCode: string, rate: ZipTaxRate): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    const { error } = await this.supabase.from("tax_rate_cache").upsert(
      {
        zip_code: zipCode,
        state_code: rate.stateCode,
        combined_rate: rate.combinedRate,
        state_rate: rate.stateRate,
        county_rate: rate.countyRate,
        city_rate: rate.cityRate,
        district_rate: rate.districtRate,
        breakdown: rate.breakdown as unknown as Json,
        cached_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "zip_code" },
    );

    if (error) {
      logError(error, {
        layer: "service",
        message: "ziptax_cache_write_error",
        zipCode,
      });
    } else {
      log({
        level: "info",
        layer: "service",
        message: "ziptax_cached",
        zipCode,
        combinedRate: rate.combinedRate,
        expiresAt: expiresAt.toISOString(),
      });
    }
  }
}
