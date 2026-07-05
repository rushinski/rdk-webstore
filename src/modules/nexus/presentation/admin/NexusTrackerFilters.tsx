import { Search } from "lucide-react";

import type { NexusTrackerFilterValues } from "@/modules/nexus/presentation/admin/nexusTrackerView";
import { AdminSectionCard } from "@/modules/shared/presentation/admin/ui/AdminSectionCard";
import { adminFormStyles } from "@/modules/shared/presentation/admin/ui/adminFormStyles";
import { RdkSelect, type RdkSelectOption } from "@/components/ui/Select";

type NexusTrackerFiltersProps = {
  filterRegisteredOptions: RdkSelectOption[];
  nexusTypeOptions: RdkSelectOption[];
  onFilterChange: <K extends keyof NexusTrackerFilterValues>(
    key: K,
    value: NexusTrackerFilterValues[K],
  ) => void;
  onSearchQueryChange: (value: string) => void;
  searchQuery: string;
  values: NexusTrackerFilterValues;
  windowOptions: RdkSelectOption[];
};

export function NexusTrackerFilters({
  filterRegisteredOptions,
  nexusTypeOptions,
  onFilterChange,
  onSearchQueryChange,
  searchQuery,
  values,
  windowOptions,
}: NexusTrackerFiltersProps) {
  return (
    <AdminSectionCard title="Filters">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[160px] flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              placeholder="Search states..."
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              className={`${adminFormStyles.input} h-9 pl-8 pr-2.5 py-1 text-[11px] sm:text-sm`}
            />
          </div>
        </div>

        <RdkSelect
          value={values.filterRegistered}
          onChange={(value) =>
            onFilterChange(
              "filterRegistered",
              value as NexusTrackerFilterValues["filterRegistered"],
            )
          }
          options={filterRegisteredOptions}
          className="min-w-[160px]"
          buttonClassName="h-8 py-1 text-[11px] sm:text-sm"
          menuClassName="text-[11px] sm:text-sm"
        />

        <RdkSelect
          value={values.filterNexusType}
          onChange={(value) =>
            onFilterChange(
              "filterNexusType",
              value as NexusTrackerFilterValues["filterNexusType"],
            )
          }
          options={nexusTypeOptions}
          className="min-w-[160px]"
          buttonClassName="h-8 py-1 text-[11px] sm:text-sm"
          menuClassName="text-[11px] sm:text-sm"
        />

        <RdkSelect
          value={values.filterWindow}
          onChange={(value) =>
            onFilterChange(
              "filterWindow",
              value as NexusTrackerFilterValues["filterWindow"],
            )
          }
          options={windowOptions}
          className="min-w-[160px]"
          buttonClassName="h-8 py-1 text-[11px] sm:text-sm"
          menuClassName="text-[11px] sm:text-sm"
        />

        <label className="flex items-center gap-1.5 text-[11px] leading-none sm:text-sm">
          <input
            type="checkbox"
            checked={values.filterNeedsAction}
            onChange={(event) => onFilterChange("filterNeedsAction", event.target.checked)}
            className="rdk-checkbox scale-90"
          />
          <span className="text-brand-text">Needs Action Only</span>
        </label>
      </div>
    </AdminSectionCard>
  );
}

