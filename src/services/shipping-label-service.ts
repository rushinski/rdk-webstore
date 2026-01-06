// src/services/shipping-label-service.ts

import { Shippo } from "shippo";
import { DistanceUnitEnum, WeightUnitEnum, LabelFileTypeEnum } from "shippo/models/components";
import { env } from "@/config/env";
import { logError } from "@/lib/log";

// Shippo SDK init (server-side only)
const shippo = new Shippo({
  apiKeyHeader: env.SHIPPO_API_TOKEN,
});

// Keep these interfaces aligned with shipping_origins + order_shipping snapshots
interface IAddress {
  name?: string | null;
  company?: string | null;
  street1: string;
  street2?: string | null;
  city: string;
  state: string;
  zip: string;
  country: string; // Prefer ISO-3166-1 alpha-2 like "US"
  phone?: string | null;
}

interface IParcel {
  length: number;
  width: number;
  height: number;
  weight: number; // ounces (your app uses oz)
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
    // Shippo examples commonly use LB; we convert oz -> lb for consistency. :contentReference[oaicite:7]{index=7}
    const weightLb = parcel.weight / 16;

    return {
      length: String(parcel.length),
      width: String(parcel.width),
      height: String(parcel.height),
      distanceUnit: DistanceUnitEnum.In,
      weight: String(Number.isFinite(weightLb) ? weightLb : 1),
      massUnit: WeightUnitEnum.Lb,
    };
  }

  /**
   * Creates a Shippo shipment and returns rates (async=false).
   * Shippo shipment creation returns `rates` that include `object_id`/`objectId`. :contentReference[oaicite:8]{index=8}
   */
  async createShipment(fromAddress: IAddress, toAddress: IAddress, parcel: IParcel): Promise<any> {
    try {
      const shipment = await shippo.shipments.create({
        addressFrom: this.toShippoAddress(fromAddress),
        addressTo: this.toShippoAddress(toAddress),
        parcels: [this.toShippoParcel(parcel)],
        async: false,
      });

      return shipment;
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
   * Purchases a label by creating a Transaction for the given rateId.
   * Shippo: transactions.create({ rate, labelFileType, async:false }) :contentReference[oaicite:9]{index=9}
   */
  async purchaseLabel(rateId: string): Promise<any> {
    try {
      const transaction = await shippo.transactions.create({
        rate: rateId,
        labelFileType: LabelFileTypeEnum.Pdf,
        async: false,
      });

      return transaction;
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
