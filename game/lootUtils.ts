
import { Item, ItemRarity, Vector2D } from './types';
import { LOOT_CONFIG, BOSS_CONFIG, BOSS_TYPES, ENEMY_TYPES } from './constants';
import { ALL_EQUIPMENT, ALL_MYTHICS, MATERIALS_DB } from './items';

export interface LootResult {
    item: Item;
    position: Vector2D;
}

export function generateLoot(
    enemyLevel: number, 
    enemyPosition: Vector2D, 
    isBoss: boolean, 
    playerItemFind: number
): Item[] {
    const drops: Item[] = [];
    
    // Item Find Calculation
    const baseItemFind = playerItemFind || 0;
    const itemFindMultiplier = 1 + baseItemFind;
    const rarityBonus = enemyLevel * LOOT_CONFIG.LEVEL_RARITY_BONUS;
    
    // Drop materials
    const matDropChance = (LOOT_CONFIG.MATERIAL_DROP_RATE + (enemyLevel * LOOT_CONFIG.LEVEL_MATERIAL_DROP_RATE_BONUS)) * itemFindMultiplier;

    if (Math.random() < matDropChance) {
            const numMaterials = Math.floor(Math.random() * (LOOT_CONFIG.MATERIAL_QUANTITY_MAX - LOOT_CONFIG.MATERIAL_QUANTITY_MIN + 1)) + LOOT_CONFIG.MATERIAL_QUANTITY_MIN;
            for (let i = 0; i < numMaterials; i++) {
                const matRoll = Math.random();
                
                const legThresh = Math.min(1, (LOOT_CONFIG.MATERIAL_RARITY_THRESHOLDS.LEGENDARY + rarityBonus) * itemFindMultiplier);
                const epiThresh = Math.min(1, (LOOT_CONFIG.MATERIAL_RARITY_THRESHOLDS.EPIC + rarityBonus) * itemFindMultiplier);
                const rareThresh = Math.min(1, (LOOT_CONFIG.MATERIAL_RARITY_THRESHOLDS.RARE + rarityBonus) * itemFindMultiplier);
                const uncThresh = Math.min(1, (LOOT_CONFIG.MATERIAL_RARITY_THRESHOLDS.UNCOMMON + rarityBonus) * itemFindMultiplier);

                let material: Item | null = null;
                
                if (enemyLevel >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Legendary] && matRoll < legThresh) {
                    material = MATERIALS_DB['mat_leg'];
                } else if (enemyLevel >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Epic] && matRoll < epiThresh) {
                    material = MATERIALS_DB['mat_epi'];
                } else if (enemyLevel >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Rare] && matRoll < rareThresh) {
                    material = MATERIALS_DB['mat_rar'];
                } else if (enemyLevel >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Uncommon] && matRoll < uncThresh) {
                    material = MATERIALS_DB['mat_unc'];
                } else {
                    material = MATERIALS_DB['mat_com'];
                }
                
                if (material) {
                    drops.push({ ...material, quantity: 1 });
                }
            }
    }

    // Boss Specific Mythic Drop
    if (isBoss) {
            const mythicChance = 0.01 * itemFindMultiplier; // 1% base chance scaled by item find
            if (Math.random() < mythicChance) {
                if (ALL_MYTHICS.length > 0) {
                    const randomMythic = ALL_MYTHICS[Math.floor(Math.random() * ALL_MYTHICS.length)];
                    drops.push({ ...randomMythic });
                }
            }
    }

    // Drop equipment
    const dropLoopCount = isBoss ? (BOSS_CONFIG.BOSS_DROP_BONUS + 1) : 1;

    for(let i=0; i<dropLoopCount; i++) {
        const equipDropChance = (LOOT_CONFIG.EQUIPMENT_DROP_RATE + (enemyLevel * LOOT_CONFIG.LEVEL_DROP_RATE_BONUS)) * itemFindMultiplier;
        const shouldDrop = i > 0 || Math.random() < equipDropChance;

        if (shouldDrop) {
            const item = getRandomItemWithGating(enemyLevel, itemFindMultiplier);
            if (item) {
                drops.push(item);
            }
        }
    }

    return drops;
}

function getRandomItemWithGating(level: number, itemFindMultiplier: number): Item | null {
    const roll = Math.random();
    let chosenRarity: ItemRarity = ItemRarity.Common;
    const levelBonus = level * LOOT_CONFIG.LEVEL_RARITY_BONUS;

    const legChance = (LOOT_CONFIG.RARITY_CHANCES[ItemRarity.Legendary] + levelBonus) * itemFindMultiplier;
    const epiChance = (LOOT_CONFIG.RARITY_CHANCES[ItemRarity.Epic] + levelBonus) * itemFindMultiplier;
    const rareChance = (LOOT_CONFIG.RARITY_CHANCES[ItemRarity.Rare] + levelBonus) * itemFindMultiplier;
    const uncChance = (LOOT_CONFIG.RARITY_CHANCES[ItemRarity.Uncommon] + levelBonus) * itemFindMultiplier;

    if (level >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Legendary] && roll < legChance) {
        chosenRarity = ItemRarity.Legendary;
    } else if (level >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Epic] && roll < epiChance) {
        chosenRarity = ItemRarity.Epic;
    } else if (level >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Rare] && roll < rareChance) {
        chosenRarity = ItemRarity.Rare;
    } else if (level >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Uncommon] && roll < uncChance) {
        chosenRarity = ItemRarity.Uncommon;
    }

    const possibleItems = ALL_EQUIPMENT.filter(item => item.rarity === chosenRarity);
    if (possibleItems.length > 0) {
        const item = possibleItems[Math.floor(Math.random() * possibleItems.length)];
        return { ...item };
    }

    return null;
}
