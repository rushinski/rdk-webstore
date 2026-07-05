import { AdminMetricCard } from "@/modules/shared/presentation/admin/ui/AdminMetricCard";

type NexusTrackerOverviewCardsProps = {
  atRiskStates: number;
  needsRegistrationCount: number;
  registeredStates: number;
};

export function NexusTrackerOverviewCards({
  atRiskStates,
  needsRegistrationCount,
  registeredStates,
}: NexusTrackerOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <AdminMetricCard
        label="Registered States"
        value={String(registeredStates)}
        detail="States with permits on file."
      />
      <AdminMetricCard
        label="At Risk States"
        value={String(atRiskStates)}
        detail="Economic nexus nearing or over threshold."
      />
      <AdminMetricCard
        label="Needs Registration"
        value={String(needsRegistrationCount)}
        detail="Physical nexus states still pending."
      />
    </div>
  );
}

