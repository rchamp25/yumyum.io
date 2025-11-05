import React, { useState } from 'react';
import { Item, CharacterData, ItemRarity, ItemSlot } from '../game/types';
import { ItemIcon } from './icons';
import ItemTooltip from './ItemTooltip';

interface VendorUIProps {
    characterData: CharacterData;
    onSell: (item: Item, inventoryIndex: number) => void;
    onClose: () => void;
}

const getRarityClasses = (rarity: ItemRarity) => {
    switch (rarity) {
        case ItemRarity.Uncommon: return { border: 'border-green-600', bg: 'bg-green-900/50', hoverBorder: 'hover:border-green-500', hoverBg: 'hover:bg-green-800/50', shadow: 'shadow-green-500/30' };
        case ItemRarity.Rare: return { border: 'border-blue-600', bg: 'bg-blue-900/50', hoverBorder: 'hover:border-blue-500', hoverBg: 'hover:bg-blue-800/50', shadow: 'shadow-blue-500/30' };
        case ItemRarity.Epic: return { border: 'border-purple-600', bg: 'bg-purple-900/50', hoverBorder: 'hover:border-purple-500', hoverBg: 'hover:bg-purple-800/50', shadow: 'shadow-purple-500/30' };
        case ItemRarity.Legendary: return { border: 'border-orange-600', bg: 'bg-orange-900/50', hoverBorder: 'hover:border-orange-500', hoverBg: 'hover:bg-orange-800/50', shadow: 'shadow-orange-500/30' };
        default: return { border: 'border-gray-600', bg: 'bg-gray-900/50', hoverBorder: 'hover:border-gray-500', hoverBg: 'hover:bg-gray-800/50', shadow: '' };
    }
};


const VendorItemSlot: React.FC<{
    item: Item | null;
    index: number;
    onSell: (item: Item, index: number) => void;
}> = ({ item, index, onSell }) => {
    const [isHovered, setHovered] = useState(false);
    
    if (!item) {
        return <div className="w-16 h-16 bg-gray-900/50 border-2 border-gray-700 rounded-md" />;
    }
    
    const rarityClasses = getRarityClasses(item.rarity);
    const price = (item.sellPrice || 0);

    const handleRightClick = (e: React.MouseEvent) => {
        if (e.shiftKey && item) {
            e.preventDefault();
            onSell(item, index);
        }
    };

    return (
        <div 
            className={`w-16 h-16 border-2 rounded-md relative group flex items-center justify-center cursor-pointer transition-all duration-200 ${rarityClasses.bg} ${rarityClasses.border} ${rarityClasses.hoverBorder} ${rarityClasses.hoverBg} ${item ? `shadow-lg ${rarityClasses.shadow}` : ''}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => onSell(item, index)}
            onContextMenu={handleRightClick}
        >
            <ItemIcon item={item} className="w-10 h-10 text-gray-300" />
            {item.quantity && item.quantity > 1 && (
                <div className="absolute top-0 right-0 bg-gray-900/80 text-white text-xs font-bold px-1.5 py-0.5 rounded-bl-md rounded-tr-md">
                    {item.quantity}
                </div>
            )}
            {isHovered && (
                <>
                    <ItemTooltip item={item} />
                    <div 
                        className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-bold text-xs py-1 px-2 rounded-md whitespace-nowrap"
                    >
                        Sell for {price} G
                    </div>
                </>
            )}
        </div>
    );
};

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
                        {characterData.inventory.map((item, index) => (
                           <VendorItemSlot key={index} item={item} index={index} onSell={onSell} />
                        ))}
                    </div>
                    <p className="text-gray-500 text-sm mt-4">Hint: Hold [Shift] and right-click to sell items quickly.</p>
                </div>
            </div>
        </div>
    );
};

export default VendorUI;