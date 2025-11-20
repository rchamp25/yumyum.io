
import React, { useState } from 'react';
import { Item, CharacterData, ItemRarity } from '../game/types';
import { ItemSlotComponent } from './Inventory';
import { ITEMS_DB } from '../game/items';

interface VendorUIProps {
    characterData: CharacterData;
    onSell: (item: Item, inventoryIndex: number, sellFullStack: boolean) => void;
    onBuy: (item: Item, cost: number) => void;
    onClose: () => void;
    onSellByRarity?: (rarity: ItemRarity) => void;
}

interface ConfirmationModalState {
    isOpen: boolean;
    type: 'stack' | 'rarity';
    item?: Item;
    index?: number;
    totalGold: number;
    count: number;
}

const VendorUI: React.FC<VendorUIProps> = ({ characterData, onSell, onBuy, onClose, onSellByRarity }) => {
    const [confirmModal, setConfirmModal] = useState<ConfirmationModalState>({
        isOpen: false,
        type: 'stack',
        totalGold: 0,
        count: 0
    });

    const itemsForSale = [
        ITEMS_DB['w_unc_01'], // Steel Longsword
        ITEMS_DB['a_com_01'], // Leather Tunic
        ITEMS_DB['b_com_01'], // Worn Boots
    ];

    // Buying price logic (usually higher than sell price, e.g., 2x sell price)
    const getBuyPrice = (item: Item) => item.sellPrice * 2;

    const handleSellClick = (item: Item, index: number) => {
        if (item.locked) return;
        onSell(item, index, false);
    };

    const handleRightClick = (e: React.MouseEvent, item: Item, index: number) => {
        if (item && e.shiftKey) {
            e.preventDefault();
            
            if (item.locked) return;

            if (item.type === 'Material' && item.quantity && item.quantity > 1) {
                // Confirm Sell Stack
                setConfirmModal({
                    isOpen: true,
                    type: 'stack',
                    item: item,
                    index: index,
                    count: item.quantity,
                    totalGold: item.sellPrice * item.quantity
                });
            } else if (item.type === 'Equipment') {
                // Confirm Sell All Unlocked by Rarity
                // Calculate how many items of this rarity are unlocked
                const unlockedItems = characterData.inventory.filter(i => i && i.type === 'Equipment' && i.rarity === item.rarity && !i.locked);
                const count = unlockedItems.length;
                const totalGold = unlockedItems.reduce((acc, curr) => acc + ((curr?.sellPrice || 0) * (curr?.quantity || 1)), 0);

                setConfirmModal({
                    isOpen: true,
                    type: 'rarity',
                    item: item, // Used for rarity reference
                    totalGold: totalGold,
                    count: count
                });
            } else {
                 // Single item that isn't a stack - just sell it or maybe confirm? 
                 // Current behavior for single click is sell. Shift+Click usually implies bulk. 
                 // Let's just sell normally if it's a single non-stack item.
                 onSell(item, index, true);
            }
        }
    };

    const confirmSell = () => {
        if (confirmModal.type === 'stack' && confirmModal.item && confirmModal.index !== undefined) {
            onSell(confirmModal.item, confirmModal.index, true);
        } else if (confirmModal.type === 'rarity' && confirmModal.item && onSellByRarity) {
            onSellByRarity(confirmModal.item.rarity);
        }
        setConfirmModal({ ...confirmModal, isOpen: false });
    };

    return (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-auto" onClick={onClose}>
            <div className="bg-gray-800/90 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-gray-700 text-center max-w-4xl w-full h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h2 className="text-2xl font-bold text-yellow-400">Trevor the Merchant</h2>
                     <button onClick={onClose} className="text-2xl text-gray-400 hover:text-white">&times;</button>
                </div>
                
                <div className="flex justify-center mb-4 shrink-0">
                     <div className="bg-black/40 px-4 py-2 rounded-lg flex items-center space-x-2">
                        <span className="text-gray-300">Your Gold:</span>
                        <span className="text-yellow-400 font-bold text-xl">{characterData.gold.toLocaleString()}</span>
                     </div>
                </div>

                <div className="flex gap-6 flex-grow min-h-0">
                    {/* Buy Section */}
                    <div className="w-1/2 flex flex-col min-h-0">
                        <h3 className="text-xl font-semibold text-emerald-400 mb-3 text-left bg-gray-900/60 p-2 rounded-lg">Buy Equipment</h3>
                        <div className="bg-gray-900/50 p-4 rounded-lg overflow-y-auto flex-grow">
                            <div className="grid grid-cols-1 gap-3">
                                {itemsForSale.map((item) => {
                                    const cost = getBuyPrice(item);
                                    const canAfford = characterData.gold >= cost;
                                    const inventoryFull = !characterData.inventory.some(s => s === null);

                                    return (
                                        <div key={item.id} className="bg-gray-800 p-2 rounded-lg flex justify-between items-center border border-gray-700 hover:bg-gray-700/50 transition-colors">
                                            <div className="flex items-center space-x-3">
                                                <ItemSlotComponent item={{...item, quantity: 1}} />
                                                <div className="text-left">
                                                    <div className="font-bold text-white text-sm">{item.name}</div>
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={() => onBuy(item, cost)}
                                                disabled={!canAfford || inventoryFull}
                                                className={`px-3 py-1 rounded-lg font-bold text-sm min-w-[80px] flex flex-col items-center justify-center
                                                    ${canAfford && !inventoryFull
                                                        ? 'bg-emerald-600 text-white hover:bg-emerald-500' 
                                                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'}
                                                `}
                                            >
                                                <span>Buy</span>
                                                <span className="text-xs text-yellow-300">{cost} G</span>
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Sell Section */}
                    <div className="w-1/2 flex flex-col min-h-0">
                        <h3 className="text-xl font-semibold text-yellow-400 mb-3 text-left bg-gray-900/60 p-2 rounded-lg">Sell Inventory</h3>
                        <div className="bg-gray-900/50 p-4 rounded-lg overflow-y-auto flex-grow">
                            <div className="grid grid-cols-4 gap-2">
                                {characterData.inventory.map((item, index) => (
                                    <ItemSlotComponent 
                                        key={index}
                                        item={item} 
                                        onClick={item ? () => handleSellClick(item, index) : undefined}
                                        onContextMenu={item ? (e) => handleRightClick(e, item, index) : undefined}
                                        hoverContent={
                                            item && !item.locked ? (
                                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center pointer-events-none rounded-md p-1">
                                                    <p className="text-yellow-400 font-bold text-[10px] leading-tight">
                                                        Sell:
                                                    </p>
                                                    <p className="text-white font-bold text-xs leading-tight">
                                                        {(item.sellPrice || 0) * (item.quantity || 1)} G
                                                    </p>
                                                </div>
                                            ) : item && item.locked ? (
                                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center pointer-events-none rounded-md p-1">
                                                    <p className="text-red-400 font-bold text-xs leading-tight">LOCKED</p>
                                                </div>
                                            ) : null
                                        }
                                    />
                                ))}
                            </div>
                             <p className="text-gray-500 text-xs mt-4">Hint: Hold [Shift] + Right-Click to sell bulk/stack.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-gray-800 border-2 border-gray-600 rounded-lg p-6 max-w-md w-full text-center shadow-2xl animate-fade-in">
                        <h3 className="text-2xl font-bold text-white mb-4">Confirm Sale</h3>
                        
                        <p className="text-gray-300 mb-2">
                            {confirmModal.type === 'stack' ? (
                                <>
                                    Sell stack of <span className="text-white font-bold">{confirmModal.count}x {confirmModal.item?.name}</span>?
                                </>
                            ) : (
                                <>
                                    Sell <span className="text-white font-bold">{confirmModal.count} unlocked {ItemRarity[confirmModal.item!.rarity]} items</span>?
                                </>
                            )}
                        </p>
                        
                        <div className="bg-black/40 p-3 rounded-lg mb-6 inline-block">
                            <span className="text-gray-400 text-sm mr-2">Total Value:</span>
                            <span className="text-yellow-400 font-bold text-xl">{confirmModal.totalGold.toLocaleString()} G</span>
                        </div>

                        <div className="flex justify-center space-x-4">
                            <button 
                                onClick={() => setConfirmModal({...confirmModal, isOpen: false})}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmSell}
                                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold transition-colors"
                            >
                                Confirm Sell
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorUI;
