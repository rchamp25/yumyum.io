import React from 'react';
import { Recipe, CharacterData } from '../game/types';
// FIX: Changed import from ITEMS to MATERIALS_DB for ingredient name lookup.
import { MATERIALS_DB } from '../game/items';

interface CraftingUIProps {
    recipes: Recipe[];
    characterData: CharacterData;
    onCraft: (recipe: Recipe) => void;
    // FIX: Added onClose prop to allow the UI to be closed.
    onClose: () => void;
}

const CraftingUI: React.FC<CraftingUIProps> = ({ recipes, characterData, onCraft, onClose }) => {
    
    const hasIngredients = (recipe: Recipe) => {
        // FIX: Correctly check for stacked materials using materialId and quantity.
        return recipe.ingredients.every(ing => {
            const materialInInventory = characterData.inventory.find(item => item && item.id === ing.materialId);
            return materialInInventory && materialInInventory.quantity && materialInInventory.quantity >= ing.quantity;
        });
    }

    return (
        // FIX: Wrapped component in a modal structure.
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-auto" onClick={onClose}>
            <div className="bg-gray-800/90 backdrop-blur-md p-6 rounded-xl shadow-lg border border-gray-700 max-w-3xl w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-semibold text-teal-400">Crafting</h3>
                    <button onClick={onClose} className="text-2xl text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {recipes.map(recipe => {
                        const canCraft = hasIngredients(recipe);
                        return (
                            <div key={recipe.id} className="bg-gray-900/50 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-white">{recipe.result.name}</p>
                                    <p className="text-sm text-gray-400">
                                        {/* FIX: Use materialId and MATERIALS_DB for correct ingredient names. */}
                                        Requires: {recipe.ingredients.map(ing => `${ing.quantity}x ${MATERIALS_DB[ing.materialId]?.name || '??'}`).join(', ')}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => onCraft(recipe)}
                                    disabled={!canCraft}
                                    className="bg-teal-500 text-white font-bold py-2 px-4 rounded hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                                >
                                    Craft
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CraftingUI;