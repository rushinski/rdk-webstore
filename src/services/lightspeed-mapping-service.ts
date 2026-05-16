import { LIGHTSPEED_CONDITION_MAP } from "@/config/constants/lightspeed";
import type { Condition } from "@/types/domain/product";

export class LightspeedMappingService {
  toLightspeedCondition(condition: Condition) {
    return condition === "used"
      ? LIGHTSPEED_CONDITION_MAP.used
      : LIGHTSPEED_CONDITION_MAP.new;
  }

  toWebsiteCondition(condition: string): Condition {
    return condition.toLowerCase() === "preowned" ? "used" : "new";
  }

  toSkuConditionCode(condition: Condition) {
    return condition === "used" ? "P" : "N";
  }

  toCode(value: string, length: number) {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!normalized) {
      return "X".repeat(length);
    }

    return normalized.slice(0, length).padEnd(length, "X");
  }

  toSizeCode(sizeLabel: string) {
    const normalized = sizeLabel.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!normalized) {
      return "NA";
    }

    if (/^[0-9]+$/.test(normalized)) {
      return normalized.padStart(2, "0").slice(-2);
    }

    return normalized.slice(0, 2).padEnd(2, "X");
  }

  toRepresentativeSizeCode(sizeLabels: string[]) {
    const distinct = [...new Set(sizeLabels.map((size) => size.trim()).filter(Boolean))];
    if (distinct.length !== 1) {
      return "MV";
    }

    return this.toSizeCode(distinct[0]);
  }

  buildLightspeedName(input: {
    titleDisplay: string;
    sku: string;
    condition: Condition;
    sizeLabel: string;
    isUniqueUnit: boolean;
  }) {
    if (!input.isUniqueUnit) {
      return input.titleDisplay;
    }

    return `${input.titleDisplay} - ${input.sku}`;
  }

  cleanWebsiteName(rawName: string) {
    return rawName.replace(/\s+-\s+[A-Z]-[A-Z0-9-]+$/i, "").trim();
  }
}
