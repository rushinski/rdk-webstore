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

  relevantSales: number;
  percentageToThreshold: number;

  isRegistered: boolean;
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

  stripeRegistered?: boolean;
  resetDate?: string;
};

export type NexusData = {
  homeState: string;
  states: StateSummary[];
};
