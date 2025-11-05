import React from 'react';
import { Item, ItemRarity, StatBonus } from '../game/types';

interface ItemTooltipProps {
  item: Item;
  position: { x: number; y: number };
}

const rarityTextColors: Record<ItemRarity, string> = {
  [ItemRarity.Common]: 'text-white',
  [ItemRarity.Uncommon]: 'text-green-400',
  [ItemRarity.Rare]: 'text-blue-400',
  [ItemRarity.Epic]: 'text-purple-400',
  [ItemRarity.Legendary]: 'text-orange-400',
};

const rarityBorderColors: Record<ItemRarity, string> = {
  [ItemRarity.Common]: 'border-gray-600',
  [ItemRarity.Uncommon]: 'border-green-500',
  [ItemRarity.Rare]: 'border-blue-500',
  [ItemRarity.Epic]: 'border-purple-500',
  [ItemRarity.Legendary]: 'border-orange-500',
};


const formatBonus = (key: keyof StatBonus, value: number): string => {
    switch (key) {
        case 'maxHealth': return `+${value} Max Health`;
        case 'damage': return `+${value} Damage`;
        case 'speed': return `+${value.toFixed(1)} Movement Speed`;
        case 'armor': return `+${value} Armor`;
        case 'critChance': return `+${(value * 100).toFixed(0)}% Crit Chance`;
        case 'critDamage': return `+${(value * 100).toFixed(0)}% Crit Damage`;
        default: return '';
    }
}

const ItemTooltip: React.FC<ItemTooltipProps> = ({ item, position }) => {
  if (!item) return null;
  
  const borderColor = rarityBorderColors[item.rarity];
  const textColor = rarityTextColors[item.rarity];

  return (
    <div
      className={`absolute bg-gray-900 border-2 ${borderColor} rounded-lg p-3 w-64 text-sm pointer-events-none z-50 shadow-lg`}
      style={{ left: position.x + 15, top: position.y + 15 }}
    >
      <h3 className={`font-bold text-lg mb-2 ${textColor}`}>{item.name}</h3>
      <div className="space-y-1 mb-3">
        {Object.entries(item.bonuses).map(([key, value]) => (
          <p key={key} className="text-teal-300">{formatBonus(key as keyof StatBonus, value as number)}</p>
        ))}
      </div>
      <p className="text-gray-400 italic mb-3">"{item.description}"</p>
      <div className="flex justify-between text-gray-500">
          <span>{item.slot}</span>
          <span>Req. Level {item.levelRequirement}</span>
      </div>
    </div>
  );
};

export default ItemTooltip;