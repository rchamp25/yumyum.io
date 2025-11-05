import React from 'react';
import { Item, ItemRarity } from '../game/types';

interface ItemTooltipProps {
  item: Item;
}

const rarityColors = {
  [ItemRarity.Common]: 'text-gray-300',
  [ItemRarity.Uncommon]: 'text-green-400',
  [ItemRarity.Rare]: 'text-blue-400',
  [ItemRarity.Epic]: 'text-purple-400',
  [ItemRarity.Legendary]: 'text-orange-400',
};

const ItemTooltip: React.FC<ItemTooltipProps> = ({ item }) => {
  return (
    <div className="absolute bottom-full mb-2 w-64 bg-gray-900 border border-gray-700 text-white text-sm rounded-lg p-3 text-left opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
      <p className={`font-bold text-lg ${rarityColors[item.rarity]}`}>{item.name}</p>
      <p className="text-gray-500 capitalize mb-2">{ItemRarity[item.rarity]} {item.slot}</p>
      
      <div className="border-t border-gray-700 my-2"></div>

      <div className="space-y-1 text-green-400">
        {Object.entries(item.stats).map(([stat, value]) => (
          <p key={stat}>
            +{value} {stat.replace(/([A-Z])/g, ' $1').trim()}
          </p>
        ))}
      </div>

      {item.description && (
        <>
            <div className="border-t border-gray-700 my-2"></div>
            <p className="text-gray-400 italic">"{item.description}"</p>
        </>
      )}
    </div>
  );
};

export default ItemTooltip;
