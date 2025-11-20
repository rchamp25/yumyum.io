
import React, { useLayoutEffect, useRef, useState } from 'react';
import { Item, ItemRarity } from '../game/types';

interface ItemTooltipProps {
  item: Item;
  parentRect: DOMRect;
}

const rarityColors = {
  [ItemRarity.Common]: 'text-gray-300',
  [ItemRarity.Uncommon]: 'text-green-400',
  [ItemRarity.Rare]: 'text-blue-400',
  [ItemRarity.Epic]: 'text-purple-400',
  [ItemRarity.Legendary]: 'text-orange-400',
  [ItemRarity.Mythic]: 'text-rose-500',
};

const formatStatName = (key: string) => {
    if (key === 'maxInventorySlots') return 'Extra Slots';
    if (key === 'itemFind') return 'Item Find';
    if (key === 'bossDamageMultiplier') return 'Boss Damage';
    // Insert space before capital letters
    const withSpaces = key.replace(/([A-Z])/g, ' $1').trim();
    // Capitalize first letter
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

const formatStatValue = (key: string, value: number) => {
    if (key === 'itemFind') {
        return `+${Math.round(value * 100)}%`;
    }
    if (key === 'bossDamageMultiplier') {
        return `+${Math.round(value * 100)}%`;
    }
    return `+${value}`;
}

const ItemTooltip: React.FC<ItemTooltipProps> = ({ item, parentRect }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    opacity: 0,
    pointerEvents: 'none',
    zIndex: 9999,
    transition: 'opacity 0.15s ease-in-out',
  });

  useLayoutEffect(() => {
    if (tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const margin = 10;

      // Default: Position above the item, centered horizontally
      let top = parentRect.top - tooltipRect.height - margin;
      let left = parentRect.left + parentRect.width / 2 - tooltipRect.width / 2;

      // If too close to top edge, flip to bottom
      if (top < margin) {
        top = parentRect.bottom + margin;
      }
      
      // Clamp horizontal position
      if (left < margin) {
        left = margin;
      } else if (left + tooltipRect.width > window.innerWidth - margin) {
        left = window.innerWidth - tooltipRect.width - margin;
      }

      setStyle(prev => ({
        ...prev,
        top: `${top}px`,
        left: `${left}px`,
        opacity: 1,
      }));
    }
  }, [item, parentRect]);


  return (
    <div 
        ref={tooltipRef} 
        style={style} 
        className="min-w-[200px] max-w-[280px] bg-gray-900/95 border border-gray-600 text-white text-sm rounded-lg p-3 text-left shadow-2xl backdrop-blur-sm z-[9999]"
    >
      {/* Header */}
      <div className="mb-2">
          <p className={`font-bold text-base ${rarityColors[item.rarity]}`}>{item.name}</p>
          <p className="text-gray-400 text-xs capitalize">
            {ItemRarity[item.rarity]} {item.type === 'Material' ? 'Material' : item.slot}
            {item.quantity && item.quantity > 1 && ` (Stack: ${item.quantity})`}
          </p>
      </div>
      
      <div className="h-px bg-gray-700 my-2"></div>

      {/* Stats */}
      <div className="space-y-1">
        {item.stats && Object.entries(item.stats).map(([stat, value]) => (
          value !== undefined && value !== 0 && (
            <div key={stat} className="flex justify-between items-center text-green-400 text-xs font-semibold">
                <span>{formatStatName(stat)}</span>
                <span>{formatStatValue(stat, value)}</span>
            </div>
          )
        ))}
        {(!item.stats || Object.keys(item.stats).length === 0) && item.type !== 'Material' && (
            <p className="text-gray-500 text-xs italic">No Stats</p>
        )}
      </div>

      {/* Description */}
      {item.description && (
        <>
            <div className="h-px bg-gray-700 my-2"></div>
            <p className="text-gray-400 italic text-xs leading-relaxed">"{item.description}"</p>
        </>
      )}

      {/* Sell Price */}
      {item.sellPrice && (
        <>
          <div className="h-px bg-gray-700 my-2"></div>
          <div className="flex justify-between text-xs">
             <span className="text-gray-400">Value:</span>
             <span className="text-yellow-400 font-bold">{item.sellPrice * (item.quantity || 1)} G</span>
          </div>
        </>
      )}
    </div>
  );
};

export default ItemTooltip;
