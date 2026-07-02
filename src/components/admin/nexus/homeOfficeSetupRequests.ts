import type {
  ExistingAddress,
  HomeOfficeFormData,
  OldHomeOfficeAction,
} from "@/components/admin/nexus/homeOfficeSetupTypes";

type HomeOfficeSetupData = {
  address: ExistingAddress | null;
  homeState: string | null;
};

export async function loadHomeOfficeSetupDataRequest(): Promise<HomeOfficeSetupData> {
  const [addressRes, summaryRes] = await Promise.all([
    fetch("/api/admin/nexus/head-office-address"),
    fetch("/api/admin/nexus/summary"),
  ]);

  let address: ExistingAddress | null = null;
  let homeState: string | null = null;

  if (addressRes.ok) {
    const data = await addressRes.json().catch(() => null);
    address = data?.address ?? null;
  }

  if (summaryRes.ok) {
    const summary = await summaryRes.json().catch(() => null);
    homeState = summary?.homeState ?? null;
  }

  return { address, homeState };
}

export async function submitHomeOfficeSetupRequest({
  formData,
  isConfigured,
  oldHomeAction,
  oldHomeState,
}: {
  formData: HomeOfficeFormData;
  isConfigured: boolean;
  oldHomeAction: OldHomeOfficeAction;
  oldHomeState: string | null;
}) {
  const response = await fetch("/api/admin/nexus/setup-home", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stateCode: formData.stateCode,
      businessName: formData.businessName || undefined,
      address: {
        line1: formData.line1,
        line2: formData.line2 || undefined,
        city: formData.city,
        state: formData.stateCode,
        postalCode: formData.postalCode,
        country: "US",
      },
      oldHomeState:
        isConfigured && oldHomeState !== formData.stateCode ? oldHomeState : undefined,
      oldHomeAction:
        isConfigured && oldHomeState !== formData.stateCode
          ? oldHomeAction
          : undefined,
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error || "Failed to setup home office");
  }
}
