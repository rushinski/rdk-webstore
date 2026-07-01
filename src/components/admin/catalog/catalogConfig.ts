import type { ActiveTab, NewAliasDraft } from "./types";

export const catalogTabs: Array<{ key: ActiveTab; label: string }> = [
  { key: "brands", label: "Tags" },
  { key: "aliases", label: "Aliases" },
  { key: "candidates", label: "Candidates" },
];

export const emptyCatalogDraft = {
  brand: { label: "" },
  model: { brandId: "", label: "" },
  alias: {
    entityType: "brand" as const,
    entityId: "",
    label: "",
    priority: "0",
  } satisfies NewAliasDraft,
};

export const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, " ");

export const toTitleCase = (value: string) =>
  normalizeWhitespace(value)
    .split(" ")
    .map((word) => {
      if (word.toUpperCase() === word) {
        return word;
      }
      if (word.toLowerCase() === word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(" ");

export const normalizeLabel = (value: string) => normalizeWhitespace(value).toLowerCase();
