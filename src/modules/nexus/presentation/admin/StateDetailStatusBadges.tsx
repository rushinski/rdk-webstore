import { AdminStatusBadge } from "@/modules/shared/presentation/admin/ui/AdminStatusBadge";
import type { StateSummary } from "@/types/domain/nexus";

type StateDetailStatusBadgesProps = {
  state: StateSummary;
};

export function StateDetailStatusBadges({ state }: StateDetailStatusBadgesProps) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {state.isRegistered ? (
        <AdminStatusBadge tone="success">State permit: Registered</AdminStatusBadge>
      ) : (
        <AdminStatusBadge tone="neutral">State permit: Not registered</AdminStatusBadge>
      )}
      <AdminStatusBadge tone={state.nexusType === "physical" ? "warning" : "neutral"}>
        {state.nexusType === "physical" ? "Physical nexus" : "Economic nexus"}
      </AdminStatusBadge>
      {state.isHomeState && <AdminStatusBadge tone="warning">Home Office State</AdminStatusBadge>}
    </div>
  );
}

