
import React, { useState } from 'react';
import { Item, CharacterData } from '../game/types';
import { ItemSlotComponent } from './Inventory';

interface BankUIProps {
    characterData: CharacterData;
    bankItems: (Item | null)[];
    onDeposit: (inventoryIndex: number) => void;
    onWithdraw: (bankIndex: number) => void;
    onDepositGold?: (amount: number) => void;
    onWithdrawGold?: (amount: number) => void;
    onClose: () => void;
    isLoading?: boolean;
}

const BankUI: React.FC<BankUIProps> = ({ characterData, bankItems, onDeposit, onWithdraw, onDepositGold, onWithdrawGold, onClose, isLoading }) => {
    // Ensure bank has 100 slots visual
    const displayBank = [...bankItems];
    while(displayBank.length < 100) displayBank.push(null);

    return (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center pointer-events-auto z-50" onClick={onClose}>
            <div className="bg-gray-800/95 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-slate-500 max-w-6xl w-full h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h2 className="text-2xl font-bold text-slate-300 flex items-center">
                        <span className="mr-3 text-3xl">🏦</span> Vault Master
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                {/* Gold Section */}
                <div className="flex justify-between items-center mb-4 bg-slate-900/60 p-4 rounded-lg border border-slate-700">
                    {/* Player Gold */}
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                             <div className="text-xs text-gray-400 uppercase">Inventory Gold</div>
                             <div className="text-yellow-400 font-bold text-xl">{characterData.gold.toLocaleString()} G</div>
                        </div>
                        {onDepositGold && (
                            <div className="flex space-x-2">
                                <button onClick={() => onDepositGold(1000)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-2 py-1 rounded">Dep 1k</button>
                                <button onClick={() => onDepositGold(10000)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-2 py-1 rounded">Dep 10k</button>
                                <button onClick={() => onDepositGold(characterData.gold)} className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xs px-3 py-1 rounded">Deposit All</button>
                            </div>
                        )}
                    </div>

                    <div className="text-gray-500 font-bold text-2xl">⇄</div>

                    {/* Bank Gold */}
                    <div className="flex items-center space-x-4">
                        {onWithdrawGold && (
                            <div className="flex space-x-2">
                                <button onClick={() => onWithdrawGold(characterData.bankGold)} className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xs px-3 py-1 rounded">Withdraw All</button>
                                <button onClick={() => onWithdrawGold(10000)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-2 py-1 rounded">With 10k</button>
                                <button onClick={() => onWithdrawGold(1000)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-2 py-1 rounded">With 1k</button>
                            </div>
                        )}
                        <div className="text-left">
                             <div className="text-xs text-gray-400 uppercase">Vault Gold</div>
                             <div className="text-yellow-400 font-bold text-xl">{characterData.bankGold?.toLocaleString() || 0} G</div>
                             <div className="text-[10px] text-green-400 italic">Safe from death</div>
                        </div>
                    </div>
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
                                        onClick={item && !isLoading ? () => onDeposit(index) : undefined}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Bank Stash */}
                    <div className="w-2/3 flex flex-col min-h-0 relative">
                        <h3 className="text-lg font-bold text-slate-300 mb-2 bg-slate-800/50 p-2 rounded text-center border border-slate-600">
                            Personal Stash (Click to Withdraw)
                        </h3>
                        <div className="bg-slate-900/50 p-4 rounded-lg overflow-y-auto flex-grow border border-slate-700 relative">
                            {isLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
                                    <div className="flex flex-col items-center">
                                        <svg className="animate-spin h-10 w-10 text-slate-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span className="text-slate-300 font-bold">Accessing Vault...</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-10 gap-2">
                                    {displayBank.map((item, index) => (
                                        <ItemSlotComponent 
                                            key={index}
                                            item={item}
                                            onClick={item ? () => onWithdraw(index) : undefined}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="mt-2 text-xs text-gray-500 text-center">
                            Items and Gold stored here are permanently saved to this character.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BankUI;
