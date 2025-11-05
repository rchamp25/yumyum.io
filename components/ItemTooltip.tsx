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
};

const ItemTooltip: React.FC<ItemTooltipProps> = ({ item, parentRect }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    opacity: 0,
    pointerEvents: 'none',
    zIndex: 9999,
    transition: 'opacity 0.1s ease-in-out',
  });

  useLayoutEffect(() => {
    if (tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const margin = 10;

      let top = parentRect.top - tooltipRect.height - margin;
      let left = parentRect.left + parentRect.width / 2 - tooltipRect.width / 2;

      // Adjust if offscreen top
      if (top < margin) {
        top = parentRect.bottom + margin;
      }
      
      // Adjust if offscreen left/right
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
    <div ref={tooltipRef} style={style} className="w-64 bg-gray-900 border border-gray-700 text-white text-sm rounded-lg p-3 text-left shadow-2xl">
      <p className={`font-bold text-lg ${rarityColors[item.rarity]}`}>{item.name}</p>
      <p className="text-gray-500 capitalize mb-2">
        {ItemRarity[item.rarity]} {item.type === 'Material' ? 'Material' : item.slot}
        {item.quantity && item.quantity > 1 && ` (x${item.quantity})`}
      </p>
      
      <div className="border-t border-gray-700 my-2"></div>

      <div className="space-y-1 text-green-400">
        {item.stats && Object.entries(item.stats).map(([stat, value]) => (
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

      {item.sellPrice && (
        <>
          <div className="border-t border-gray-700 my-2"></div>
          <p className="text-yellow-400">Sell Price: {item.sellPrice * (item.quantity || 1)} G</p>
        </>
      )}
    </div>
  );
};

export default ItemTooltip;