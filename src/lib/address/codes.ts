const COUNTRY_ALPHA3_TO_ALPHA2: Record<string, string> = {
  USA: "US",
};

const US_STATE_NAME_TO_CODE: Record<string, string> = {
  ALABAMA: "AL",
  ALASKA: "AK",
  ARIZONA: "AZ",
  ARKANSAS: "AR",
  CALIFORNIA: "CA",
  COLORADO: "CO",
  CONNECTICUT: "CT",
  DELAWARE: "DE",
  FLORIDA: "FL",
  GEORGIA: "GA",
  HAWAII: "HI",
  IDAHO: "ID",
  ILLINOIS: "IL",
  INDIANA: "IN",
  IOWA: "IA",
  KANSAS: "KS",
  KENTUCKY: "KY",
  LOUISIANA: "LA",
  MAINE: "ME",
  MARYLAND: "MD",
  MASSACHUSETTS: "MA",
  MICHIGAN: "MI",
  MINNESOTA: "MN",
  MISSISSIPPI: "MS",
  MISSOURI: "MO",
  MONTANA: "MT",
  NEBRASKA: "NE",
  NEVADA: "NV",
  "NEW HAMPSHIRE": "NH",
  "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM",
  "NEW YORK": "NY",
  "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND",
  OHIO: "OH",
  OKLAHOMA: "OK",
  OREGON: "OR",
  PENNSYLVANIA: "PA",
  "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD",
  TENNESSEE: "TN",
  TEXAS: "TX",
  UTAH: "UT",
  VERMONT: "VT",
  VIRGINIA: "VA",
  WASHINGTON: "WA",
  "WEST VIRGINIA": "WV",
  WISCONSIN: "WI",
  WYOMING: "WY",
  "DISTRICT OF COLUMBIA": "DC",
};

function normalizeToken(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

export function normalizeCountryCode(
  value: string | null | undefined,
  fallback = "US",
): string {
  const normalized = normalizeToken(value);
  const normalizedFallback = normalizeToken(fallback) || "US";
  if (!normalized) {
    return normalizedFallback;
  }
  if (normalized.length === 2) {
    return normalized;
  }
  return COUNTRY_ALPHA3_TO_ALPHA2[normalized] ?? normalizedFallback;
}

export function normalizeUsStateCode(
  value: string | null | undefined,
  fallback = "",
): string {
  const normalized = normalizeToken(value).replace(/\./g, "").replace(/\s+/g, " ");
  if (normalized.length === 2) {
    return normalized;
  }

  const mapped = US_STATE_NAME_TO_CODE[normalized];
  if (mapped) {
    return mapped;
  }

  const fallbackToken = normalizeToken(fallback).replace(/\./g, "").replace(/\s+/g, " ");
  if (fallbackToken.length === 2) {
    return fallbackToken;
  }
  return US_STATE_NAME_TO_CODE[fallbackToken] ?? normalized;
}
