import type { HomeOfficeFormData } from "@/modules/nexus/presentation/admin/homeOfficeSetupTypes";

export function getHomeOfficeAddressFormTitle(isConfigured: boolean, title?: string) {
  return title ?? (isConfigured ? "Change Office Location" : "Setup Home Office");
}

export function getHomeOfficeAddressFormDescription(isConfigured: boolean) {
  return isConfigured
    ? "Update your business address for tax registrations"
    : "Configure your business address to enable tax registrations";
}

export function getHomeOfficeAddressFormNote(isConfigured: boolean) {
  return isConfigured
    ? "This address will be used as your tax registration headquarters."
    : "This address will be used as your tax registration headquarters. It will mark your home state for physical nexus.";
}

export function updateHomeOfficeFormData<Field extends keyof HomeOfficeFormData>(
  formData: HomeOfficeFormData,
  field: Field,
  value: HomeOfficeFormData[Field],
): HomeOfficeFormData {
  return {
    ...formData,
    [field]: value,
  };
}
