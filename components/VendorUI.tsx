import React from 'react';
import { Item, CharacterData } from '../game/types';
import { ItemSlotComponent } from './Inventory';

interface VendorUIProps {
    characterData: CharacterData;
    onSell: (item: Item, inventoryIndex: number) => void;
    onClose: () => void;
}

const VendorUI: React.FC<VendorUIProps> = ({ characterData, onSell, onClose }) => {
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
                           const handleRightClick = (e: React.MouseEvent) => {
                                if (e.shiftKey && item) {
                                    e.preventDefault();
                                    onSell(item, index);
                                }
                            };

                           return (
                               <ItemSlotComponent 
                                    key={index}
                                    item={item} 
                                    onClick={item ? () => onSell(item, index) : undefined}
                                    onContextMenu={handleRightClick}
                                    footer={
                                        item ?
                                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-bold text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                            Sell for {item.sellPrice || 0} G
                                        </div>
                                        : null
                                    }
                                />
                           )
                        })}
                    </div>
                    <p className="text-gray-500 text-sm mt-4">Hint: Click to sell. Hold [Shift] and right-click to sell items quickly.</p>
                </div>
            </div>
        </div>
    );
};

export default VendorUI;
