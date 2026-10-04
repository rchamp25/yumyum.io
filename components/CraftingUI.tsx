
import React from 'react';
import { Recipe, CharacterData } from '../game/types';
import { MATERIALS_DB } from '../game/items';
import { ItemSlotComponent } from './Inventory';

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

    const getAvailableMaterials = (materialId: string): number => {
        const material = characterData.inventory.find(item => item && item.id === materialId);
        return material?.quantity || 0;
    }

    return (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-auto z-60" onClick={onClose}>
            <div className="bg-gray-800/90 backdrop-blur-md p-4 md:p-6 rounded-xl shadow-lg border border-gray-700 w-[95%] md:max-w-4xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-semibold text-teal-400">Crafting - Thomas</h3>
                    <button onClick={onClose} className="text-2xl text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
                    {recipes.map(recipe => {
                        const canCraft = hasIngredients(recipe);
                        const hasSpace = characterData.inventory.some(slot => !slot);

                        return (
                            <div key={recipe.id} className="bg-gray-900/50 p-3 rounded-lg flex flex-col md:flex-row justify-between md:items-center gap-3 md:gap-4">
                                <div className="flex items-center gap-4 grow">
                                    <ItemSlotComponent item={recipe.result} />
                                    <div className="text-left grow">
                                        <p className="font-bold text-white text-lg">{recipe.result.name}</p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            {recipe.ingredients.map(ing => {
                                                const material = MATERIALS_DB[ing.materialId];
                                                const available = getAvailableMaterials(ing.materialId);
                                                const hasEnough = available >= ing.quantity;
                                                if (!material) return null;
                                                return (
                                                    <div key={ing.materialId} className="relative">
                                                        <ItemSlotComponent item={{...material, quantity: available}} />
                                                        <div className={`absolute -bottom-2 -right-2 text-xs font-bold px-1.5 py-0.5 rounded-sm ${hasEnough ? 'bg-gray-700 text-gray-300' : 'bg-red-800 text-red-200'} border border-black/50`}>
                                                            {available}/{ing.quantity}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onCraft(recipe)}
                                    disabled={!canCraft || !hasSpace}
                                    title={!hasSpace ? "Inventory is full" : !canCraft ? "Missing ingredients" : "Craft item"}
                                    className="bg-teal-500 text-white font-bold py-2 px-6 rounded-sm hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
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
