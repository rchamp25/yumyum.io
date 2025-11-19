import React from 'react';
import { Item, CharacterData } from '../game/types';
import { ItemSlotComponent } from './Inventory';

interface VendorUIProps {
    characterData: CharacterData;
    onSell: (item: Item, inventoryIndex: number, sellFullStack: boolean) => void;
    onClose: () => void;
}

const VendorUI: React.FC<VendorUIProps> = ({ characterData, onSell, onClose }) => {
    
    const handleSell = (item: Item, index: number) => {
        onSell(item, index, false);
    };

    const handleRightClick = (e: React.MouseEvent, item: Item, index: number) => {
        if (item && e.shiftKey) {
            e.preventDefault();
            onSell(item, index, true);
        }
    };

    return (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-auto" onClick={onClose}>
            <div className="bg-gray-800/90 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-gray-700 text-center max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-yellow-400">Trevor the Merchant</h2>
                     <button onClick={onClose} className="text-2xl text-gray-400 hover:text-white">&times;</button>
                </div>
                <p className="text-gray-400 mb-4">"Got some gear you don't need? I'll take it off your hands for a fair price."</p>
                <div className="bg-gray-900/50 p-4 rounded-lg">
                    <h3 className="text-xl font-semibold text-white mb-3">Your Inventory</h3>
                    <div className="grid grid-cols-5 gap-3">
                        {characterData.inventory.map((item, index) => {
                           return (
                               <ItemSlotComponent 
                                    key={index}
                                    item={item} 
                                    onClick={item ? () => handleSell(item, index) : undefined}
                                    onContextMenu={item ? (e) => handleRightClick(e, item, index) : undefined}
                                    hoverContent={
                                        item ? (
                                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center pointer-events-none rounded-md">
                                                <p className="text-yellow-400 font-bold text-xs leading-tight">
                                                    Click to Sell
                                                </p>
                                                <p className="text-yellow-400 font-bold text-sm leading-tight">
                                                    {(item.sellPrice || 0) * (item.quantity || 1)} G
                                                </p>
                                            </div>
                                        ) : null
                                    }
                                />
                           )
                        })}
                    </div>
                    <p className="text-gray-500 text-sm mt-4">Hint: Click to sell one. Hold [Shift] and right-click to sell a stack.</p>
                </div>
            </div>
        </div>
    );
};

export default VendorUI;