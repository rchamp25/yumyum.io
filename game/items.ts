
import { Item, ItemRarity, ItemSlot, Recipe } from './types';
import { LOOT_CONFIG } from './constants';

// --- MATERIALS ---
export const MATERIALS_DB: { [key: string]: Item } = {
    'mat_com': { id: 'mat_com', name: 'Common Scraps', type: 'Material', rarity: ItemRarity.Common, sellPrice: 1 },
    'mat_unc': { id: 'mat_unc', name: 'Uncommon Metal', type: 'Material', rarity: ItemRarity.Uncommon, sellPrice: 5 },
    'mat_rar': { id: 'mat_rar', name: 'Rare Crystal', type: 'Material', rarity: ItemRarity.Rare, sellPrice: 20 },
    'mat_epi': { id: 'mat_epi', name: 'Epic Orb', type: 'Material', rarity: ItemRarity.Epic, sellPrice: 100 },
    'mat_leg': { id: 'mat_leg', name: 'Legendary Core', type: 'Material', rarity: ItemRarity.Legendary, sellPrice: 500 },
};

// --- WEAPONS ---
export const WEAPONS_DB: { [key: string]: Item } = {
    'w_com_01': { id: 'w_com_01', name: 'Rusty Sword', type: 'Equipment', slot: ItemSlot.Weapon, rarity: ItemRarity.Common, stats: { damage: 3 }, sellPrice: 5 },
    'w_com_02': { id: 'w_com_02', name: 'Shortbow', type: 'Equipment', slot: ItemSlot.Weapon, rarity: ItemRarity.Common, stats: { damage: 3 }, sellPrice: 5 },
    'w_com_03': { id: 'w_com_03', name: 'Gnarled Staff', type: 'Equipment', slot: ItemSlot.Weapon, rarity: ItemRarity.Common, stats: { damage: 3 }, sellPrice: 5 },
    'w_unc_01': { id: 'w_unc_01', name: 'Steel Longsword', type: 'Equipment', slot: ItemSlot.Weapon, rarity: ItemRarity.Uncommon, stats: { damage: 8 }, sellPrice: 25 },
    'w_rar_01': { id: 'w_rar_01', name: 'Elven Bow', type: 'Equipment', slot: ItemSlot.Weapon, rarity: ItemRarity.Rare, stats: { damage: 15 }, sellPrice: 100 },
    'w_epi_01': { id: 'w_epi_01', name: 'Archmage Staff', type: 'Equipment', slot: ItemSlot.Weapon, rarity: ItemRarity.Epic, stats: { damage: 25 }, sellPrice: 500 },
    'w_leg_01': { id: 'w_leg_01', name: 'Fallen King Blade', type: 'Equipment', slot: ItemSlot.Weapon, rarity: ItemRarity.Legendary, stats: { damage: 45, maxHealth: 50 }, description: "It thirsts for vengeance.", sellPrice: 2000 },
    'w_myt_01': { id: 'w_myt_01', name: 'The Boss Hunter', type: 'Equipment', slot: ItemSlot.Weapon, rarity: ItemRarity.Mythic, stats: { damage: 80, maxHealth: 200, speed: 0.5, itemFind: 0.5, bossDamageMultiplier: 1.0 }, description: "Forged solely to slay gods. Deals double damage to bosses.", sellPrice: 10000 },
};

// --- ARMOR ---
export const ARMOR_DB: { [key: string]: Item } = {
    'a_com_01': { id: 'a_com_01', name: 'Leather Tunic', type: 'Equipment', slot: ItemSlot.Armor, rarity: ItemRarity.Common, stats: { maxHealth: 10 }, sellPrice: 5 },
    'a_unc_01': { id: 'a_unc_01', name: 'Chainmail Vest', type: 'Equipment', slot: ItemSlot.Armor, rarity: ItemRarity.Uncommon, stats: { maxHealth: 25, healthRegen: 0.5 }, sellPrice: 25 },
    'a_rar_01': { id: 'a_rar_01', name: 'Plate Armor', type: 'Equipment', slot: ItemSlot.Armor, rarity: ItemRarity.Rare, stats: { maxHealth: 50, healthRegen: 1 }, sellPrice: 100 },
    'a_epi_01': { id: 'a_epi_01', name: 'Mage Robes', type: 'Equipment', slot: ItemSlot.Armor, rarity: ItemRarity.Epic, stats: { maxHealth: 80, damage: 5, healthRegen: 1.5 }, sellPrice: 500 },
    'a_leg_01': { id: 'a_leg_01', name: 'Dragonscale Hauberk', type: 'Equipment', slot: ItemSlot.Armor, rarity: ItemRarity.Legendary, stats: { maxHealth: 150, damage: 10, healthRegen: 3 }, description: "Crafted from the scales of an ancient wyrm.", sellPrice: 2000 },
    'a_myt_01': { id: 'a_myt_01', name: 'Titan\'s Heartplate', type: 'Equipment', slot: ItemSlot.Armor, rarity: ItemRarity.Mythic, stats: { maxHealth: 500, damage: 20, healthRegen: 10, itemFind: 0.5 }, description: "Pulsing with the life force of a dead titan.", sellPrice: 10000 },
};

// --- BOOTS ---
export const BOOTS_DB: { [key: string]: Item } = {
    'b_com_01': { id: 'b_com_01', name: 'Worn Boots', type: 'Equipment', slot: ItemSlot.Boots, rarity: ItemRarity.Common, stats: { speed: 0.1 }, sellPrice: 5 },
    'b_unc_01': { id: 'b_unc_01', name: 'Sturdy Greaves', type: 'Equipment', slot: ItemSlot.Boots, rarity: ItemRarity.Uncommon, stats: { speed: 0.2, maxHealth: 10 }, sellPrice: 25 },
    'b_rar_01': { id: 'b_rar_01', name: 'Swiftness Boots', type: 'Equipment', slot: ItemSlot.Boots, rarity: ItemRarity.Rare, stats: { speed: 0.4 }, sellPrice: 100 },
    'b_epi_01': { id: 'b_epi_01', name: 'Plated Sabatons', type: 'Equipment', slot: ItemSlot.Boots, rarity: ItemRarity.Epic, stats: { speed: 0.3, maxHealth: 40, healthRegen: 1 }, sellPrice: 500 },
    'b_leg_01': { id: 'b_leg_01', name: 'Windwalkers', type: 'Equipment', slot: ItemSlot.Boots, rarity: ItemRarity.Legendary, stats: { speed: 0.6 }, description: "Walk on air itself.", sellPrice: 2000 },
    'b_myt_01': { id: 'b_myt_01', name: 'Voidwalker Treads', type: 'Equipment', slot: ItemSlot.Boots, rarity: ItemRarity.Mythic, stats: { speed: 1.2, maxHealth: 200, itemFind: 0.5 }, description: "Step through the fabric of reality.", sellPrice: 10000 },
};

// --- ACCESSORIES ---
export const ACCESSORIES_DB: { [key: string]: Item } = {
    'x_rar_01': { id: 'x_rar_01', name: 'Vitality Ring', type: 'Equipment', slot: ItemSlot.Accessory, rarity: ItemRarity.Rare, stats: { maxHealth: 30, healthRegen: 2, itemFind: 0.1 }, sellPrice: 150 },
    'x_epi_01': { id: 'x_epi_01', name: 'Power Amulet', type: 'Equipment', slot: ItemSlot.Accessory, rarity: ItemRarity.Epic, stats: { damage: 8, healthRegen: 1, itemFind: 0.175 }, sellPrice: 600 },
    'x_leg_01': { id: 'x_leg_01', name: 'Ancient King Seal', type: 'Equipment', slot: ItemSlot.Accessory, rarity: ItemRarity.Legendary, stats: { maxHealth: 75, damage: 15, healthRegen: 5, itemFind: 0.25 }, description: "The symbol of a forgotten dynasty.", sellPrice: 2500 },
    'x_myt_01': { id: 'x_myt_01', name: 'Soul of the Universe', type: 'Equipment', slot: ItemSlot.Accessory, rarity: ItemRarity.Mythic, stats: { maxHealth: 250, damage: 50, healthRegen: 8, itemFind: 0.75 }, description: "A fragment of creation. (Set Bonus: 1.5x Dmg with Infinity Pouch)", sellPrice: 10000 },
};

// --- BAGS ---
export const BAGS_DB: { [key: string]: Item } = {
    'bag_com': { id: 'bag_com', name: 'Leather Pouch', type: 'Equipment', slot: ItemSlot.Bag, rarity: ItemRarity.Common, stats: { maxInventorySlots: 2, maxHealth: 5, itemFind: 0.025 }, sellPrice: 15 },
    'bag_unc': { id: 'bag_unc', name: 'Canvas Sack', type: 'Equipment', slot: ItemSlot.Bag, rarity: ItemRarity.Uncommon, stats: { maxInventorySlots: 4, maxHealth: 10, speed: 0.1, itemFind: 0.05 }, sellPrice: 40 },
    'bag_rar': { id: 'bag_rar', name: 'Adventurer\'s Backpack', type: 'Equipment', slot: ItemSlot.Bag, rarity: ItemRarity.Rare, stats: { maxInventorySlots: 6, maxHealth: 20, speed: 0.3, itemFind: 0.1 }, sellPrice: 150 },
    'bag_epi': { id: 'bag_epi', name: 'Void Satchel', type: 'Equipment', slot: ItemSlot.Bag, rarity: ItemRarity.Epic, stats: { maxInventorySlots: 8, maxHealth: 35, speed: 0.6, itemFind: 0.175 }, sellPrice: 600 },
    'bag_leg': { id: 'bag_leg', name: 'Dimensional Bag', type: 'Equipment', slot: ItemSlot.Bag, rarity: ItemRarity.Legendary, stats: { maxInventorySlots: 10, maxHealth: 50, speed: 2.0, itemFind: 0.25 }, description: "It's bigger on the inside.", sellPrice: 2500 },
    'bag_myt_01': { id: 'bag_myt_01', name: 'Infinity Pouch', type: 'Equipment', slot: ItemSlot.Bag, rarity: ItemRarity.Mythic, stats: { maxInventorySlots: 25, maxHealth: 100, speed: 3.0, itemFind: 0.75 }, description: "Contains a universe of storage. (Set Bonus: 1.5x Dmg with Soul of Universe)", sellPrice: 10000 },
};

export const ITEMS_DB: { [key: string]: Item } = { ...WEAPONS_DB, ...ARMOR_DB, ...BOOTS_DB, ...ACCESSORIES_DB, ...BAGS_DB };
export const ALL_EQUIPMENT = Object.values(ITEMS_DB);
export const ALL_MYTHICS = ALL_EQUIPMENT.filter(i => i.rarity === ItemRarity.Mythic);

// Recipe Costs (Increased 5x as requested)
const MYTHIC_RECIPE_COST = [
    { materialId: 'mat_leg', quantity: 300 }, 
    { materialId: 'mat_epi', quantity: 600 },
    { materialId: 'mat_rar', quantity: 1000 },
    { materialId: 'mat_unc', quantity: 2000 },
    { materialId: 'mat_com', quantity: 5000 }
];

export const CRAFTING_RECIPES: Recipe[] = [
    { id: 'craft_w_unc_01', result: WEAPONS_DB['w_unc_01'], ingredients: [{ materialId: 'mat_com', quantity: 10 }, { materialId: 'mat_unc', quantity: 2 }] },
    { id: 'craft_a_unc_01', result: ARMOR_DB['a_unc_01'], ingredients: [{ materialId: 'mat_com', quantity: 12 }, { materialId: 'mat_unc', quantity: 3 }] },
    { id: 'craft_b_unc_01', result: BOOTS_DB['b_unc_01'], ingredients: [{ materialId: 'mat_com', quantity: 8 }, { materialId: 'mat_unc', quantity: 1 }] },
    { id: 'craft_bag_unc', result: BAGS_DB['bag_unc'], ingredients: [{ materialId: 'mat_com', quantity: 15 }, { materialId: 'mat_unc', quantity: 2 }] },
    
    { id: 'craft_w_rar_01', result: WEAPONS_DB['w_rar_01'], ingredients: [{ materialId: 'mat_unc', quantity: 15 }, { materialId: 'mat_rar', quantity: 4 }] },
    { id: 'craft_a_rar_01', result: ARMOR_DB['a_rar_01'], ingredients: [{ materialId: 'mat_unc', quantity: 18 }, { materialId: 'mat_rar', quantity: 5 }] },
    { id: 'craft_bag_rar', result: BAGS_DB['bag_rar'], ingredients: [{ materialId: 'mat_unc', quantity: 20 }, { materialId: 'mat_rar', quantity: 5 }] },
    
    { id: 'craft_w_epi_01', result: WEAPONS_DB['w_epi_01'], ingredients: [{ materialId: 'mat_rar', quantity: 12 }, { materialId: 'mat_epi', quantity: 3 }] },
    { id: 'craft_bag_epi', result: BAGS_DB['bag_epi'], ingredients: [{ materialId: 'mat_rar', quantity: 15 }, { materialId: 'mat_epi', quantity: 5 }] },
    
    { id: 'craft_w_leg_01', result: WEAPONS_DB['w_leg_01'], ingredients: [{ materialId: 'mat_epi', quantity: 10 }, { materialId: 'mat_leg', quantity: 2 }] },
    { id: 'craft_bag_leg', result: BAGS_DB['bag_leg'], ingredients: [{ materialId: 'mat_epi', quantity: 20 }, { materialId: 'mat_leg', quantity: 5 }] },

    // Mythic Recipes - All slots
    { id: 'craft_w_myt_01', result: WEAPONS_DB['w_myt_01'], ingredients: MYTHIC_RECIPE_COST },
    { id: 'craft_a_myt_01', result: ARMOR_DB['a_myt_01'], ingredients: MYTHIC_RECIPE_COST },
    { id: 'craft_b_myt_01', result: BOOTS_DB['b_myt_01'], ingredients: MYTHIC_RECIPE_COST },
    { id: 'craft_x_myt_01', result: ACCESSORIES_DB['x_myt_01'], ingredients: MYTHIC_RECIPE_COST },
    { id: 'craft_bag_myt_01', result: BAGS_DB['bag_myt_01'], ingredients: MYTHIC_RECIPE_COST },
];

export function getRandomItem(level: number, rarityModifier: number = 1): Item | null {
    const roll = Math.random();
    let chosenRarity: ItemRarity = ItemRarity.Common;
    const levelBonus = level * LOOT_CONFIG.LEVEL_RARITY_BONUS;

    if (roll < (LOOT_CONFIG.RARITY_CHANCES[ItemRarity.Legendary] + levelBonus) * rarityModifier) {
        chosenRarity = ItemRarity.Legendary;
    } else if (roll < (LOOT_CONFIG.RARITY_CHANCES[ItemRarity.Epic] + levelBonus) * rarityModifier) {
        chosenRarity = ItemRarity.Epic;
    } else if (roll < (LOOT_CONFIG.RARITY_CHANCES[ItemRarity.Rare] + levelBonus) * rarityModifier) {
        chosenRarity = ItemRarity.Rare;
    } else if (roll < (LOOT_CONFIG.RARITY_CHANCES[ItemRarity.Uncommon] + levelBonus) * rarityModifier) {
        chosenRarity = ItemRarity.Uncommon;
    }
    // Fallback to Common

    const possibleItems = ALL_EQUIPMENT.filter(item => item.rarity === chosenRarity);
    if (possibleItems.length > 0) {
        const item = possibleItems[Math.floor(Math.random() * possibleItems.length)];
        return { ...item }; // Return a copy
    }

    return null;
}
