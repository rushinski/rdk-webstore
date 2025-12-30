import type { Category } from "@/types/views/product";

export type CatalogBrandAlias = {
  brandId: string;
  brandLabel: string;
  groupKey?: string | null;
  aliasLabel: string;
  aliasNormalized: string;
  priority: number;
};

export type CatalogModelAlias = {
  modelId: string;
  modelLabel: string;
  brandId: string;
  aliasLabel: string;
  aliasNormalized: string;
  priority: number;
};

export type TitleParseInput = {
  titleRaw: string;
  category: Category;
  brandOverrideId?: string | null;
  modelOverrideId?: string | null;
};

export type TitleParseSuggestion = {
  id: string;
  label: string;
  confidence: number;
};

export type TitleParseCandidate = {
  rawText: string;
  normalizedText: string;
  parentBrandId?: string | null;
};

export type TitleParseResult = {
  titleRaw: string;
  titleDisplay: string;
  brand: {
    id: string | null;
    label: string;
    groupKey?: string | null;
    isVerified: boolean;
    confidence: number;
    source: "override" | "catalog" | "fuzzy" | "unknown";
  };
  model: {
    id: string | null;
    label: string | null;
    isVerified: boolean;
    confidence: number;
    source: "override" | "catalog" | "fuzzy" | "unknown";
  };
  name: string;
  parseConfidence: number;
  parseVersion: string;
  suggestions: {
    brand?: TitleParseSuggestion;
    model?: TitleParseSuggestion;
  };
  candidates: {
    brand?: TitleParseCandidate;
    model?: TitleParseCandidate;
  };
  matchedTokens: {
    brand?: { start: number; length: number };
    model?: { start: number; length: number };
  };
};

type Token = {
  raw: string;
  normalized: string;
};

const PARSE_VERSION = "v1";
const HIGH_CONFIDENCE = 0.93;
const MEDIUM_CONFIDENCE = 0.85;

export function normalizeLabel(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenizeWithRaw(value: string): Token[] {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim();

  if (!cleaned) return [];

  return cleaned.split(/\s+/).map((raw) => ({
    raw,
    normalized: normalizeLabel(raw),
  }));
}

function findExactMatch(tokens: string[], aliases: CatalogBrandAlias[] | CatalogModelAlias[]) {
  let best: { alias: any; start: number; length: number; score: number } | null = null;

  for (const alias of aliases) {
    const aliasTokens = alias.aliasNormalized.split(" ").filter(Boolean);
    if (aliasTokens.length === 0) continue;

    for (let i = 0; i <= tokens.length - aliasTokens.length; i += 1) {
      let match = true;
      for (let j = 0; j < aliasTokens.length; j += 1) {
        if (tokens[i + j] !== aliasTokens[j]) {
          match = false;
          break;
        }
      }
      if (!match) continue;

      const score =
        aliasTokens.length * 100 +
        alias.aliasNormalized.length +
        (alias.priority ?? 0) * 10;

      if (!best) {
        best = { alias, start: i, length: aliasTokens.length, score };
        continue;
      }

      if (score > best.score) {
        best = { alias, start: i, length: aliasTokens.length, score };
        continue;
      }

      if (score === best.score && i < best.start) {
        best = { alias, start: i, length: aliasTokens.length, score };
      }
    }
  }

  return best;
}

function damerauLevenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  const aLen = a.length;
  const bLen = b.length;

  for (let i = 0; i <= aLen; i += 1) {
    matrix[i] = [i];
  }
  for (let j = 1; j <= bLen; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= aLen; i += 1) {
    for (let j = 1; j <= bLen; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const del = matrix[i - 1][j] + 1;
      const ins = matrix[i][j - 1] + 1;
      const sub = matrix[i - 1][j - 1] + cost;
      let val = Math.min(del, ins, sub);

      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        val = Math.min(val, matrix[i - 2][j - 2] + cost);
      }
      matrix[i][j] = val;
    }
  }

  return matrix[aLen][bLen];
}

function computeSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const distance = damerauLevenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

function findFuzzyMatch(tokens: string[], aliases: CatalogBrandAlias[] | CatalogModelAlias[]) {
  let best:
    | { alias: any; start: number; length: number; similarity: number }
    | null = null;

  for (const alias of aliases) {
    const aliasTokens = alias.aliasNormalized.split(" ").filter(Boolean);
    if (aliasTokens.length === 0) continue;

    for (let i = 0; i <= tokens.length - aliasTokens.length; i += 1) {
      const window = tokens.slice(i, i + aliasTokens.length).join(" ");
      const similarity = computeSimilarity(alias.aliasNormalized, window);
      if (!best || similarity > best.similarity) {
        best = { alias, start: i, length: aliasTokens.length, similarity };
      }
    }
  }

  return best;
}

function extractBrandCandidate(tokens: Token[]): string | null {
  if (tokens.length === 0) return null;
  const picked: string[] = [];
  for (const token of tokens) {
    if (/\d/.test(token.normalized)) break;
    picked.push(token.raw);
    if (picked.length >= 3) break;
  }
  return picked.length > 0 ? picked.join(" ") : tokens[0].raw;
}

function extractModelCandidate(tokens: Token[], brandMatch?: { start: number; length: number } | null): string | null {
  const filtered = tokens.filter((_, index) => {
    if (!brandMatch) return true;
    return index < brandMatch.start || index >= brandMatch.start + brandMatch.length;
  });

  const withDigits = filtered.find((token) => /\d/.test(token.normalized));
  if (withDigits) return withDigits.raw;

  return filtered[0]?.raw ?? null;
}

export function parseTitleWithCatalog(
  input: TitleParseInput,
  catalog: {
    brandAliases: CatalogBrandAlias[];
    modelAliasesByBrand: Record<string, CatalogModelAlias[]>;
  }
): TitleParseResult {
  const titleRaw = input.titleRaw?.trim() ?? "";
  const tokensWithRaw = tokenizeWithRaw(titleRaw);
  const tokens = tokensWithRaw.map((token) => token.normalized).filter(Boolean);

  const suggestions: TitleParseResult["suggestions"] = {};
  const candidates: TitleParseResult["candidates"] = {};

  let brandMatch = null as null | { alias: CatalogBrandAlias; start: number; length: number; confidence: number; source: TitleParseResult["brand"]["source"] };
  const fallbackBrandAlias = catalog.brandAliases.find(
    (alias) => alias.aliasNormalized === "other"
  );

  const brandOverrides = input.brandOverrideId
    ? catalog.brandAliases.filter((alias) => alias.brandId === input.brandOverrideId)
    : [];

  if (input.brandOverrideId && brandOverrides.length > 0) {
    const exactOverride = findExactMatch(tokens, brandOverrides);
    const alias = exactOverride?.alias ?? brandOverrides[0];
    brandMatch = {
      alias,
      start: exactOverride?.start ?? -1,
      length: exactOverride?.length ?? 0,
      confidence: 1,
      source: "override",
    };
  } else if (tokens.length > 0) {
    const exactBrand = findExactMatch(tokens, catalog.brandAliases);
    if (exactBrand) {
      brandMatch = {
        alias: exactBrand.alias,
        start: exactBrand.start,
        length: exactBrand.length,
        confidence: 1,
        source: "catalog",
      };
    } else {
      const fuzzyBrand = findFuzzyMatch(tokens, catalog.brandAliases);
      if (fuzzyBrand && fuzzyBrand.similarity >= MEDIUM_CONFIDENCE) {
        if (fuzzyBrand.similarity >= HIGH_CONFIDENCE) {
          brandMatch = {
            alias: fuzzyBrand.alias,
            start: fuzzyBrand.start,
            length: fuzzyBrand.length,
            confidence: fuzzyBrand.similarity,
            source: "fuzzy",
          };
        } else {
          suggestions.brand = {
            id: fuzzyBrand.alias.brandId,
            label: fuzzyBrand.alias.brandLabel,
            confidence: fuzzyBrand.similarity,
          };
        }
      }
    }
  }

  let brandLabel = brandMatch?.alias.brandLabel ?? "";
  let brandId = brandMatch?.alias.brandId ?? null;
  let brandGroupKey = brandMatch?.alias.groupKey ?? null;
  let brandConfidence = brandMatch?.confidence ?? 0;
  let brandSource = brandMatch?.source ?? "unknown";
  let brandIsVerified = Boolean(brandMatch && brandMatch.source !== "unknown");

  if (!brandMatch) {
    const candidate = extractBrandCandidate(tokensWithRaw);
    if (candidate) {
      candidates.brand = {
        rawText: candidate,
        normalizedText: normalizeLabel(candidate),
      };
    }

    if (fallbackBrandAlias) {
      brandLabel = fallbackBrandAlias.brandLabel;
      brandId = null;
      brandGroupKey = fallbackBrandAlias.groupKey ?? null;
      brandConfidence = 0.2;
      brandSource = "unknown";
      brandIsVerified = false;
    } else if (candidate) {
      brandLabel = candidate.trim();
      brandId = null;
      brandGroupKey = null;
      brandConfidence = 0.2;
      brandSource = "unknown";
      brandIsVerified = false;
    }
  }

  let modelMatch = null as null | { alias: CatalogModelAlias; start: number; length: number; confidence: number; source: TitleParseResult["model"]["source"] };
  let modelLabel: string | null = null;
  let modelId: string | null = null;
  let modelConfidence = 0;
  let modelSource: TitleParseResult["model"]["source"] = "unknown";
  let modelIsVerified = false;

  const isSneaker = input.category === "sneakers";
  if (!isSneaker) {
    modelLabel = null;
    modelId = null;
    modelConfidence = 1;
    modelSource = "unknown";
    modelIsVerified = true;
  }
  if (isSneaker && brandId) {
    const modelAliases = catalog.modelAliasesByBrand[brandId] ?? [];
    if (input.modelOverrideId) {
      const overrideAliases = modelAliases.filter(
        (alias) => alias.modelId === input.modelOverrideId
      );
      if (overrideAliases.length > 0) {
        const exactOverride = findExactMatch(tokens, overrideAliases);
        const alias = exactOverride?.alias ?? overrideAliases[0];
        modelMatch = {
          alias,
          start: exactOverride?.start ?? -1,
          length: exactOverride?.length ?? 0,
          confidence: 1,
          source: "override",
        };
      }
    }

    if (!modelMatch && tokens.length > 0 && modelAliases.length > 0) {
      const exactModel = findExactMatch(tokens, modelAliases);
      if (exactModel) {
        modelMatch = {
          alias: exactModel.alias,
          start: exactModel.start,
          length: exactModel.length,
          confidence: 1,
          source: "catalog",
        };
      } else {
        const fuzzyModel = findFuzzyMatch(tokens, modelAliases);
        if (fuzzyModel && fuzzyModel.similarity >= MEDIUM_CONFIDENCE) {
          if (fuzzyModel.similarity >= HIGH_CONFIDENCE) {
            modelMatch = {
              alias: fuzzyModel.alias,
              start: fuzzyModel.start,
              length: fuzzyModel.length,
              confidence: fuzzyModel.similarity,
              source: "fuzzy",
            };
          } else {
            suggestions.model = {
              id: fuzzyModel.alias.modelId,
              label: fuzzyModel.alias.modelLabel,
              confidence: fuzzyModel.similarity,
            };
          }
        }
      }
    }
  }

  if (modelMatch) {
    modelLabel = modelMatch.alias.modelLabel;
    modelId = modelMatch.alias.modelId;
    modelConfidence = modelMatch.confidence;
    modelSource = modelMatch.source;
    modelIsVerified = modelMatch.source !== "unknown";
  } else if (isSneaker && brandId) {
    const modelAliases = catalog.modelAliasesByBrand[brandId] ?? [];
    const fallbackLabel = normalizeLabel(`other ${brandLabel} models`);
    const fallbackAlias = modelAliases.find(
      (alias) => alias.aliasNormalized === fallbackLabel
    );

    if (fallbackAlias) {
      modelLabel = fallbackAlias.modelLabel;
      modelId = fallbackAlias.modelId;
      modelConfidence = 0.2;
      modelSource = "unknown";
      modelIsVerified = false;
    } else {
      modelLabel = null;
      modelId = null;
      modelConfidence = 0;
      modelSource = "unknown";
      modelIsVerified = false;
    }

    const candidate = extractModelCandidate(tokensWithRaw, brandMatch);
    if (candidate) {
      candidates.model = {
        rawText: candidate,
        normalizedText: normalizeLabel(candidate),
        parentBrandId: brandId,
      };
    }
  }

  const removeBrandTokens = brandMatch && brandMatch.source !== "unknown";
  const removeModelTokens = modelMatch && modelMatch.source !== "unknown";

  const removalSet = new Set<number>();
  if (removeBrandTokens && brandMatch && brandMatch.start >= 0) {
    for (let i = 0; i < brandMatch.length; i += 1) {
      removalSet.add(brandMatch.start + i);
    }
  }
  if (removeModelTokens && modelMatch && modelMatch.start >= 0) {
    for (let i = 0; i < modelMatch.length; i += 1) {
      removalSet.add(modelMatch.start + i);
    }
  }

  const remainderTokens = tokensWithRaw.filter((_, index) => !removalSet.has(index));
  let name = remainderTokens.map((token) => token.raw).join(" ").trim();

  if (!name) {
    name = titleRaw.trim();
  }

  let titleDisplay = "";
  if (brandSource === "unknown") {
    titleDisplay = titleRaw.trim();
  } else {
    const includeModel = isSneaker && modelSource !== "unknown";
    const parts = [brandLabel, includeModel ? modelLabel : null, name].filter(Boolean);
    titleDisplay = parts.join(" ").trim();
  }
  if (!titleDisplay) {
    titleDisplay = titleRaw.trim();
  }

  let parseConfidence = brandConfidence;
  if (isSneaker && modelMatch) {
    parseConfidence = Math.min(brandConfidence, modelConfidence);
  }

  return {
    titleRaw: titleRaw,
    titleDisplay,
    brand: {
      id: brandId,
      label: brandLabel,
      groupKey: brandGroupKey ?? null,
      isVerified: brandIsVerified,
      confidence: brandConfidence,
      source: brandSource,
    },
    model: {
      id: modelId,
      label: isSneaker ? modelLabel : null,
      isVerified: modelIsVerified,
      confidence: modelConfidence,
      source: modelSource,
    },
    name,
    parseConfidence,
    parseVersion: PARSE_VERSION,
    suggestions,
    candidates,
    matchedTokens: {
      brand: brandMatch ? { start: brandMatch.start, length: brandMatch.length } : undefined,
      model: modelMatch ? { start: modelMatch.start, length: modelMatch.length } : undefined,
    },
  };
}
