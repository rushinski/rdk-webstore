import { ExternalLink } from "lucide-react";

import { adminButtonStyles } from "@/modules/shared/presentation/admin/ui/adminButtonStyles";
import { STATE_REGISTRATION_URLS } from "@/config/constants/nexus-thresholds";
import type { StateSummary } from "@/types/domain/nexus";

type StateRegistrationSetupSectionProps = {
  isHomeOfficeConfigured: boolean;
  isUpdating: boolean;
  onNexusTypeChange: (stateCode: string, newType: "physical" | "economic") => void;
  onOpenHomeOffice: () => void;
  onRegisterToggle: (
    stateCode: string,
    currentRegistered: boolean,
    nexusType: "physical" | "economic",
  ) => void;
  state: StateSummary;
};

export function StateRegistrationSetupSection({
  isHomeOfficeConfigured,
  isUpdating,
  onNexusTypeChange,
  onOpenHomeOffice,
  onRegisterToggle,
  state,
}: StateRegistrationSetupSectionProps) {
  return (
    <>
      {!state.isHomeState && (
        <div className="flex gap-3">
          <button
            onClick={() => onNexusTypeChange(state.stateCode, "physical")}
            disabled={isUpdating}
            className={[
              "border px-4 py-2 text-sm",
              state.nexusType === "physical"
                ? "border-brand-text bg-brand-text text-brand-page"
                : "border-brand-border bg-brand-surface text-brand-text hover:bg-brand-page",
              "disabled:cursor-not-allowed disabled:opacity-50",
            ].join(" ")}
          >
            Physical Nexus
          </button>
          <button
            onClick={() => onNexusTypeChange(state.stateCode, "economic")}
            disabled={isUpdating}
            className={[
              "border px-4 py-2 text-sm",
              state.nexusType === "economic"
                ? "border-brand-text bg-brand-text text-brand-page"
                : "border-brand-border bg-brand-surface text-brand-text hover:bg-brand-page",
              "disabled:cursor-not-allowed disabled:opacity-50",
            ].join(" ")}
          >
            Economic Nexus
          </button>
        </div>
      )}

      <div className="border border-brand-border bg-brand-page p-4">
        <div className="mb-2 text-sm font-semibold text-brand-text">
          Registration & setup
        </div>
        <div className="text-sm text-brand-muted">
          Mark your <span className="font-medium text-brand-text">state permit</span>{" "}
          status here, and use the resources to complete state registration.
        </div>

        {!isHomeOfficeConfigured && (
          <div className="mt-3 text-xs text-amber-700">
            Home Office is required for tax registrations (Settings &gt; Home Office).
            <button
              onClick={onOpenHomeOffice}
              className="ml-2 underline underline-offset-2 hover:text-amber-900"
            >
              Open Home Office
            </button>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() =>
              onRegisterToggle(state.stateCode, state.isRegistered, state.nexusType)
            }
            disabled={isUpdating}
            className={[
              state.isRegistered
                ? adminButtonStyles.secondary
                : adminButtonStyles.primary,
              "px-3 py-1.5 text-sm",
              "disabled:cursor-not-allowed disabled:opacity-50",
            ].join(" ")}
            title={state.isRegistered ? "Mark as not registered" : "Mark as registered"}
          >
            {state.isRegistered
              ? "Mark permit as not registered"
              : "Mark permit as registered"}
          </button>

          {STATE_REGISTRATION_URLS[state.stateCode] && (
            <a
              href={STATE_REGISTRATION_URLS[state.stateCode]}
              target="_blank"
              rel="noopener noreferrer"
              className={`${adminButtonStyles.secondary} gap-2 px-3 py-1.5 text-sm`}
            >
              State registration site <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </>
  );
}

