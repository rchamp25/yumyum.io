
import React from 'react';
import { NPC } from '../game/entities/NPC';
import { NPCType, CharacterData, Recipe, Item, ItemRarity } from '../game/types';
import CraftingUI from './CraftingUI';
import VendorUI from './VendorUI';
import MaterialVendorUI from './MaterialVendorUI';
import WorldTravelUI from './WorldTravelUI';
import BankUI from './BankUI';

interface NPCInteractionProps {
    npc: NPC;
    characterData: CharacterData;
    recipes: Recipe[];
    onClose: () => void;
    onCraft: (recipe: Recipe) => void;
    onSell: (item: Item, inventoryIndex: number, sellFullStack: boolean) => void;
    onBuy: (item: Item, cost: number) => void;
    onSellByRarity?: (rarity: ItemRarity) => void;
    // Bank props
    bankItems?: (Item | null)[];
    onDeposit?: (inventoryIndex: number) => void;
    onWithdraw?: (bankIndex: number) => void;
    onDepositGold?: (amount: number) => void;
    onWithdrawGold?: (amount: number) => void;
    isBankLoading?: boolean;
    // Travel props
    onTravelToWorld: (worldId: string) => void;
}

const NPCInteraction: React.FC<NPCInteractionProps> = ({ 
    npc, characterData, recipes, onClose, onCraft, onSell, onBuy, onSellByRarity,
    bankItems, onDeposit, onWithdraw, onDepositGold, onWithdrawGold, isBankLoading, onTravelToWorld
}) => {
    
    const renderContent = () => {
        switch (npc.npcType) {
            case NPCType.Crafter:
                return <CraftingUI 
                            recipes={recipes} 
                            characterData={characterData} 
                            onCraft={onCraft} 
                            onClose={onClose} 
                        />;
            case NPCType.Vendor:
                 return (
                    <VendorUI
                        characterData={characterData}
                        onSell={onSell}
                        onBuy={onBuy}
                        onClose={onClose}
                        onSellByRarity={onSellByRarity}
                    />
                );
            case NPCType.Seller:
                return (
                    <MaterialVendorUI 
                        characterData={characterData}
                        onBuy={onBuy}
                        onClose={onClose}
                    />
                );
            case NPCType.WorldTraveler:
                return (
                    <WorldTravelUI 
                        onClose={onClose}
                        onTravelToWorld={onTravelToWorld}
                        currentWorldId={characterData.currentWorldId || 'world_1'}
                    />
                );
            case NPCType.Banker:
                if (bankItems && onDeposit && onWithdraw) {
                    return (
                        <BankUI
                            characterData={characterData}
                            bankItems={bankItems}
                            onDeposit={onDeposit}
                            onWithdraw={onWithdraw}
                            onDepositGold={onDepositGold}
                            onWithdrawGold={onWithdrawGold}
                            onClose={onClose}
                            isLoading={isBankLoading}
                        />
                    );
                }
                return null;
            case NPCType.QuestGiver:
                 return (
                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-auto z-[60]" onClick={onClose}>
                        <div className="bg-gray-800/90 backdrop-blur-md p-6 rounded-xl shadow-lg border border-gray-700 w-[90%] md:max-w-3xl" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-2xl font-semibold text-blue-400">Quest Giver</h3>
                                <button onClick={onClose} className="text-2xl text-gray-400 hover:text-white">&times;</button>
                            </div>
                            <p className="text-gray-300">"Greetings, adventurer! I may have some tasks for you in the future."</p>
                        </div>
                    </div>
                 );
            default:
                return null;
        }
    }

    return (
        <>
            {renderContent()}
        </>
    );
};

export default NPCInteraction;
