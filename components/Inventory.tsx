import React, { useState } from 'react';
import { Item, ItemSlot } from '../game/types';
import ItemTooltip from './ItemTooltip';

interface InventoryProps {
  inventory: (Item | null)[];
  equipment: Record<ItemSlot, Item | null>;
  onEquip: (item: Item, inventoryIndex: number) => void;
  onUnequip: (slot: ItemSlot) => void;
  isOpen: boolean;
  onClose: () => void;
}

const rarityBorderColors: Record<string, string> = {
    Common: 'border-gray-700',
    Uncommon: 'border-green-500',
    Rare: 'border-blue-500',
    Epic: 'border-purple-500',
    Legendary: 'border-orange-500',
};

const rarityBgColors: Record<string, string> = {
    Common: 'bg-gray-900/80',
    Uncommon: 'bg-green-900/40',
    Rare: 'bg-blue-900/40',
    Epic: 'bg-purple-900/40',
    Legendary: 'bg-orange-900/40',
};

const rarityHoverBgColors: Record<string, string> = {
    Common: 'hover:bg-gray-700',
    Uncommon: 'hover:bg-green-800/60',
    Rare: 'hover:bg-blue-800/60',
    Epic: 'hover:bg-purple-800/60',
    Legendary: 'hover:bg-orange-800/60',
};


const ItemSlotComponent: React.FC<{
    item: Item | null;
    onClick: () => void;
    onMouseEnter: (item: Item, e: React.MouseEvent) => void;
    onMouseLeave: () => void;
    slotName?: string;
    isEquipment?: boolean;
}> = ({ item, onClick, onMouseEnter, onMouseLeave, slotName, isEquipment = false }) => {
    
    const borderColor = item ? rarityBorderColors[item.rarity] : 'border-gray-700';
    const bgColor = item ? rarityBgColors[item.rarity] : 'bg-gray-900/80';
    const hoverBgColor = item ? rarityHoverBgColors[item.rarity] : 'hover:bg-gray-700';

    return (
        <div
            onClick={onClick}
            onMouseEnter={(e) => item && onMouseEnter(item, e)}
            onMouseLeave={onMouseLeave}
            className={`w-16 h-16 border-2 ${borderColor} ${bgColor} ${hoverBgColor} rounded-md flex items-center justify-center relative cursor-pointer transition-colors`}
        >
            {item ? (
                // In a real game, this would be an image or icon
                <div className="text-white text-xs text-center p-1 overflow-hidden">{item.name}</div>
            ) : (
                <span className="text-gray-600 text-xs">{slotName}</span>
            )}
        </div>
    );
};

const Inventory: React.FC<InventoryProps> = ({ inventory, equipment, onEquip, onUnequip, isOpen, onClose }) => {
    const [tooltip, setTooltip] = useState<{ item: Item, pos: { x: number, y: number } } | null>(null);

    if (!isOpen) {
        return null;
    }

    const handleMouseEnter = (item: Item, e: React.MouseEvent) => {
        setTooltip({ item, pos: { x: e.clientX, y: e.clientY } });
    };

    const handleMouseLeave = () => {
        setTooltip(null);
    };

    const equipmentSlots: ItemSlot[] = [ItemSlot.Weapon, ItemSlot.Armor, ItemSlot.Boots, ItemSlot.Accessory];

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-10" onClick={onClose}></div>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800/90 backdrop-blur-sm p-6 rounded-lg shadow-2xl border border-gray-700 z-20 flex space-x-8 pointer-events-auto">
                {/* Equipment Section */}
                <div className="flex flex-col space-y-4 items-center">
                    <h2 className="text-xl font-bold text-white mb-2">Equipment</h2>
                    {equipmentSlots.map(slot => (
                        <ItemSlotComponent
                            key={slot}
                            item={equipment[slot]}
                            onClick={() => equipment[slot] && onUnequip(slot)}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            slotName={slot}
                            isEquipment={true}
                        />
                    ))}
                </div>
                {/* Inventory Section */}
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">Inventory</h2>
                    <div className="grid grid-cols-5 gap-2">
                        {inventory.map((item, index) => (
                            <ItemSlotComponent
                                key={index}
                                item={item}
                                onClick={() => item && onEquip(item, index)}
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                            />
                        ))}
                    </div>
                </div>
            </div>
            {tooltip && <ItemTooltip item={tooltip.item} position={tooltip.pos} />}
        </>
    );
};

export default Inventory;