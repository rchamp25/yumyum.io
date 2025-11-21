
import { CharacterData, ItemSlot, Item, ItemRarity, Vector2D } from './types';
import { GAME_CONFIG, BOSS_ZONES, BOSS_CONFIG, ONLINE_BOSS_CONFIG } from './constants';
import { getDistance } from './math';

export function calculateFinalStats(baseStats: CharacterData['stats'], equipment: Record<ItemSlot, Item | null>, position?: Vector2D, isOnline: boolean = false): CharacterData['stats'] & { maxInventorySlots: number } {
    const final = { ...baseStats, maxInventorySlots: 0 };
    
    // Default values if missing (for backward compatibility)
    if (final.healthRegen === undefined) final.healthRegen = GAME_CONFIG.PLAYER_HEALTH_REGEN;
    if (final.itemFind === undefined) final.itemFind = GAME_CONFIG.PLAYER_ITEM_FIND;
    if (final.bossDamageMultiplier === undefined) final.bossDamageMultiplier = 1;

    // Sum up equipment stats
    Object.values(equipment).forEach(item => {
        if (item && item.stats) {
            final.maxHealth += item.stats.maxHealth || 0;
            final.damage += item.stats.damage || 0;
            final.speed += item.stats.speed || 0;
            final.healthRegen += item.stats.healthRegen || 0;
            final.maxInventorySlots += item.stats.maxInventorySlots || 0;
            final.itemFind += item.stats.itemFind || 0;
            final.bossDamageMultiplier += item.stats.bossDamageMultiplier || 0;
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
            const bonus = isOnline ? ONLINE_BOSS_CONFIG.ITEM_FIND_BONUS : BOSS_CONFIG.BOSS_ITEM_FIND_BONUS;
            const cap = isOnline ? ONLINE_BOSS_CONFIG.ITEM_FIND_CAP : 10.0;

            final.itemFind = (final.itemFind || 0) + bonus;
            
            if (final.itemFind > cap) {
                final.itemFind = cap;
            }
        }
    }

    return final;
}
