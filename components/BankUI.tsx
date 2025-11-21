
import React from 'react';
import { Item, CharacterData } from '../game/types';
import { ItemSlotComponent } from './Inventory';

interface BankUIProps {
    characterData: CharacterData;
    bankItems: (Item | null)[];
    onDeposit: (inventoryIndex: number) => void;
    onWithdraw: (bankIndex: number) => void;
    onClose: () => void;
}

const BankUI: React.FC<BankUIProps> = ({ characterData, bankItems, onDeposit, onWithdraw, onClose }) => {
    // Ensure bank has 100 slots visual
    const displayBank = [...bankItems];
    while(displayBank.length < 100) displayBank.push(null);

    return (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center pointer-events-auto z-50" onClick={onClose}>
            <div className="bg-gray-800/95 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-slate-500 max-w-5xl w-full h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h2 className="text-2xl font-bold text-slate-300 flex items-center">
                        <span className="mr-3 text-3xl">🏦</span> Account Vault
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <div className="flex gap-6 flex-grow min-h-0">
                    {/* Left: Player Inventory */}
                    <div className="w-1/3 flex flex-col min-h-0">
                        <h3 className="text-lg font-bold text-white mb-2 bg-gray-700/50 p-2 rounded text-center">
                            Inventory (Click to Deposit)
                        </h3>
                        <div className="bg-gray-900/50 p-4 rounded-lg overflow-y-auto flex-grow border border-gray-700">
                            <div className="grid grid-cols-4 gap-2">
                                {characterData.inventory.map((item, index) => (
                                    <ItemSlotComponent 
                                        key={index}
                                        item={item}
                                        onClick={item ? () => onDeposit(index) : undefined}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Bank Stash */}
                    <div className="w-2/3 flex flex-col min-h-0">
                        <h3 className="text-lg font-bold text-slate-300 mb-2 bg-slate-800/50 p-2 rounded text-center border border-slate-600">
                            Shared Stash (Click to Withdraw)
                        </h3>
                        <div className="bg-slate-900/50 p-4 rounded-lg overflow-y-auto flex-grow border border-slate-700">
                            <div className="grid grid-cols-10 gap-2">
                                {displayBank.map((item, index) => (
                                    <ItemSlotComponent 
                                        key={index}
                                        item={item}
                                        onClick={item ? () => onWithdraw(index) : undefined}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 text-center">
                            Items stored here are accessible by all your characters.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BankUI;
