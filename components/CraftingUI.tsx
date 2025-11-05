import React from 'react';
import { Recipe, CharacterData, Item } from '../game/types';
import { MATERIALS_DB } from '../game/items';
import { ItemIcon } from './icons';

interface CraftingUIProps {
    recipes: Recipe[];
    characterData: CharacterData;
    onCraft: (recipe: Recipe) => void;
    onClose: () => void;
}

const CraftingUI: React.FC<CraftingUIProps> = ({ recipes, characterData, onCraft, onClose }) => {
    
    const hasIngredients = (recipe: Recipe) => {
        return recipe.ingredients.every(ing => {
            const materialInInventory = characterData.inventory.find(item => item && item.id === ing.materialId);
            return materialInInventory && materialInInventory.quantity && materialInInventory.quantity >= ing.quantity;
        });
    }

    return (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-auto" onClick={onClose}>
            <div className="bg-gray-800/90 backdrop-blur-md p-6 rounded-xl shadow-lg border border-gray-700 max-w-3xl w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-semibold text-teal-400">Crafting - Thomas</h3>
                    <button onClick={onClose} className="text-2xl text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {recipes.map(recipe => {
                        const canCraft = hasIngredients(recipe);
                        return (
                            <div key={recipe.id} className="bg-gray-900/50 p-4 rounded-lg flex justify-between items-center">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 mr-4 bg-gray-800 rounded-md flex items-center justify-center">
                                      <ItemIcon item={recipe.result} className="w-8 h-8"/>
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-lg">{recipe.result.name}</p>
                                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                                            <span>Requires:</span>
                                            <div className="flex items-center space-x-2">
                                            {recipe.ingredients.map(ing => {
                                                const material = MATERIALS_DB[ing.materialId];
                                                if (!material) return null;
                                                return (
                                                    <div key={ing.materialId} className="flex items-center" title={material.name}>
                                                        <ItemIcon item={material} className="w-5 h-5 mr-1" />
                                                        <span>{ing.quantity}</span>
                                                    </div>
                                                )
                                            })}
                                            </div>
                                        </div>
                                    </div>
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