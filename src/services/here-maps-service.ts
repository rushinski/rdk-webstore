// src/services/here-maps-service.ts
import { env } from "@/config/env";
import { normalizeCountryCode, normalizeUsStateCode } from "@/lib/address/codes";
import { logError } from "@/lib/utils/log";

export interface HereAutocompleteResult {
  id: string;
  title: string;
  address: {
    label: string;
    countryCode: string;
    countryName: string;
    state: string;
    county?: string;
    city: string;
    district?: string;
    street?: string;
    postalCode: string;
    houseNumber?: string;
  };
  position?: {
    lat: number;
    lng: number;
  };
}

export interface HereValidationResult {
  isValid: boolean;
  suggestions?: Array<{
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  }>;
  messages?: string[];
}

interface AddressValidationInput {
  line1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface HereApiAddress {
  label?: string;
  countryCode?: string;
  countryName?: string;
  state?: string;
  stateCode?: string;
  county?: string;
  city?: string;
  district?: string;
  street?: string;
  postalCode?: string;
  houseNumber?: string;
}

interface HereApiItem {
  id?: string;
  title?: string;
  resultType?: string;
  address?: HereApiAddress;
  position?: {
    lat?: number;
    lng?: number;
  };
  scoring?: {
    queryScore?: number;
  };
}

interface HereApiResponse {
  items?: HereApiItem[];
}

export class HereMapsService {
  private readonly apiKey: string;
  private readonly autocompleteEndpoint =
    "https://autosuggest.search.hereapi.com/v1/autosuggest";
  private readonly geocodeEndpoint = "https://geocode.search.hereapi.com/v1/geocode";

  constructor() {
    this.apiKey = env.HERE_MAPS_API_KEY;
    if (!this.apiKey) {
      throw new Error("HERE_MAPS_API_KEY is not configured in environment variables");
    }
  }

  async autocomplete(
    query: string,
    countryCode: string = "USA",
  ): Promise<HereAutocompleteResult[]> {
    try {
      // Convert 2-letter country code to 3-letter for HERE API
      const hereCountryCode = countryCode === "US" ? "USA" : countryCode;

      const url = new URL(this.autocompleteEndpoint);
      url.searchParams.set("q", query.trim());
      url.searchParams.set("at", "37.0902,-95.7129"); // Center of USA
      url.searchParams.set("in", `countryCode:${hereCountryCode}`);
      url.searchParams.set("apiKey", this.apiKey);
      url.searchParams.set("limit", "5");

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        // Get detailed error message from HERE API
        const errorText = await response.text().catch(() => "Unknown error");
        logError(new Error(`HERE API ${response.status}: ${errorText}`), {
          layer: "service",
          event: "here_autocomplete_failed",
          query,
          status: response.status,
        });
        throw new Error(`HERE API error: ${response.status}`);
      }

      const data = (await response.json()) as HereApiResponse;
      return this.parseAutocompleteResults(data);
    } catch (error) {
      logError(error, {
        layer: "service",
        event: "here_autocomplete_failed",
        query,
      });
      throw new Error("Address autocomplete failed");
    }
  }

  async validateAddress(address: AddressValidationInput): Promise<HereValidationResult> {
    try {
      const url = new URL(this.geocodeEndpoint);
      const searchQuery = `${address.line1}, ${address.city}, ${address.state} ${address.postal_code}, ${address.country}`;
      url.searchParams.set("q", searchQuery);
      url.searchParams.set("apiKey", this.apiKey);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HERE API error: ${response.status}`);
      }

      const data = (await response.json()) as HereApiResponse;
      return this.parseValidationResult(data, address);
    } catch (error) {
      logError(error, {
        layer: "service",
        event: "here_validation_failed",
        address,
      });
      return { isValid: false, messages: ["Validation service unavailable"] };
    }
  }

  private parseAutocompleteResults(data: HereApiResponse): HereAutocompleteResult[] {
    const items = data.items ?? [];
    return items
      .filter((item) => item.resultType === "houseNumber" || item.resultType === "street")
      .map((item) => {
        const position =
          item.position?.lat !== undefined && item.position?.lng !== undefined
            ? { lat: item.position.lat, lng: item.position.lng }
            : undefined;

        return {
          id: item.id || "",
          title: item.title || "",
          address: {
            label: item.address?.label || "",
            countryCode: item.address?.countryCode || "US",
            countryName: item.address?.countryName || "United States",
            state: item.address?.state || "",
            county: item.address?.county,
            city: item.address?.city || "",
            district: item.address?.district,
            street: item.address?.street,
            postalCode: item.address?.postalCode || "",
            houseNumber: item.address?.houseNumber,
          },
          position,
        };
      });
  }

  private parseValidationResult(
    data: HereApiResponse,
    originalAddress: AddressValidationInput,
  ): HereValidationResult {
    const items = data.items ?? [];

    if (items.length === 0) {
      return {
        isValid: false,
        messages: ["Address not found. Please verify the address."],
      };
    }

    const firstResult = items[0];
    const score = firstResult.scoring?.queryScore || 0;
    const originalState = normalizeUsStateCode(originalAddress.state);
    const originalCountry = normalizeCountryCode(originalAddress.country, "US");

    // Format the standardized address from HERE Maps
    const standardizedAddress = {
      line1:
        `${firstResult.address?.houseNumber || ""} ${firstResult.address?.street || ""}`.trim(),
      city: firstResult.address?.city || "",
      state: normalizeUsStateCode(
        firstResult.address?.stateCode || firstResult.address?.state || "",
        originalState,
      ),
      postal_code: firstResult.address?.postalCode || "",
      country: normalizeCountryCode(firstResult.address?.countryCode, originalCountry),
    };

    // Check if the address is different from what user entered
    const isDifferent =
      standardizedAddress.line1.toLowerCase() !== originalAddress.line1?.toLowerCase() ||
      standardizedAddress.city.toLowerCase() !== originalAddress.city?.toLowerCase() ||
      standardizedAddress.state.toLowerCase() !== originalAddress.state?.toLowerCase() ||
      standardizedAddress.postal_code !== originalAddress.postal_code;

    // High confidence match
    if (score > 0.9) {
      // If the standardized format is different, show it as a suggestion
      if (isDifferent) {
        return {
          isValid: true,
          suggestions: [standardizedAddress],
          messages: ["Address verified. You can use this standardized format:"],
        };
      }
      // Address is already in correct format
      return { isValid: true };
    }

    // Medium confidence - provide suggestions
    if (score > 0.6) {
      const suggestions = items.slice(0, 3).map((item) => ({
        line1: `${item.address?.houseNumber || ""} ${item.address?.street || ""}`.trim(),
        city: item.address?.city || "",
        state: normalizeUsStateCode(
          item.address?.stateCode || item.address?.state || "",
          originalState,
        ),
        postal_code: item.address?.postalCode || "",
        country: normalizeCountryCode(item.address?.countryCode, originalCountry),
      }));

      return {
        isValid: false,
        suggestions,
        messages: ["Did you mean one of these addresses?"],
      };
    }

    // Low confidence
    return {
      isValid: false,
      messages: ["Address could not be validated. Please check for typos."],
    };
  }
}
