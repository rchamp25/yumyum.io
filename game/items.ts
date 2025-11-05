import { Item, ItemSlot, ItemRarity, Recipe, EnemyType } from './types';

export const ITEMS_DB: { [id: string]: Item } = {
  // --- WEAPONS ---
  'w_com_01': { id: 'w_com_01', name: 'Rusty Sword', type: 'Equipment', slot: ItemSlot.Weapon, rarity: ItemRarity.Common, stats: { damage: 2 }, description: 'A bit tetanus-y.', icon: 'sword', levelReq: 1 },
  'w_com_02': { id: 'w_com_02', name: 'Shortbow', type: 'Equipment', slot: ItemSlot.Weapon, rarity: ItemRarity.Common, stats: { damage: 2 }, description: 'Good for practice.', icon: 'sword', levelReq: 1 },
  'w_com_03': { id: 'w_com_03', name: 'Gnarled Staff', type: 'Equipment', slot: ItemSlot.Weapon, rarity: ItemRarity.Common, stats: { damage: 2 }, description: 'Smells of moss.', icon: 'sword', levelReq: 1 },
  'w_unc_01': { id: 'w_unc_01', name: 'Steel Longsword', type: 'Equipment', slot: ItemSlot.Weapon, rarity: ItemRarity.Uncommon, stats: { damage: 5, maxHealth: 10 }, description: 'A reliable blade.', icon: 'sword', levelReq: 5 },
  'w_rar_01': { id: 'w_rar_01', name: 'Elven Bow', type: 'Equipment', slot: ItemSlot.Weapon, rarity: ItemRarity.Rare, stats: { damage: 10, speed: 0.2 }, description: 'Whispers of the forest cling to it.', icon: 'sword', levelReq: 10 },
  'w_epi_01': { id: 'w_epi_01', name: 'Archmage Staff', type: 'Equipment', slot: ItemSlot.Weapon, rarity: ItemRarity.Epic, stats: { damage: 20, maxHealth: 25 }, description: 'Crackles with raw power.', icon: 'sword', levelReq: 20 },
  'w_leg_01': { id: 'w_leg_01', name: 'Blade of the Fallen King', type: 'Equipment', slot: ItemSlot.Weapon, rarity: ItemRarity.Legendary, stats: { damage: 40, maxHealth: 100, speed: 0.3 }, description: 'A hero\'s final legacy.', icon: 'sword', levelReq: 30 },
  
  // --- ARMOR ---
  'a_com_01': { id: 'a_com_01', name: 'Leather Tunic', type: 'Equipment', slot: ItemSlot.Armor, rarity: ItemRarity.Common, stats: { maxHealth: 10 }, description: 'Better than nothing.', icon: 'vest', levelReq: 1 },
  'a_unc_01': { id: 'a_unc_01', name: 'Chainmail Vest', type: 'Equipment', slot: ItemSlot.Armor, rarity: ItemRarity.Uncommon, stats: { maxHealth: 25 }, description: 'Stops a stray arrow or two.', icon: 'vest', levelReq: 5 },
  'a_rar_01': { id: 'a_rar_01', name: 'Plate Armor', type: 'Equipment', slot: ItemSlot.Armor, rarity: ItemRarity.Rare, stats: { maxHealth: 60 }, description: 'Heavy, but effective.', icon: 'vest', levelReq: 12 },
  'a_epi_01': { id: 'a_epi_01', name: 'Mage Robes of the Guardian', type: 'Equipment', slot: ItemSlot.Armor, rarity: ItemRarity.Epic, stats: { maxHealth: 75, damage: 5 }, description: 'Woven with protective wards.', icon: 'vest', levelReq: 22 },
  'a_leg_01': { id: 'a_leg_01', name: 'Dragonscale Hauberk', type: 'Equipment', slot: ItemSlot.Armor, rarity: ItemRarity.Legendary, stats: { maxHealth: 150, damage: 10 }, description: 'Almost indestructible.', icon: 'vest', levelReq: 32 },
  
  // --- BOOTS ---
  'b_com_01': { id: 'b_com_01', name: 'Worn Boots', type: 'Equipment', slot: ItemSlot.Boots, rarity: ItemRarity.Common, stats: { speed: 0.2 }, description: 'Soles are a bit thin.', icon: 'boots', levelReq: 1 },
  'b_unc_01': { id: 'b_unc_01', name: 'Sturdy Greaves', type: 'Equipment', slot: ItemSlot.Boots, rarity: ItemRarity.Uncommon, stats: { speed: 0.3, maxHealth: 5 }, description: 'Good for stomping.', icon: 'boots', levelReq: 6 },
  'b_rar_01': { id: 'b_rar_01', name: 'Boots of Swiftness', type: 'Equipment', slot: ItemSlot.Boots, rarity: ItemRarity.Rare, stats: { speed: 0.5 }, description: 'Feel light on your feet.', icon: 'boots', levelReq: 14 },
  'b_epi_01': { id: 'b_epi_01', name: 'Plated Sabatons', type: 'Equipment', slot: ItemSlot.Boots, rarity: ItemRarity.Epic, stats: { speed: 0.4, maxHealth: 40 }, description: 'Anchor yourself in battle.', icon: 'boots', levelReq: 24 },
  'b_leg_01': { id: 'b_leg_01', name: 'Windwalkers', type: 'Equipment', slot: ItemSlot.Boots, rarity: ItemRarity.Legendary, stats: { speed: 0.8, maxHealth: 20 }, description: 'Move like the wind.', icon: 'boots', levelReq: 34 },
  
  // --- ACCESSORIES ---
  'x_rar_01': { id: 'x_rar_01', name: 'Ring of Vitality', type: 'Equipment', slot: ItemSlot.Accessory, rarity: ItemRarity.Rare, stats: { maxHealth: 40 }, description: 'Pulses with a faint warmth.', icon: 'ring', levelReq: 8 },
  'x_epi_01': { id: 'x_epi_01', name: 'Amulet of Power', type: 'Equipment', slot: ItemSlot.Accessory, rarity: ItemRarity.Epic, stats: { damage: 15, maxHealth: 25 }, description: 'A gem that hums with energy.', icon: 'ring', levelReq: 18 },
  'x_leg_01': { id: 'x_leg_01', name: 'Seal of the Ancient King', type: 'Equipment', slot: ItemSlot.Accessory, rarity: ItemRarity.Legendary, stats: { damage: 20, maxHealth: 50, speed: 0.1 }, description: 'A symbol of forgotten royalty.', icon: 'ring', levelReq: 28 },
};

export const MATERIALS_DB: { [id: string]: Item } = {
    'mat_com': { id: 'mat_com', name: 'Common Scraps', type: 'Material', rarity: ItemRarity.Common, description: 'Bits and pieces from common foes.', icon: '', stackable: true, quantity: 1 },
    'mat_unc': { id: 'mat_unc', name: 'Uncommon Metal', type: 'Material', rarity: ItemRarity.Uncommon, description: 'A sturdy, but unremarkable metal.', icon: '', stackable: true, quantity: 1 },
    'mat_rar': { id: 'mat_rar', name: 'Rare Crystal', type: 'Material', rarity: ItemRarity.Rare, description: 'Glows with a faint inner light.', icon: '', stackable: true, quantity: 1 },
    'mat_epi': { id: 'mat_epi', name: 'Epic Orb', type: 'Material', rarity: ItemRarity.Epic, description: 'Swirls with captured magic.', icon: '', stackable: true, quantity: 1 },
    'mat_leg': { id: 'mat_leg', name: 'Legendary Core', type: 'Material', rarity: ItemRarity.Legendary, description: 'The heart of a powerful entity.', icon: '', stackable: true, quantity: 1 },
};

export const CRAFTING_RECIPES_DB: Recipe[] = Object.values(ITEMS_DB).map(item => {
    const ingredients: {materialId: string, quantity: number}[] = [];
    switch (item.rarity) {
        case ItemRarity.Common: 
            ingredients.push({ materialId: 'mat_com', quantity: 3 });
            break;
        case ItemRarity.Uncommon: 
            ingredients.push({ materialId: 'mat_com', quantity: 5 });
            ingredients.push({ materialId: 'mat_unc', quantity: 2 });
            break;
        case ItemRarity.Rare: 
            ingredients.push({ materialId: 'mat_unc', quantity: 8 });
            ingredients.push({ materialId: 'mat_rar', quantity: 3 });
            break;
        case ItemRarity.Epic:
            ingredients.push({ materialId: 'mat_rar', quantity: 10 });
            ingredients.push({ materialId: 'mat_epi', quantity: 4 });
            break;
        case ItemRarity.Legendary:
            ingredients.push({ materialId: 'mat_epi', quantity: 12 });
            ingredients.push({ materialId: 'mat_leg', quantity: 5 });
            break;
    }
    return { id: `craft_${item.id}`, result: item, ingredients };
});

const getRarityFromRoll = (roll: number): ItemRarity => {
    if (roll > 0.98) return ItemRarity.Legendary; // 2%
    if (roll > 0.90) return ItemRarity.Epic;      // 8%
    if (roll > 0.70) return ItemRarity.Rare;      // 20%
    if (roll > 0.40) return ItemRarity.Uncommon;  // 30%
    return ItemRarity.Common;                     // 40%
};

const getLootBonus = (level: number, enemyType: EnemyType) => {
    let bonus = level / 200; // up to +15% at level 30
    if (enemyType === EnemyType.Tank || enemyType === EnemyType.Ranger) bonus += 0.05; // 5% bonus for elites
    return bonus;
};

// FIX: Restored getRandomItem to support more complex loot drops based on level and enemy type.
export function getRandomItem(level: number, enemyType: EnemyType): Item | null {
    const dropTypeRoll = Math.random();

    if (dropTypeRoll < 0.6) { // 60% chance for equipment
        const possibleItems = Object.values(ITEMS_DB).filter(i => (i.levelReq || 1) <= level);
        if (possibleItems.length === 0) return null;

        const rarityRoll = Math.random() + getLootBonus(level, enemyType);
        const targetRarity = getRarityFromRoll(rarityRoll);

        let filteredItems = possibleItems.filter(i => i.rarity === targetRarity);
        // Fallback to find a lower rarity item if no items of the target rarity are available
        let currentRarity = targetRarity;
        while(filteredItems.length === 0 && currentRarity >= 0) {
            currentRarity--;
            filteredItems = possibleItems.filter(i => i.rarity === currentRarity);
        }

        if (filteredItems.length > 0) {
            return { ...filteredItems[Math.floor(Math.random() * filteredItems.length)] };
        }
    } else if (dropTypeRoll < 0.95) { // 35% chance for materials
        const possibleMaterials = Object.values(MATERIALS_DB);
        const rarityRoll = Math.random() + getLootBonus(level, enemyType) / 2; // Materials are slightly more common
        const targetRarity = getRarityFromRoll(rarityRoll);
        
        const material = possibleMaterials.find(m => m.rarity === targetRarity);
        return material ? { ...material, quantity: 1 } : { ...MATERIALS_DB['mat_com'], quantity: 1 };
    }
    
    return null; // 5% chance for no drop
}
