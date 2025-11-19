import React from 'react';
import { NPC } from '../game/entities/NPC';
import { NPCType, CharacterData, Recipe, Item } from '../game/types';
import CraftingUI from './CraftingUI';
import VendorUI from './VendorUI';

interface NPCInteractionProps {
    npc: NPC;
    characterData: CharacterData;
    recipes: Recipe[];
    onClose: () => void;
    onCraft: (recipe: Recipe) => void;
    onSell: (item: Item, inventoryIndex: number, sellFullStack: boolean) => void;
}

const NPCInteraction: React.FC<NPCInteractionProps> = ({ npc, characterData, recipes, onClose, onCraft, onSell }) => {
    
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
                        onClose={onClose}
                    />
                );
            case NPCType.QuestGiver:
                 return (
                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-auto" onClick={onClose}>
                        <div className="bg-gray-800/90 backdrop-blur-md p-6 rounded-xl shadow-lg border border-gray-700 max-w-3xl w-full" onClick={e => e.stopPropagation()}>
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