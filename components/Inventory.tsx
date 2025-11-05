import React, { useState } from 'react';
import { Item, ItemSlot, CharacterData, ItemRarity } from '../game/types';
import ItemTooltip from './ItemTooltip';
import { ItemIcon, SwordIcon, VestIcon, BootsIcon, RingIcon } from './icons';

interface InventoryProps {
  characterData: CharacterData;
  onItemEquip: (itemIndex: number) => void;
  onItemUnequip: (itemSlot: ItemSlot) => void;
  toggleInventory: () => void;
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

const EmptySlotIcon: React.FC<{ slot: ItemSlot }> = ({ slot }) => {
    const className = "w-8 h-8 text-gray-700";
    switch (slot) {
        case ItemSlot.Weapon: return <SwordIcon className={className} />;
        case ItemSlot.Armor: return <VestIcon className={className} />;
        case ItemSlot.Boots: return <BootsIcon className={className} />;
        case ItemSlot.Accessory: return <RingIcon className={className} />;
        default: return null;
    }
};

const ItemSlotComponent: React.FC<{ 
    item: Item | null; 
    onClick: () => void;
    slotType?: ItemSlot;
}> = ({ item, onClick, slotType }) => {
    const [isHovered, setHovered] = useState(false);
    const rarityClasses = item ? getRarityClasses(item.rarity) : getRarityClasses(ItemRarity.Common);
    
    return (
        <div 
            className={`w-16 h-16 border-2 rounded-md relative group flex items-center justify-center cursor-pointer transition-all duration-200 ${rarityClasses.bg} ${rarityClasses.border} ${rarityClasses.hoverBorder} ${rarityClasses.hoverBg} ${item ? `shadow-lg ${rarityClasses.shadow}` : ''}`}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {item ? (
                <>
                    {/* FIX: Use dynamic ItemIcon component instead of text placeholder */}
                    <ItemIcon item={item} className="w-10 h-10 text-gray-300" />
                    {isHovered && <ItemTooltip item={item} />}
                </>
            ) : (
                 // FIX: Show placeholder icon for empty equipment slots
                 slotType && <EmptySlotIcon slot={slotType} />
            )}
        </div>
    );
};


const Inventory: React.FC<InventoryProps> = ({ characterData, onItemEquip, onItemUnequip, toggleInventory }) => {
  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-auto" onClick={toggleInventory}>
        <div className="bg-gray-800/90 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-gray-700 text-center max-w-2xl w-full flex space-x-6" onClick={e => e.stopPropagation()}>
            {/* Equipment */}
            <div className="flex-shrink-0">
                <h2 className="text-2xl font-bold text-white mb-4">Equipment</h2>
                <div className="space-y-3">
                    {Object.values(ItemSlot).map(slot => (
                        <ItemSlotComponent 
                            key={slot}
                            item={characterData.equipment[slot]}
                            // FIX: Changed from onRightClick to onClick for better UX
                            onClick={() => onItemUnequip(slot)}
                            slotType={slot}
                        />
                    ))}
                </div>
            </div>

            {/* Inventory */}
            <div className="flex-grow">
                <h2 className="text-2xl font-bold text-white mb-4">Inventory ({characterData.inventory.filter(i => i).length}/20)</h2>
                <div className="grid grid-cols-5 gap-3">
                    {characterData.inventory.map((item, index) => (
                        <ItemSlotComponent 
                            key={index}
                            item={item}
                            onClick={() => onItemEquip(index)}
                        />
                    ))}
                </div>
                 <div className="mt-4 text-gray-400 text-sm">Click to equip/unequip.</div>
            </div>
        </div>
    </div>
  );
};

export default Inventory;
