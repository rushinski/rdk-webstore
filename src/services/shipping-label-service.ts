// src/services/shipping-label-service.ts
import { env } from "@/config/env";
import { logError } from "@/lib/log";

// TODO: Cache the access token in Redis to avoid re-fetching on every call.
let accessToken: {
    token: string;
    expires_at: number;
} | null = null;

async function getUpsAccessToken(): Promise<string> {
    if (accessToken && accessToken.expires_at > Date.now()) {
        return accessToken.token;
    }

    const credentials = Buffer.from(
        `${env.UPS_CLIENT_ID}:${env.UPS_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(`${env.UPS_API_BASE_URL}/security/v1/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'x-merchant-id': env.UPS_ACCOUNT_NUMBER,
            'Authorization': `Basic ${credentials}`
        },
        body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
        const errorBody = await response.text();
        logError(new Error('Failed to get UPS access token'), {
            layer: 'service',
            event: 'ups_authentication_failed',
            responseStatus: response.status,
            responseBody: errorBody,
        });
        throw new Error('Failed to authenticate with UPS.');
    }

    const data = await response.json();
    const expiresIn = parseInt(data.expires_in, 10) * 1000;

    accessToken = {
        token: data.access_token,
        expires_at: Date.now() + expiresIn - 60000, // Subtract 1 minute for safety
    };

    return accessToken.token;
}

export class ShippingLabelService {
    // NOTE: This is a placeholder. The actual implementation will require detailed
    // mapping of our address and package format to the UPS API's format.
    async getRates(
        shipper: any, // Our internal address format
        recipient: any, // Our internal address format
        packages: any[] // Our internal package format
    ) {
        const token = await getUpsAccessToken();
        
        // TODO: Implement the call to the UPS Rating API
        // POST to /api/rating/v1/Rate
        // The request body will be complex and needs to be constructed
        // based on the UPS API documentation.
        
        console.log("Getting rates with token:", token, shipper, recipient, packages);
        
        // For now, return mock data
        return [
            { service: "UPS® Ground", cost: 12.50 },
            { service: "UPS 2nd Day Air®", cost: 25.00 },
        ];
    }
    
    // NOTE: This is a placeholder.
    async createLabel(
        shipper: any,
        recipient: any,
        packages: any[],
        serviceCode: string
    ) {
        const token = await getUpsAccessToken();

        // TODO: Implement the call to the UPS Shipping API
        // POST to /api/shipments/v1/ship
        // The request body will be very complex and requires careful
        // construction according to the UPS API documentation.

        console.log("Creating label with token:", token, shipper, recipient, packages, serviceCode);

        // For now, return mock data
        return {
            labelImage: "BASE64_ENCODED_LABEL_IMAGE_STRING",
            trackingNumber: `1Z${Math.random().toString().slice(2, 18)}`,
        };
    }
}
