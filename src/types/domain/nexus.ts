// src/types/domain/nexus.ts
export type NexusType = "physical" | "economic";

export type StateSummary = {
  stateCode: string;
  stateName: string;

  threshold: number;
  thresholdType: string;
  window: string;

  totalSales: number;
  taxableSales: number;
  transactionCount: number;
  taxCollected: number;
  relevantSales: number;
  percentageToThreshold: number;

  isRegistered: boolean;        // <-- interpret as "State permit registered" (manual)
  nexusType: NexusType;
  isHomeState: boolean;

  taxable: boolean;
  notes?: string;

  exemption?: number;
  marginal?: boolean;
  allOrNothing?: boolean;

  transactionThreshold?: number;
  meetsTransactionThreshold?: boolean;
  both?: boolean;

  stripeRegistered?: boolean;   // <-- "Active in Stripe"
  resetDate?: string;

  // NEW: better calendar vs rolling display
  trackingStartDate?: string | null;
  trackingEndDate?: string | null;
};

export type NexusData = {
  homeState: string;
  states: StateSummary[];
};
