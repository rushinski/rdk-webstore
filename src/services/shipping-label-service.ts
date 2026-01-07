// src/services/shipping-label-service.ts

import { Shippo } from "shippo";
import { DistanceUnitEnum, WeightUnitEnum, LabelFileTypeEnum } from "shippo/models/components";
import { env } from "@/config/env";
import { logError } from "@/lib/log";

// Shippo SDK init (server-side only)
const shippo = new Shippo({
  apiKeyHeader: env.SHIPPO_API_TOKEN,
});

interface IAddress {
  name?: string | null;
  company?: string | null;
  street1: string;
  street2?: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string | null;
}

interface IParcel {
  length: number;
  width: number;
  height: number;
  weight: number; // ounces
}

// Normalized response types
export interface NormalizedRate {
  id: string;
  carrier: string;
  service: string;
  rate: string;
  currency: string;
  estimated_delivery_days: number | null;
}

export interface NormalizedShipment {
  id: string;
  rates: NormalizedRate[];
}

export interface NormalizedTransaction {
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  messages: Array<{ text: string }>;
}

export class ShippoService {
  private toShippoAddress(address: IAddress) {
    return {
      name: address.name ?? undefined,
      company: address.company ?? undefined,
      street1: address.street1,
      street2: address.street2 ?? undefined,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country,
      phone: address.phone ?? undefined,
    };
  }

  private toShippoParcel(parcel: IParcel) {
    const weightLb = parcel.weight / 16;

    return {
      length: String(parcel.length),
      width: String(parcel.width),
      height: String(parcel.height),
      distanceUnit: DistanceUnitEnum.In,
      weight: String(Number.isFinite(weightLb) && weightLb > 0 ? weightLb : 1),
      massUnit: WeightUnitEnum.Lb,
    };
  }

  /**
   * Normalize a Shippo rate object to consistent format
   */
  private normalizeRate(rate: any): NormalizedRate | null {
    // Shippo rate fields: objectId, provider, servicelevel, amount, currency, estimatedDays
    const id = rate?.objectId ?? rate?.object_id ?? null;
    if (!id) return null;

    const carrier = rate?.provider ?? rate?.carrier ?? "Unknown";
    const service = rate?.servicelevel?.name ?? rate?.service ?? "Standard";
    const amount = rate?.amount ?? rate?.rate ?? "0";
    const currency = rate?.currency ?? "USD";
    const estimatedDays = rate?.estimatedDays ?? rate?.estimated_days ?? null;

    return {
      id: String(id),
      carrier: String(carrier),
      service: String(service),
      rate: String(amount),
      currency: String(currency),
      estimated_delivery_days: estimatedDays ? Number(estimatedDays) : null,
    };
  }

  /**
   * Creates a Shippo shipment and returns normalized shipment with rates
   */
  async createShipment(
    fromAddress: IAddress,
    toAddress: IAddress,
    parcel: IParcel
  ): Promise<NormalizedShipment> {
    try {
      const shipment = await shippo.shipments.create({
        addressFrom: this.toShippoAddress(fromAddress),
        addressTo: this.toShippoAddress(toAddress),
        parcels: [this.toShippoParcel(parcel)],
        async: false,
      });

      // Shippo shipment object structure
      const shipmentId = (shipment as any)?.objectId ?? (shipment as any)?.object_id;
      if (!shipmentId) {
        logError(new Error("Shippo shipment missing objectId"), {
          layer: "service",
          event: "shippo_shipment_no_id",
          shipmentKeys: shipment ? Object.keys(shipment) : [],
        });
        throw new Error("Shippo shipment creation returned invalid response (missing ID)");
      }

      const rawRates = (shipment as any)?.rates ?? [];
      const normalizedRates = rawRates
        .map((r: any) => this.normalizeRate(r))
        .filter((r: NormalizedRate | null): r is NormalizedRate => r !== null);

      return {
        id: String(shipmentId),
        rates: normalizedRates,
      };
    } catch (error: any) {
      logError(error, {
        layer: "service",
        event: "shippo_create_shipment_failed",
        errorMessage: error?.message,
      });
      throw new Error(`Shippo shipment creation failed: ${error?.message ?? "unknown error"}`);
    }
  }

  /**
   * Purchases a label by creating a Transaction for the given rateId
   */
  async purchaseLabel(rateId: string): Promise<NormalizedTransaction> {
    try {
      const transaction = await shippo.transactions.create({
        rate: rateId,
        labelFileType: LabelFileTypeEnum.Pdf,
        async: false,
      });

      // Normalize transaction response
      const txn = transaction as any;
      
      return {
        status: String(txn?.status ?? "").toUpperCase(),
        carrier: txn?.rate?.provider ?? txn?.provider ?? null,
        trackingNumber: txn?.trackingNumber ?? txn?.tracking_number ?? null,
        trackingUrl: txn?.trackingUrlProvider ?? txn?.tracking_url_provider ?? null,
        labelUrl: txn?.labelUrl ?? txn?.label_url ?? null,
        messages: Array.isArray(txn?.messages) ? txn.messages : [],
      };
    } catch (error: any) {
      logError(error, {
        layer: "service",
        event: "shippo_purchase_label_failed",
        errorMessage: error?.message,
      });
      throw new Error(`Shippo label purchase failed: ${error?.message ?? "unknown error"}`);
    }
  }
}