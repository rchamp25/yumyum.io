
import React from 'react';
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
    const displayBank = [...bankItems];
    while(displayBank.length < 100) displayBank.push(null);

    return (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center pointer-events-auto z-60" onClick={onClose}>
            <div className="bg-gray-800/95 backdrop-blur-md p-4 md:p-6 rounded-xl shadow-2xl border border-slate-500 w-[95%] md:max-w-6xl h-[95dvh] md:h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-2 md:mb-4 shrink-0">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-300 flex items-center">
                        <span className="mr-2 md:mr-3 text-2xl md:text-3xl">🏦</span> Vault
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                {/* Gold Section - Compact on mobile */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-2 md:mb-4 bg-slate-900/60 p-2 md:p-4 rounded-lg border border-slate-700 gap-2 md:gap-0">
                    {/* Player Gold */}
                    <div className="flex items-center space-x-2 md:space-x-4 w-full md:w-auto justify-between md:justify-start">
                        <div className="text-right md:text-left">
                             <div className="text-[10px] text-gray-400 uppercase">Inv Gold</div>
                             <div className="text-yellow-400 font-bold text-sm md:text-xl">{characterData.gold.toLocaleString()}</div>
                        </div>
                        {onDepositGold && (
                            <div className="flex space-x-1">
                                <button onClick={() => onDepositGold(1000)} className="bg-slate-700 text-white text-[10px] px-2 py-1 rounded-sm">1k</button>
                                <button onClick={() => onDepositGold(characterData.gold)} className="bg-yellow-600 text-black font-bold text-[10px] px-2 py-1 rounded-sm">All</button>
                            </div>
                        )}
                    </div>

                    <div className="text-gray-500 font-bold text-xl rotate-90 md:rotate-0">⇄</div>

                    {/* Bank Gold */}
                    <div className="flex items-center space-x-2 md:space-x-4 w-full md:w-auto justify-between md:justify-end">
                        {onWithdrawGold && (
                            <div className="flex space-x-1">
                                <button onClick={() => onWithdrawGold(characterData.bankGold)} className="bg-yellow-600 text-black font-bold text-[10px] px-2 py-1 rounded-sm">All</button>
                                <button onClick={() => onWithdrawGold(1000)} className="bg-slate-700 text-white text-[10px] px-2 py-1 rounded-sm">1k</button>
                            </div>
                        )}
                        <div className="text-left md:text-right">
                             <div className="text-[10px] text-gray-400 uppercase">Vault Gold</div>
                             <div className="text-yellow-400 font-bold text-sm md:text-xl">{characterData.bankGold?.toLocaleString() || 0}</div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-2 md:gap-6 grow min-h-0">
                    {/* Left: Player Inventory */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <h3 className="text-sm md:text-lg font-bold text-white mb-1 bg-gray-700/50 p-1 rounded-sm text-center">Inventory</h3>
                        <div className="bg-gray-900/50 p-2 rounded-lg overflow-y-auto grow border border-gray-700 h-1/3 md:h-auto">
                            <div className="grid grid-cols-5 md:grid-cols-4 gap-2">
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
                    <div className="flex-2 flex flex-col min-h-0 relative">
                        <h3 className="text-sm md:text-lg font-bold text-slate-300 mb-1 bg-slate-800/50 p-1 rounded-sm text-center border border-slate-600">Stash</h3>
                        <div className="bg-slate-900/50 p-2 rounded-lg overflow-y-auto grow border border-slate-700 relative h-2/3 md:h-auto">
                            {isLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
                                    <span className="text-slate-300 font-bold">Loading...</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-6 md:grid-cols-10 gap-2">
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BankUI;
