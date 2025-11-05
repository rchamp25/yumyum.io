import React from 'react';
import { NPC, NPCType } from '../game/entities/NPC';

interface NPCInteractionProps {
    npc: NPC;
    onClose: () => void;
    // FIX: Added onOpenCrafting to allow Game component to control UI state.
    onOpenCrafting: () => void;
}


const NPCInteraction: React.FC<NPCInteractionProps> = ({ npc, onClose, onOpenCrafting }) => {
    
    const renderContent = () => {
        switch (npc.npcType) {
            case NPCType.QuestGiver:
                return <p>"Hello adventurer! I have a quest for you... (not implemented yet)."</p>;
            case NPCType.Vendor:
                 return <p>"Care to browse my wares? (not implemented yet)."</p>;
            case NPCType.Crafter:
                 return (
                    <>
                        <p className="mb-4">"I can forge powerful items for you, if you have the materials."</p>
                        <button 
                            onClick={onOpenCrafting} 
                            className="bg-teal-500 text-white font-bold py-2 px-6 rounded hover:bg-teal-600 transition-colors"
                        >
                            Open Crafting
                        </button>
                    </>
                 );
            default:
                return <p>"Greetings."</p>;
        }
    }
    
    return (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-auto" onClick={onClose}>
            <div className="bg-gray-800/90 backdrop-blur-md p-6 rounded-xl shadow-lg border border-gray-700 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-3xl font-bold text-white">{npc.name}</h2>
                    <button onClick={onClose} className="text-2xl text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="text-gray-300">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default NPCInteraction;