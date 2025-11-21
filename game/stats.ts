import { CharacterData, ItemSlot, Item, ItemRarity, Vector2D } from './types';
import { GAME_CONFIG, BOSS_ZONES, BOSS_CONFIG, ONLINE_BOSS_CONFIG, WORLD_IDS, WORLD_CONFIGS } from './constants';
import { getDistance } from './math';

export function calculateFinalStats(
    baseStats: CharacterData['stats'], 
    equipment: Record<ItemSlot, Item | null>, 
    position?: Vector2D, 
    isOnline: boolean = false,
    currentWorldId: string = WORLD_IDS.WORLD_1
): CharacterData['stats'] & { maxInventorySlots: number } {
    // Explicitly initialize all fields to ensure they are numbers
    const final: CharacterData['stats'] & { maxInventorySlots: number } = { 
        maxHealth: baseStats.maxHealth ?? GAME_CONFIG.PLAYER_HEALTH,
        health: baseStats.health ?? GAME_CONFIG.PLAYER_HEALTH,
        damage: baseStats.damage ?? GAME_CONFIG.PLAYER_DAMAGE,
        speed: baseStats.speed ?? GAME_CONFIG.PLAYER_SPEED,
        healthRegen: baseStats.healthRegen ?? GAME_CONFIG.PLAYER_HEALTH_REGEN,
        itemFind: baseStats.itemFind ?? 0,
        bossDamageMultiplier: baseStats.bossDamageMultiplier ?? 1,
        maxInventorySlots: 0,
    };
    
    // Sum up equipment stats
    Object.values(equipment).forEach(item => {
        if (item && item.stats) {
            final.maxHealth += item.stats.maxHealth ?? 0;
            final.damage += item.stats.damage ?? 0;
            final.speed += item.stats.speed ?? 0;
            final.healthRegen += item.stats.healthRegen ?? 0;
            final.maxInventorySlots += item.stats.maxInventorySlots ?? 0;
            final.itemFind += item.stats.itemFind ?? 0;
            final.bossDamageMultiplier += item.stats.bossDamageMultiplier ?? 0;
        }
    });

    // SET BONUS CHECK: Mythic Accessory + Mythic Bag
    const hasMythicAccessory = equipment[ItemSlot.Accessory]?.rarity === ItemRarity.Mythic;
    const hasMythicBag = equipment[ItemSlot.Bag]?.rarity === ItemRarity.Mythic;
    
    if (hasMythicAccessory && hasMythicBag) {
        final.damage = Math.floor(final.damage * 1.5);
    }

    // BOSS ZONE CHECK
    if (position) {
        let inBossZone = false;
        for (const zone of BOSS_ZONES) {
             if (getDistance(position, {x: zone.x, y: zone.y}) < BOSS_CONFIG.ZONE_RADIUS) {
                 inBossZone = true;
                 break;
             }
        }

        // Apply Boss Zone Item Find Bonus
        if (inBossZone) {
            let bonus = isOnline ? ONLINE_BOSS_CONFIG.ITEM_FIND_BONUS : BOSS_CONFIG.BOSS_ITEM_FIND_BONUS;
            let cap = isOnline ? ONLINE_BOSS_CONFIG.ITEM_FIND_CAP : 10.0;

            // World 2 Overrides
            if (currentWorldId === WORLD_IDS.WORLD_2) {
                const w2Config = WORLD_CONFIGS[WORLD_IDS.WORLD_2];
                if (w2Config) {
                    bonus = w2Config.bossItemFindValue;
                    cap = w2Config.itemFindCap;
                }
            }

            final.itemFind = (final.itemFind ?? 0) + bonus;
            
            if (final.itemFind > cap) {
                final.itemFind = cap;
            }
        }
    }

    return final;
}