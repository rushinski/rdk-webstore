// src/components/admin/shipping/CreateLabelForm.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

type ShippingAddressDraft = {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

type ParcelDraft = {
  weight: number; // oz
  length: number; // in
  width: number; // in
  height: number; // in
};

type EasyPostRate = {
  id: string;
  carrier?: string | null;
  service?: string | null;
  rate?: string | null;
  currency?: string | null;
  delivery_days?: number | null;
  estimated_delivery_days?: number | null;
};

type Props = {
  open: boolean;
  order: any | null;
  originLine?: string | null;
  initialPackage?: ParcelDraft | null;
  onClose: () => void;
  onSuccess: () => void;
};

const resolveShippingAddress = (value: unknown): any | null => {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value === 'object') return value as any;
  return null;
};

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const money = (rateStr?: string | null, currency?: string | null) => {
  const rate = Number(rateStr ?? '');
  if (Number.isFinite(rate)) {
    return `${currency?.toUpperCase() === 'USD' || !currency ? '$' : ''}${rate.toFixed(2)}`;
  }
  return rateStr ?? '-';
};

const formatDeliveryEstimate = (days?: number | null) => {
  if (!days || days <= 0) return null;
  
  const businessDays = Math.ceil(days);
  
  if (businessDays === 1) return "Next business day";
  if (businessDays === 2) return "2 business days";
  if (businessDays <= 5) return `${businessDays} business days`;
  
  // Convert to calendar days for longer estimates
  const calendarDays = Math.ceil(businessDays * 1.4); // Rough conversion
  return `${calendarDays} days`;
};

export function CreateLabelForm({ open, order, originLine, initialPackage, onClose, onSuccess }: Props) {
  const orderId = order?.id ?? null;

  const initialRecipient: ShippingAddressDraft = useMemo(() => {
    const shipping = resolveShippingAddress(order?.shipping);
    return {
      name: clean(shipping?.name) || '',
      phone: clean(shipping?.phone) || '',
      line1: clean(shipping?.line1) || '',
      line2: clean(shipping?.line2) || '',
      city: clean(shipping?.city) || '',
      state: clean(shipping?.state) || '',
      postal_code: clean(shipping?.postal_code) || '',
      country: clean(shipping?.country) || 'US',
    };
  }, [order]);

  const initialParcel: ParcelDraft = useMemo(() => {
    return (
      initialPackage ?? {
        weight: 16,
        length: 12,
        width: 12,
        height: 12,
      }
    );
  }, [initialPackage]);

  const [recipient, setRecipient] = useState<ShippingAddressDraft>(initialRecipient);
  const [parcel, setParcel] = useState<ParcelDraft>(initialParcel);

  // String versions for controlled inputs (prevents spinner issues)
  const [weightInput, setWeightInput] = useState<string>('16');
  const [lengthInput, setLengthInput] = useState<string>('12');
  const [widthInput, setWidthInput] = useState<string>('12');
  const [heightInput, setHeightInput] = useState<string>('12');

  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [rates, setRates] = useState<EasyPostRate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);

  const [isGettingRates, setIsGettingRates] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [labelUrl, setLabelUrl] = useState<string | null>(null);
  const [labelPdfUrl, setLabelPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRecipient(initialRecipient);
    setParcel(initialParcel);
    
    // Set input strings from initial values
    setWeightInput(String(initialParcel.weight));
    setLengthInput(String(initialParcel.length));
    setWidthInput(String(initialParcel.width));
    setHeightInput(String(initialParcel.height));
    
    setShipmentId(null);
    setRates([]);
    setSelectedRateId(null);
    setIsGettingRates(false);
    setIsPurchasing(false);
    setError('');
    setSuccess('');
    setLabelUrl(null);
    setLabelPdfUrl(null);
  }, [open, initialRecipient, initialParcel]);

  if (!open || !order || !orderId) return null;

  const setRecipientField = (field: keyof ShippingAddressDraft, value: string) => {
    setRecipient((prev) => ({ ...prev, [field]: value }));
  };

  const handleParcelInput = (field: 'weight' | 'length' | 'width' | 'height', value: string) => {
    // Allow only numbers and decimal point
    const cleaned = value.replace(/[^\d.]/g, '');
    
    // Update input string
    switch (field) {
      case 'weight':
        setWeightInput(cleaned);
        break;
      case 'length':
        setLengthInput(cleaned);
        break;
      case 'width':
        setWidthInput(cleaned);
        break;
      case 'height':
        setHeightInput(cleaned);
        break;
    }
    
    // Update parcel object with number
    const num = Number(cleaned);
    if (Number.isFinite(num) && num >= 0) {
      setParcel((prev) => ({ ...prev, [field]: num }));
    }
  };

  const validate = () => {
    if (!originLine) return 'Origin address is not set. Set it before creating labels.';
    if (!recipient.line1 || !recipient.city || !recipient.state || !recipient.postal_code || !recipient.country) {
      return 'Recipient address is incomplete.';
    }
    if (!Number.isFinite(parcel.weight) || parcel.weight <= 0) return 'Weight must be greater than 0.';
    if (!Number.isFinite(parcel.length) || parcel.length <= 0) return 'Length must be greater than 0.';
    if (!Number.isFinite(parcel.width) || parcel.width <= 0) return 'Width must be greater than 0.';
    if (!Number.isFinite(parcel.height) || parcel.height <= 0) return 'Height must be greater than 0.';
    return null;
  };

  const getRates = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setError('');
    setSuccess('');
    setIsGettingRates(true);
    setRates([]);
    setSelectedRateId(null);
    setShipmentId(null);

    try {
      const res = await fetch('/api/admin/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to fetch rates.');
        return;
      }

      const nextShipmentId = data?.shipment?.id ?? null;
      const nextRates = (data?.shipment?.rates ?? []) as EasyPostRate[];

      if (!nextShipmentId) {
        setError('Rates response missing shipment id.');
        return;
      }
      if (nextRates.length === 0) {
        setError('No rates available for the enabled carriers. Check carrier settings.');
        return;
      }

      setShipmentId(nextShipmentId);
      setRates(nextRates);

      // Default to cheapest
      const cheapest = [...nextRates].sort((a, b) => Number(a.rate ?? 999999) - Number(b.rate ?? 999999))[0];
      setSelectedRateId(cheapest?.id ?? nextRates[0]?.id ?? null);
    } catch {
      setError('An unexpected error occurred while fetching rates.');
    } finally {
      setIsGettingRates(false);
    }
  };

  const purchase = async () => {
    if (!shipmentId || !selectedRateId) {
      setError('Pick a rate before purchasing.');
      return;
    }

    setError('');
    setSuccess('');
    setIsPurchasing(true);

    try {
      const res = await fetch('/api/admin/shipping/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, shipmentId, rateId: selectedRateId }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError(data?.error || 'Label already purchased for this order.');
        return;
      }

      if (!res.ok) {
        setError(data?.error || 'Failed to purchase label.');
        return;
      }

      const pdf = data?.label?.label_pdf_url ?? data?.label?.pdf_url ?? null;
      const png = data?.label?.label_url ?? null;

      setLabelPdfUrl(pdf);
      setLabelUrl(png);
      setSuccess('Label purchased. You can print it now.');
    } catch {
      setError('An unexpected error occurred while purchasing the label.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const print = () => {
    const url = labelPdfUrl ?? labelUrl;
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={onClose}>
      <div
        className="w-full max-w-6xl rounded-lg border border-zinc-800/70 bg-zinc-950"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800/70 p-5">
          <div>
            <div className="text-white text-lg font-semibold">Create shipping label</div>
            <div className="text-xs text-zinc-500 mt-1">Order #{String(orderId).slice(0, 8)}</div>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* LEFT: details */}
          <div className="p-5 space-y-6 border-b lg:border-b-0 lg:border-r border-zinc-800/70">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Shipping from</div>
              <div className="text-sm text-zinc-200">{originLine ?? 'Not set'}</div>
              {!originLine && <div className="text-xs text-red-400 mt-1">Set origin in Shipping Settings.</div>}
            </div>

            <div className="space-y-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Shipping to</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={recipient.name}
                    onChange={(e) => setRecipientField('name', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Phone</label>
                  <input
                    type="text"
                    value={recipient.phone}
                    onChange={(e) => setRecipientField('phone', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1">Address line 1</label>
                  <input
                    type="text"
                    value={recipient.line1}
                    onChange={(e) => setRecipientField('line1', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1">Address line 2</label>
                  <input
                    type="text"
                    value={recipient.line2}
                    onChange={(e) => setRecipientField('line2', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">City</label>
                  <input
                    type="text"
                    value={recipient.city}
                    onChange={(e) => setRecipientField('city', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">State</label>
                  <input
                    type="text"
                    value={recipient.state}
                    onChange={(e) => setRecipientField('state', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">ZIP</label>
                  <input
                    type="text"
                    value={recipient.postal_code}
                    onChange={(e) => setRecipientField('postal_code', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Country</label>
                  <input
                    type="text"
                    value={recipient.country}
                    onChange={(e) => setRecipientField('country', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Package</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Weight (oz)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={weightInput}
                    onChange={(e) => handleParcelInput('weight', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Length (in)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={lengthInput}
                    onChange={(e) => handleParcelInput('length', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Width (in)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={widthInput}
                    onChange={(e) => handleParcelInput('width', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Height (in)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={heightInput}
                    onChange={(e) => handleParcelInput('height', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={getRates}
                disabled={isGettingRates}
                className="w-full md:w-auto px-4 py-2 bg-zinc-100 text-black text-sm font-semibold rounded hover:bg-white disabled:opacity-60"
              >
                {isGettingRates ? 'Getting rates...' : 'Get rates'}
              </button>

              {error && <div className="text-sm text-red-400">{error}</div>}
              {success && <div className="text-sm text-green-400">{success}</div>}
            </div>
          </div>

          {/* RIGHT: rates + purchase */}
          <div className="p-5 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">Rates</div>
              <div className="text-sm text-zinc-400 mt-1">
                Choose a carrier/service, then purchase the label.
              </div>
            </div>

            {rates.length === 0 ? (
              <div className="rounded border border-zinc-800/70 bg-zinc-900 p-4 text-sm text-zinc-500">
                No rates yet. Fill details and click <span className="text-zinc-200">Get rates</span>.
              </div>
            ) : (
              <div className="space-y-2">
                {rates.map((r) => {
                  const selected = selectedRateId === r.id;
                  const days = r.estimated_delivery_days ?? r.delivery_days ?? null;
                  const deliveryText = formatDeliveryEstimate(days);
                  
                  return (
                    <label
                      key={r.id}
                      className={`flex items-start gap-3 p-3 rounded border cursor-pointer ${
                        selected ? 'border-red-600 bg-zinc-900/60' : 'border-zinc-800/70 bg-zinc-900'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rate"
                        checked={selected}
                        onChange={() => setSelectedRateId(r.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-white font-semibold">
                            {String(r.carrier ?? 'Carrier')} — {String(r.service ?? 'Service')}
                          </div>
                          <div className="text-sm text-white">{money(r.rate, r.currency)}</div>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {deliveryText ? `Estimated delivery: ${deliveryText}` : 'Delivery estimate unavailable'}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={purchase}
                disabled={isPurchasing || rates.length === 0 || !shipmentId || !selectedRateId}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded disabled:bg-zinc-700"
              >
                {isPurchasing ? 'Purchasing...' : 'Purchase label'}
              </button>

              <button
                type="button"
                onClick={print}
                disabled={!labelPdfUrl && !labelUrl}
                className="w-full px-4 py-2 border border-zinc-800/70 text-sm text-zinc-200 hover:border-zinc-700 disabled:opacity-50"
              >
                Print label
              </button>

              <div className="text-xs text-zinc-500">
                Rates are limited to the carriers enabled in Shipping Settings.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}