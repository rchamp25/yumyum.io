
import React, { useState } from 'react';
import { Item, CharacterData } from '../game/types';
import { MATERIALS_DB } from '../game/items';
import { ItemSlotComponent } from './Inventory';

interface MaterialVendorUIProps {
    characterData: CharacterData;
    onBuy: (item: Item, cost: number) => void;
    onClose: () => void;
}

const MaterialVendorUI: React.FC<MaterialVendorUIProps> = ({ characterData, onBuy, onClose }) => {
    const materials = Object.values(MATERIALS_DB);
    const [multiplier, setMultiplier] = useState<number>(1);

    const getBuyPrice = (item: Item) => {
        // Cost is twice the sell price, multiplied by quantity
        return (item.sellPrice * 2) * multiplier;
    };

    const cycleMultiplier = () => {
        if (multiplier === 1) setMultiplier(5);
        else if (multiplier === 5) setMultiplier(10);
        else if (multiplier === 10) setMultiplier(100);
        else if (multiplier === 100) setMultiplier(1000);
        else setMultiplier(1);
    };

    return (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-auto" onClick={onClose}>
            <div className="bg-gray-800/90 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-gray-700 text-center max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-emerald-400">Jackson the Seller</h2>
                     <button onClick={onClose} className="text-2xl text-gray-400 hover:text-white">&times;</button>
                </div>
                <p className="text-gray-400 mb-4">"Need supplies for your craft? I've got what you need... for a price."</p>
                
                <div className="flex justify-between items-center mb-4 px-4">
                     <div className="bg-black/40 px-4 py-2 rounded-lg flex items-center space-x-2">
                        <span className="text-gray-300">Your Gold:</span>
                        <span className="text-yellow-400 font-bold text-xl">{characterData.gold.toLocaleString()}</span>
                     </div>
                     
                     <button 
                        onClick={cycleMultiplier}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg border border-blue-400 transition-colors min-w-[80px]"
                     >
                        {multiplier}x
                     </button>
                </div>

                <div className="bg-gray-900/50 p-4 rounded-lg max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-1 gap-3">
                        {materials.map((item) => {
                            const cost = getBuyPrice(item);
                            const canAfford = characterData.gold >= cost;
                            const inventoryFull = !characterData.inventory.some(s => s === null);

                            return (
                                <div key={item.id} className="bg-gray-800 p-3 rounded-lg flex justify-between items-center border border-gray-700 hover:bg-gray-700/50 transition-colors">
                                    <div className="flex items-center space-x-4">
                                        <ItemSlotComponent item={{...item, quantity: multiplier}} />
                                        <div className="text-left">
                                            <div className="font-bold text-white">{item.name}</div>
                                            <div className="text-xs text-gray-400">{item.description || 'Crafting Material'}</div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => onBuy({...item, quantity: multiplier}, cost)}
                                        disabled={!canAfford || inventoryFull}
                                        className={`px-4 py-2 rounded-lg font-bold min-w-[100px] flex flex-col items-center justify-center
                                            ${canAfford && !inventoryFull
                                                ? 'bg-emerald-600 text-white hover:bg-emerald-500' 
                                                : 'bg-gray-700 text-gray-400 cursor-not-allowed'}
                                        `}
                                    >
                                        <span>Buy</span>
                                        <span className="text-xs text-yellow-300">{cost.toLocaleString()} G</span>
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaterialVendorUI;
