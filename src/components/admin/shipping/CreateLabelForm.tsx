// src/components/admin/shipping/CreateLabelForm.tsx
'use client';

import { useState } from 'react';

export function CreateLabelForm({ order }: { order: any }) {
    
    // TODO: Pre-fill with defaults from the order items/categories
    const [weight, setWeight] = useState(16);
    const [length, setLength] = useState(12);
    const [width, setWidth] = useState(12);
    const [height, setHeight] = useState(12);

    const [rates, setRates] = useState<any[]>([]);
    const [isFetchingRates, setIsFetchingRates] = useState(false);
    const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
    const [isCreatingLabel, setIsCreatingLabel] = useState(false);
    const [error, setError] = useState('');

    const handleGetRates = async () => {
        // TODO: Implement API call to /api/admin/shipping/rates
        setIsFetchingRates(true);
        setError('');
        console.log('Fetching rates for order:', order.id);
        // Mock response
        await new Promise(res => setTimeout(res, 1000));
        setRates([
            { id: '1', service: 'UPS® Ground', cost: 12.50 },
            { id: '2', service: 'UPS 2nd Day Air®', cost: 25.00 },
        ]);
        setIsFetchingRates(false);
    };

    const handleCreateLabel = async () => {
        // TODO: Implement API call to /api/admin/shipping/labels
        setIsCreatingLabel(true);
        setError('');
        console.log('Creating label for order:', order.id, 'with rate:', selectedRateId);
        await new Promise(res => setTimeout(res, 1000));
        alert('Label created! (Not really)');
        setIsCreatingLabel(false);
    };

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
                        <input type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70" />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Length (in)</label>
                        <input type="number" value={length} onChange={e => setLength(Number(e.target.value))} className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70" />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Width (in)</label>
                        <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70" />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Height (in)</label>
                        <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-800/70" />
                    </div>
                </div>
            </div>

            <div className="flex items-start gap-6">
                <button onClick={handleGetRates} disabled={isFetchingRates || rates.length > 0} className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white font-semibold px-6 py-2 rounded transition">
                    {isFetchingRates ? 'Fetching...' : 'Get Rates'}
                </button>

                {rates.length > 0 && (
                    <div className="flex-1 space-y-2">
                        {rates.map(rate => (
                             <label key={rate.id} className={`flex justify-between items-center p-3 rounded border cursor-pointer transition ${selectedRateId === rate.id ? 'bg-red-900/30 border-red-500' : 'bg-zinc-800/50 border-zinc-800/70 hover:bg-zinc-800'}`}>
                                <div className="flex items-center gap-3">
                                    <input type="radio" name="rate" value={rate.id} checked={selectedRateId === rate.id} onChange={() => setSelectedRateId(rate.id)} className="w-4 h-4" />
                                    <span className="text-white">{rate.service}</span>
                                </div>
                                <span className="font-bold text-white">${rate.cost.toFixed(2)}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {selectedRateId && (
                 <div className="border-t border-zinc-800/70 pt-6">
                     <button onClick={handleCreateLabel} disabled={isCreatingLabel} className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold px-8 py-3 rounded transition text-lg">
                        {isCreatingLabel ? 'Creating...' : 'Create Shipping Label'}
                     </button>
                 </div>
            )}

            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        </div>
    );
}
