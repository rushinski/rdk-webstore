// src/components/admin/shipping/CreateLabelForm.tsx
'use client';

import { useState, useEffect } from 'react';

export function CreateLabelForm({ order, onSuccess }: { order: any, onSuccess: () => void }) {
    
    const [weight, setWeight] = useState(16);
    const [length, setLength] = useState(12);
    const [width, setWidth] = useState(12);
    const [height, setHeight] = useState(12);

    const [shipment, setShipment] = useState<any | null>(null);
    const [isPreparing, setIsPreparing] = useState(false);
    const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
    const [isCreatingLabel, setIsCreatingLabel] = useState(false);
    const [error, setError] = useState('');
    const [completedShipment, setCompletedShipment] = useState<any | null>(null);

    useEffect(() => {
        // TODO: Pre-fill with defaults from the order items/categories
        // This would involve fetching shipping_defaults for the categories in the order.
        // For now, we use hardcoded values.
    }, [order]);

    const handlePrepareShipment = async () => {
        setIsPreparing(true);
        setError('');
        try {
            const response = await fetch('/api/admin/shipping/rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    weight,
                    length,
                    width,
                    height,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to prepare shipment.');
            }
            setShipment(data.shipment);
            if (data.shipment?.rates?.length > 0) {
                // Default to the cheapest rate
                setSelectedRateId(data.shipment.rates[0].id);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsPreparing(false);
        }
    };

    const handleCreateLabel = async () => {
        if (!shipment || !selectedRateId) {
            setError('Shipment and rate must be selected.');
            return;
        }
        setIsCreatingLabel(true);
        setError('');
        try {
            const response = await fetch('/api/admin/shipping/labels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    shipmentId: shipment.id,
                    rateId: selectedRateId,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create label.');
            }
            setCompletedShipment(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsCreatingLabel(false);
        }
    };

    if (completedShipment) {
        return (
            <div className="space-y-4 text-center p-4">
                <h3 className="text-xl font-bold text-white">Label Created!</h3>
                <p className="text-gray-300">
                    <a href={completedShipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">
                        Track Package: {completedShipment.trackingCode}
                    </a>
                </p>
                <div className="flex justify-center gap-4">
                     <a href={completedShipment.label.label_url} target="_blank" rel="noopener noreferrer" className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded transition">
                        View Label
                     </a>
                    <button onClick={onSuccess} className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-6 py-2 rounded transition">
                        Close
                    </button>
                </div>
            </div>
        )
    }

    const selectedRate = shipment?.rates?.find((r: any) => r.id === selectedRateId);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-white">Order #{order.id.slice(0, 8)}</h3>
                <ul className="text-sm text-gray-400 list-disc list-inside">
                    {order.items?.map((item: any) => (
                        <li key={item.id}>
                            {item.quantity}x {item.product?.name} ({item.variant?.size_label})
                        </li>
                    ))}
                </ul>
            </div>

            <div className="border-t border-zinc-800/70 pt-6">
                <h4 className="font-medium text-white mb-4">Package Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Weight (oz)</label>
                        <input type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70" disabled={!!shipment}/>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Length (in)</label>
                        <input type="number" value={length} onChange={e => setLength(Number(e.target.value))} className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70" disabled={!!shipment}/>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Width (in)</label>
                        <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70" disabled={!!shipment}/>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Height (in)</label>
                        <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70" disabled={!!shipment}/>
                    </div>
                </div>
            </div>

            <div className="flex items-start gap-6">
                {!shipment && (
                    <button onClick={handlePrepareShipment} disabled={isPreparing} className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white font-semibold px-6 py-2 rounded transition">
                        {isPreparing ? 'Preparing...' : 'Prepare Shipment'}
                    </button>
                )}

                {shipment?.rates?.length > 0 && (
                    <div className="flex-1 space-y-2">
                        <h4 className="font-medium text-white mb-2">Select a Rate</h4>
                        {shipment.rates.map((rate: any) => (
                             <label key={rate.id} className={`flex justify-between items-center p-3 rounded border cursor-pointer transition ${selectedRateId === rate.id ? 'bg-red-900/30 border-red-500' : 'bg-zinc-800/50 border-zinc-800/70 hover:bg-zinc-800'}`}>
                                <div className="flex items-center gap-3">
                                    <input type="radio" name="rate" value={rate.id} checked={selectedRateId === rate.id} onChange={() => setSelectedRateId(rate.id)} className="w-4 h-4" />
                                    <span className="text-white">{rate.carrier} {rate.service}</span>
                                </div>
                                <span className="font-bold text-white">${rate.rate}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {selectedRateId && (
                 <div className="border-t border-zinc-800/70 pt-6">
                     <button onClick={handleCreateLabel} disabled={isCreatingLabel} className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold px-8 py-3 rounded transition text-lg">
                        {isCreatingLabel ? 'Creating Label...' : `Purchase Label for $${selectedRate?.rate}`}
                     </button>
                 </div>
            )}

            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        </div>
    );
}