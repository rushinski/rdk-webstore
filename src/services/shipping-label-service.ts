// src/services/shipping-label-service.ts

import { Shippo } from "shippo";
import { DistanceUnitEnum, WeightUnitEnum, LabelFileTypeEnum } from "shippo/models/components";
import { env } from "@/config/env";
import { logError } from "@/lib/log";

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
  rate: string | null; // Actual cost in dollars (e.g., "5.50")
  currency: string | null;
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

  private normalizeRate(rate: any): NormalizedRate | null {
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

  async purchaseLabel(rateId: string): Promise<NormalizedTransaction> {
    try {
      const transaction = await shippo.transactions.create({
        rate: rateId,
        labelFileType: LabelFileTypeEnum.Pdf,
        async: false,
      });

      const txn = transaction as any;
      
      // Extract rate information from the transaction
      const rate = txn?.rate?.amount ?? txn?.amount ?? null;
      const currency = txn?.rate?.currency ?? txn?.currency ?? "USD";
      
      return {
        status: String(txn?.status ?? "").toUpperCase(),
        carrier: txn?.rate?.provider ?? txn?.provider ?? null,
        trackingNumber: txn?.trackingNumber ?? txn?.tracking_number ?? null,
        trackingUrl: txn?.trackingUrlProvider ?? txn?.tracking_url_provider ?? null,
        labelUrl: txn?.labelUrl ?? txn?.label_url ?? null,
        rate: rate ? String(rate) : null,
        currency: currency ? String(currency) : null,
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