
import React, { useState } from 'react';
import { TradeSession, Item } from '../game/types';
import { ItemSlotComponent } from './Inventory';

interface TradeUIProps {
    session: TradeSession;
    currentUserId: string;
    inventory: (Item | null)[];
    onUpdateOffer: (gold: number, items: {item: Item, inventoryIndex: number}[]) => void;
    onLockOffer: (locked: boolean) => void;
    onCancel: () => void;
}

const TradeUI: React.FC<TradeUIProps> = ({ session, currentUserId, inventory, onUpdateOffer, onLockOffer, onCancel }) => {
    const isP1 = currentUserId === session.player1Id;
    const myOffer = isP1 ? session.player1Offer : session.player2Offer;
    const theirOffer = isP1 ? session.player2Offer : session.player1Offer;
    const theirName = isP1 ? session.player2Name : session.player1Name;

    const [offeredGold, setOfferedGold] = useState(0);

    // Simplified: Clicking an inventory item toggles it in/out of trade
    const handleInventoryClick = (item: Item, index: number) => {
        if (myOffer.isLocked) return;

        const isAlreadyOffered = myOffer.items.some(i => i.inventoryIndex === index);
        let newItems = [...myOffer.items];

        if (isAlreadyOffered) {
            newItems = newItems.filter(i => i.inventoryIndex !== index);
        } else {
            if (newItems.length < 10) { // Limit 10 items per trade
                newItems.push({ item, inventoryIndex: index });
            }
        }
        onUpdateOffer(offeredGold, newItems);
    };

    const handleGoldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (myOffer.isLocked) return;
        const val = Math.max(0, parseInt(e.target.value) || 0);
        setOfferedGold(val);
        onUpdateOffer(val, myOffer.items);
    };

    return (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center pointer-events-auto z-50">
            <div className="bg-gray-900/95 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-yellow-600/50 max-w-4xl w-full flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                    <h2 className="text-2xl font-bold text-yellow-500 flex items-center">
                        <span className="mr-2">⚖️</span> Trading with {theirName}
                    </h2>
                    <button onClick={onCancel} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <div className="flex gap-4 h-[400px]">
                    {/* My Offer */}
                    <div className={`flex-1 bg-gray-800/50 rounded-lg p-4 border-2 flex flex-col ${myOffer.isLocked ? 'border-green-500' : 'border-gray-600'}`}>
                        <h3 className="text-center font-bold text-gray-300 mb-2">Your Offer</h3>
                        <div className="grid grid-cols-4 gap-2 flex-grow content-start">
                             {myOffer.items.map((offerItem, i) => (
                                 <div key={i} onClick={() => handleInventoryClick(offerItem.item, offerItem.inventoryIndex)}>
                                     <ItemSlotComponent item={offerItem.item} />
                                 </div>
                             ))}
                             {Array(10 - myOffer.items.length).fill(null).map((_, i) => (
                                 <div key={`empty-${i}`} className="w-16 h-16 bg-black/30 rounded border border-gray-700"></div>
                             ))}
                        </div>
                        <div className="mt-4">
                             <label className="text-xs text-gray-400 block mb-1">Gold Offer:</label>
                             <input 
                                type="number" 
                                value={offeredGold}
                                onChange={handleGoldChange}
                                disabled={myOffer.isLocked}
                                className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-yellow-400 font-bold"
                             />
                        </div>
                        <div className="mt-4 text-center">
                            {myOffer.isLocked ? (
                                <span className="text-green-500 font-bold uppercase">Locked</span>
                            ) : (
                                <button onClick={() => onLockOffer(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-bold w-full">Lock Offer</button>
                            )}
                        </div>
                    </div>

                    {/* Their Offer */}
                    <div className={`flex-1 bg-gray-800/50 rounded-lg p-4 border-2 flex flex-col ${theirOffer.isLocked ? 'border-green-500' : 'border-gray-600'}`}>
                        <h3 className="text-center font-bold text-gray-300 mb-2">{theirName}'s Offer</h3>
                        <div className="grid grid-cols-4 gap-2 flex-grow content-start pointer-events-none">
                             {theirOffer.items.map((offerItem, i) => (
                                 <ItemSlotComponent key={i} item={offerItem.item} />
                             ))}
                             {Array(10 - theirOffer.items.length).fill(null).map((_, i) => (
                                 <div key={`empty-${i}`} className="w-16 h-16 bg-black/30 rounded border border-gray-700"></div>
                             ))}
                        </div>
                        <div className="mt-4">
                             <label className="text-xs text-gray-400 block mb-1">Gold Offer:</label>
                             <div className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-yellow-400 font-bold">
                                 {theirOffer.gold} G
                             </div>
                        </div>
                        <div className="mt-4 text-center">
                             {theirOffer.isLocked ? (
                                <span className="text-green-500 font-bold uppercase">Locked</span>
                            ) : (
                                <span className="text-gray-500 italic">Waiting...</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Inventory Picker */}
                <div className="h-[200px] bg-gray-800 rounded-lg p-4 overflow-y-auto border-t border-gray-700">
                    <h4 className="text-xs font-bold text-gray-400 mb-2">Your Inventory (Click to Add/Remove)</h4>
                    <div className="grid grid-cols-8 gap-2">
                        {inventory.map((item, idx) => (
                            <ItemSlotComponent 
                                key={idx}
                                item={item}
                                onClick={item ? () => handleInventoryClick(item, idx) : undefined}
                                // Dim items already in trade
                                isDragging={myOffer.items.some(i => i.inventoryIndex === idx)}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                     <button onClick={onCancel} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded font-bold">Cancel Trade</button>
                </div>
            </div>
        </div>
    );
};

export default TradeUI;
