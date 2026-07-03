import type { NexusData, StateSummary } from "@/types/domain/nexus";

export function shouldPromptForHomeOffice(
  isHomeOfficeConfigured: boolean,
  currentRegistered: boolean,
) {
  return !isHomeOfficeConfigured && !currentRegistered;
}

export function resolveUpdatedSelectedState(
  data: NexusData | null,
  selectedState: StateSummary | null,
  stateCode: string,
) {
  if (selectedState?.stateCode !== stateCode) {
    return null;
  }

  return data?.states.find((state) => state.stateCode === stateCode) ?? null;
}

export function isHomeOfficeSetupError(message: string) {
  return message.includes("head office");
}
