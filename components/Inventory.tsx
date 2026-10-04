
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Item, ItemSlot, CharacterData, ItemRarity } from '../game/types';
import ItemTooltip from './ItemTooltip';
import { ItemIcon, SwordIcon, VestIcon, BootsIcon, RingIcon, BagIcon, SmallLockIcon } from './icons';

interface InventoryProps {
  characterData: CharacterData;
  onItemEquip: (itemIndex: number) => void;
  onItemUnequip: (itemSlot: ItemSlot) => void;
  toggleInventory: () => void;
  onInventoryMove: (fromIndex: number, toIndex: number) => void;
  onToggleLock?: (itemIndex: number) => void;
}

const getRarityClasses = (rarity: ItemRarity) => {
    switch (rarity) {
        case ItemRarity.Uncommon: return { border: 'border-green-600', bg: 'bg-green-900/50', hoverBorder: 'hover:border-green-500', hoverBg: 'hover:bg-green-800/50', shadow: 'shadow-green-500/30' };
        case ItemRarity.Rare: return { border: 'border-blue-600', bg: 'bg-blue-900/50', hoverBorder: 'hover:border-blue-500', hoverBg: 'hover:bg-blue-800/50', shadow: 'shadow-blue-500/30' };
        case ItemRarity.Epic: return { border: 'border-purple-600', bg: 'bg-purple-900/50', hoverBorder: 'hover:border-purple-500', hoverBg: 'hover:bg-purple-800/50', shadow: 'shadow-purple-500/30' };
        case ItemRarity.Legendary: return { border: 'border-orange-600', bg: 'bg-orange-900/50', hoverBorder: 'hover:border-orange-500', hoverBg: 'hover:bg-orange-800/50', shadow: 'shadow-orange-500/30' };
        case ItemRarity.Mythic: return { border: 'border-rose-600', bg: 'bg-rose-900/50', hoverBorder: 'hover:border-rose-500', hoverBg: 'hover:bg-rose-800/50', shadow: 'shadow-rose-500/50' };
        default: return { border: 'border-gray-600', bg: 'bg-gray-900/50', hoverBorder: 'hover:border-gray-500', hoverBg: 'hover:bg-gray-800/50', shadow: '' };
    }
};

const EmptySlotIcon: React.FC<{ slot: ItemSlot }> = ({ slot }) => {
    const className = "w-6 h-6 md:w-8 md:h-8 text-gray-700";
    switch (slot) {
        case ItemSlot.Weapon: return <SwordIcon className={className} />;
        case ItemSlot.Armor: return <VestIcon className={className} />;
        case ItemSlot.Boots: return <BootsIcon className={className} />;
        case ItemSlot.Accessory: return <RingIcon className={className} />;
        case ItemSlot.Bag: return <BagIcon className={className} />;
        default: return null;
    }
};

export const ItemSlotComponent: React.FC<{ 
    item: Item | null; 
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    onMouseDown?: (e: React.MouseEvent) => void;
    onMouseUp?: (e: React.MouseEvent) => void;
    slotType?: ItemSlot;
    hoverContent?: React.ReactNode;
    isDragging?: boolean;
}> = ({ item, onClick, onContextMenu, onMouseDown, onMouseUp, slotType, hoverContent, isDragging }) => {
    const [isHovered, setHovered] = useState(false);
    const slotRef = useRef<HTMLDivElement>(null);
    const [parentRect, setParentRect] = useState<DOMRect | null>(null);
    const rarityClasses = item ? getRarityClasses(item.rarity) : getRarityClasses(ItemRarity.Common);
    
    const tooltipContainer = typeof document !== 'undefined' ? document.getElementById('tooltip-root') : null;

    const handleMouseEnter = () => {
        if (slotRef.current) {
            setParentRect(slotRef.current.getBoundingClientRect());
            setHovered(true);
        }
    };

    const handleMouseLeave = () => {
        setHovered(false);
        setParentRect(null);
    };
    
    return (
        <div 
            ref={slotRef}
            className={`w-12 h-12 md:w-16 md:h-16 border-2 rounded-md relative flex items-center justify-center transition-all duration-200 
                ${rarityClasses.bg} ${rarityClasses.border} 
                ${onClick || onMouseDown ? `cursor-pointer ${rarityClasses.hoverBorder} ${rarityClasses.hoverBg}`: ''} 
                ${item ? `shadow-lg ${rarityClasses.shadow}` : ''}
                ${isDragging ? 'opacity-30' : ''}
            `}
            onClick={onClick}
            onContextMenu={onContextMenu}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={(e) => { if(onClick) { e.stopPropagation(); } }} // Allow basic touch
        >
            {item ? (
                <>
                    <ItemIcon item={item} className="w-8 h-8 md:w-10 md:h-10 text-gray-300" />
                    {item.quantity && item.quantity > 1 && (
                        <div className="absolute top-0 right-0 bg-gray-900/80 text-white text-[10px] font-bold px-1 py-0.5 rounded-bl-md rounded-tr-md pointer-events-none">
                            {item.quantity}
                        </div>
                    )}
                    {item.locked && (
                         <div className="absolute top-0 right-0 p-0.5">
                             <SmallLockIcon className="w-3 h-3 md:w-4 md:h-4 text-yellow-400 drop-shadow-md" />
                         </div>
                    )}
                </>
            ) : (
                 slotType && <EmptySlotIcon slot={slotType} />
            )}
            
            {isHovered && !isDragging && hoverContent}
            
            {isHovered && !isDragging && item && parentRect && tooltipContainer && 
                createPortal(
                    <ItemTooltip item={item} parentRect={parentRect} />,
                    tooltipContainer
                )
            }
        </div>
    );
};


const Inventory: React.FC<InventoryProps> = ({ characterData, onItemEquip, onItemUnequip, toggleInventory, onInventoryMove, onToggleLock }) => {
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [mousePos, setMousePos] = useState<{x: number, y: number}>({ x: 0, y: 0 });
    const [isLockMode, setLockMode] = useState(false);

    // Global drag events
    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (draggingIndex !== null) {
                setMousePos({ x: e.clientX, y: e.clientY });
            }
        };
        
        const handleGlobalMouseUp = () => {
            if (draggingIndex !== null) {
                setDraggingIndex(null);
            }
        };

        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [draggingIndex]);


    const handleSlotMouseDown = (e: React.MouseEvent, index: number) => {
        if (isLockMode) return; 
        if (characterData.inventory[index]) {
            e.preventDefault(); 
            setDraggingIndex(index);
            setMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleSlotMouseUp = (e: React.MouseEvent, targetIndex: number) => {
        if (isLockMode) return;
        if (draggingIndex !== null) {
            e.stopPropagation();
            onInventoryMove(draggingIndex, targetIndex);
            setDraggingIndex(null);
        }
    };

    const draggedItem = draggingIndex !== null ? characterData.inventory[draggingIndex] : null;
    const tooltipContainer = typeof document !== 'undefined' ? document.getElementById('tooltip-root') : null;

    return (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-auto z-60" onClick={toggleInventory}>
            <div 
                className="bg-gray-800/90 backdrop-blur-md p-4 md:p-6 rounded-xl shadow-2xl border border-gray-700 text-center w-[95%] md:max-w-2xl flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6 max-h-[90dvh] overflow-y-auto" 
                onClick={e => e.stopPropagation()}
            >
                {/* Equipment */}
                <div className="shrink-0 flex flex-row md:flex-col justify-center gap-2 md:gap-3 border-b md:border-b-0 md:border-r border-gray-600 pb-4 md:pb-0 md:pr-4">
                    <h2 className="hidden md:block text-2xl font-bold text-white mb-4">Gear</h2>
                    {Object.values(ItemSlot).map(slot => (
                        <ItemSlotComponent 
                            key={slot}
                            item={characterData.equipment[slot]}
                            onClick={() => !isLockMode && onItemUnequip(slot)}
                            slotType={slot}
                        />
                    ))}
                </div>

                {/* Inventory */}
                <div className="grow">
                    <div className="flex justify-between items-center mb-2 md:mb-4">
                        <h2 className="text-lg md:text-2xl font-bold text-white">Inventory</h2>
                        <button 
                            onClick={() => setLockMode(!isLockMode)}
                            className={`px-2 py-1 md:px-3 rounded-sm text-xs md:text-sm font-bold transition-colors flex items-center gap-1 md:gap-2 ${isLockMode ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        >
                            <SmallLockIcon className="w-3 h-3 md:w-4 md:h-4" />
                            {isLockMode ? 'Save' : 'Lock'}
                        </button>
                    </div>
                    <div className="grid grid-cols-5 gap-2 md:gap-3 overflow-y-auto pr-2 select-none h-[300px] md:h-[400px]">
                        {characterData.inventory.map((item, index) => (
                            <ItemSlotComponent 
                                key={index}
                                item={item}
                                onClick={() => {
                                    if (isLockMode && onToggleLock) {
                                        onToggleLock(index);
                                    } else if (draggingIndex === null) {
                                        onItemEquip(index);
                                    }
                                }}
                                onMouseDown={(e) => handleSlotMouseDown(e, index)}
                                onMouseUp={(e) => handleSlotMouseUp(e, index)}
                                isDragging={draggingIndex === index}
                            />
                        ))}
                    </div>
                    <div className="mt-2 text-gray-400 text-xs md:text-sm">
                        {isLockMode ? 'Tap to lock/unlock.' : 'Drag to move. Tap to equip.'}
                    </div>
                </div>
            </div>

            {/* Dragging Ghost Item */}
            {draggedItem && tooltipContainer && createPortal(
                <div 
                    className="fixed pointer-events-none z-10000"
                    style={{ 
                        left: mousePos.x - 32, 
                        top: mousePos.y - 32,
                        width: '64px',
                        height: '64px'
                    }}
                >
                    <div className={`w-16 h-16 border-2 rounded-md flex items-center justify-center shadow-2xl bg-gray-900/80 ${getRarityClasses(draggedItem.rarity).border}`}>
                        <ItemIcon item={draggedItem} className="w-10 h-10 text-white" />
                    </div>
                </div>,
                tooltipContainer
            )}
        </div>
    );
};

export default Inventory;
