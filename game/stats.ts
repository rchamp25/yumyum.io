import { CharacterData, ItemSlot, Item, ItemRarity, Vector2D } from './types';
import { GAME_CONFIG, BOSS_ZONES, BOSS_CONFIG, WORLD_IDS, WORLD_CONFIGS } from './constants';
import { getDistance } from './math';

export function isInBossZone(position: Vector2D): boolean {
    return BOSS_ZONES.some(zone => getDistance(position, zone) < BOSS_CONFIG.ZONE_RADIUS);
}

export function calculateFinalStats(
    baseStats: CharacterData['stats'],
    equipment: Record<ItemSlot, Item | null>,
    position?: Vector2D,
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

    // Boss zones grant a flat item find bonus, capped per world
    if (position && isInBossZone(position)) {
        const world = WORLD_CONFIGS[currentWorldId] || WORLD_CONFIGS[WORLD_IDS.WORLD_1];
        final.itemFind = Math.min(final.itemFind + world.bossItemFindBonus, world.bossItemFindCap);
    }

    return final;
}
