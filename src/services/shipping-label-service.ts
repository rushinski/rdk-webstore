import EasyPostClient from '@easypost/api';
import { env } from "@/config/env";
import { logError } from "@/lib/log";

const client = new EasyPostClient(env.EASYPOST_API_KEY);

// A simple interface for the address data we need.
// This should be kept in sync with the data from shipping_origins and order_shipping.
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

// A simple interface for the parcel data we need.
interface IParcel {
    length: number;
    width: number;
    height: number;
    weight: number; // in ounces
}

export class EasyPostService {
    /**
     * Creates an EasyPost address object.
     * @param address The address data.
     * @returns An EasyPost Address object.
     */
    private async createAddress(address: IAddress): Promise<any> {
        return new client.Address({
            name: address.name,
            company: address.company,
            street1: address.street1,
            street2: address.street2,
            city: address.city,
            state: address.state,
            zip: address.zip,
            country: address.country,
            phone: address.phone,
        });
    }

    /**
     * Creates an EasyPost parcel object.
     * @param parcel The parcel data.
     * @returns An EasyPost Parcel object.
     */
    private async createParcel(parcel: IParcel): Promise<any> {
        return new client.Parcel({
            length: parcel.length,
            width: parcel.width,
            height: parcel.height,
            weight: parcel.weight,
        });
    }

    /**
     * Creates an EasyPost shipment. This combines the from/to addresses and the parcel.
     * The returned Shipment object will contain a list of applicable rates.
     * @param fromAddress The sender's address.
     * @param toAddress The recipient's address.
     * @param parcel The parcel details.
     * @returns An EasyPost Shipment object.
     */
    async createShipment(fromAddress: IAddress, toAddress: IAddress, parcel: IParcel): Promise<any> {
        try {
            const fromAddressObj = await this.createAddress(fromAddress);
            const toAddressObj = await this.createAddress(toAddress);
            const parcelObj = await this.createParcel(parcel);

            const shipment = await client.Shipment.create({
                from_address: fromAddressObj,
                to_address: toAddressObj,
                parcel: parcelObj,
            });

            return shipment;
        } catch (error: any) {
            logError(error, {
                layer: 'service',
                event: 'easypost_create_shipment_failed',
                errorMessage: error.message,
            });
            // Re-throw a cleaner error for the API route to handle
            throw new Error(`EasyPost shipment creation failed: ${error.message}`);
        }
    }

    /**
     * Purchases a shipping label using a specific rate from a shipment.
     * @param shipmentId The ID of the EasyPost Shipment.
     * @param rateId The ID of the rate to purchase.
     * @returns The purchased EasyPost Shipment object, which includes the label and tracking info.
     */
    async purchaseLabel(shipmentId: string, rateId: string): Promise<any> {
        try {
            const shipment = await client.Shipment.buy(shipmentId, rateId);
            return shipment;
        } catch (error: any) {
            logError(error, {
                layer: 'service',
                event: 'easypost_purchase_label_failed',
                errorMessage: error.message,
            });
            throw new Error(`EasyPost label purchase failed: ${error.message}`);
        }
    }
}