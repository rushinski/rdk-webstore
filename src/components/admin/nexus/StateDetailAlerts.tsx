import { AlertTriangle } from "lucide-react";

import type { StateSummary } from "@/types/domain/nexus";

type StateDetailAlertsProps = {
  state: StateSummary;
  formatCurrency: (value: number) => string;
};

export function StateDetailAlerts({ state, formatCurrency }: StateDetailAlertsProps) {
  const needsStatePermit = state.nexusType === "physical" && !state.isRegistered;
  const approachingEconomicThreshold =
    state.nexusType === "economic" &&
    !state.isRegistered &&
    state.percentageToThreshold >= 95;

  return (
    <>
      {needsStatePermit && (
        <div className="flex gap-2 border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-700" />
          <div className="text-sm">
            <div className="font-semibold text-amber-800">
              Physical nexus - state registration required
            </div>
            <div className="text-amber-700">
              You have physical nexus in this state. Register for a state permit before
              collecting sales tax.
            </div>
          </div>
        </div>
      )}

      {approachingEconomicThreshold && (
        <div className="flex gap-2 border border-red-200 bg-red-50 p-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-700" />
          <div className="text-sm">
            <div className="font-semibold text-red-700">
              Economic nexus threshold near/exceeded
            </div>
            <div className="text-red-700">
              You&apos;ve reached {state.percentageToThreshold.toFixed(1)}% of the nexus
              threshold ({formatCurrency(state.relevantSales)} of{" "}
              {formatCurrency(state.threshold)}). Consider registering for a state permit.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
