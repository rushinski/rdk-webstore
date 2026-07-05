import type {
  EasyPostRate,
  ParcelDraft,
  ShippingAddressDraft,
} from "@/modules/orders/presentation/admin/shipping/createLabelFormTypes";

type RatesRequestParams = {
  orderId: string | null;
  parcel: ParcelDraft;
  recipient: ShippingAddressDraft;
};

type RatesResponse = {
  rates: EasyPostRate[];
  shipmentId: string | null;
};

export async function fetchLabelRatesRequest({
  orderId,
  parcel,
  recipient,
}: RatesRequestParams): Promise<RatesResponse> {
  const response = await fetch("/api/admin/shipping/rates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId,
      weight: parcel.weight,
      length: parcel.length,
      width: parcel.width,
      height: parcel.height,
      recipient: {
        name: recipient.name || null,
        phone: recipient.phone || null,
        line1: recipient.line1,
        line2: recipient.line2 || null,
        city: recipient.city,
        state: recipient.state,
        postal_code: recipient.postal_code,
        country: recipient.country,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Failed to fetch rates.");
  }

  return {
    shipmentId: data?.shipment?.id ?? null,
    rates: (data?.shipment?.rates ?? []) as EasyPostRate[],
  };
}

export async function purchaseShippingLabelRequest({
  orderId,
  shipmentId,
  selectedRateId,
}: {
  orderId: string | null;
  shipmentId: string;
  selectedRateId: string;
}) {
  const response = await fetch("/api/admin/shipping/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, shipmentId, rateId: selectedRateId }),
  });

  const data = await response.json();

  return {
    data,
    ok: response.ok,
    status: response.status,
  };
}
