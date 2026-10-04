import { Enemy } from './entities/Enemy';
import { getDistance } from './math';
import {
    GAME_CONFIG, WORLD_CENTER, WORLD_IDS, BOSS_CONFIG, BOSS_ZONES,
    ENEMY_TYPES, GROVE_ENEMIES, INTEREST_ZONES,
} from './constants';

const randomItem = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

// Regular world 1 enemies, excluding the special mobs that only spawn inside interest zones
const WORLD_1_ENEMY_TYPES = Object.keys(ENEMY_TYPES).filter(k => !INTEREST_ZONES.some(z => z.mobTypes.includes(k)));
const WORLD_2_ENEMY_TYPES = Object.keys(GROVE_ENEMIES);

/**
 * Creates a pack of enemies at a random spot in the world, away from the safe zone and boss zones.
 * Enemy level scales with distance from the world center; packs inside an interest zone use
 * that zone's special mob type and are tougher.
 */
export function createEnemyPack(worldId: string): Enemy[] {
    let packCenter: { x: number; y: number } | null = null;

    for (let attempt = 0; attempt < 15 && !packCenter; attempt++) {
        const candidate = {
            x: Math.random() * (GAME_CONFIG.WORLD_WIDTH - 200) + 100,
            y: Math.random() * (GAME_CONFIG.WORLD_HEIGHT - 200) + 100,
        };
        if (getDistance(candidate, WORLD_CENTER) < GAME_CONFIG.SAFE_ZONE_RADIUS + GAME_CONFIG.ENEMY_SPAWN_BUFFER) continue;
        if (BOSS_ZONES.some(zone => getDistance(candidate, zone) < BOSS_CONFIG.ZONE_RADIUS + 100)) continue;
        packCenter = candidate;
    }
    if (!packCenter) return [];

    // Level scaling based on distance from the safe zone
    const distFromCenter = getDistance(packCenter, WORLD_CENTER);
    const progress = Math.max(0, (distFromCenter - GAME_CONFIG.SAFE_ZONE_RADIUS) / (GAME_CONFIG.WORLD_WIDTH / 2 - GAME_CONFIG.SAFE_ZONE_RADIUS));
    let level = Math.min(GAME_CONFIG.MAX_LEVEL, Math.max(1, Math.floor(1 + progress * (GAME_CONFIG.MAX_LEVEL - 1))));

    let typeId: string;
    const center = packCenter;
    const interestZone = INTEREST_ZONES.find(z => getDistance(center, z) < z.radius);
    if (interestZone && interestZone.mobTypes.length > 0) {
        typeId = randomItem(interestZone.mobTypes);
        level = Math.min(GAME_CONFIG.MAX_LEVEL + 5, Math.ceil(level * interestZone.difficultyMultiplier));
    } else {
        typeId = randomItem(worldId === WORLD_IDS.WORLD_2 ? WORLD_2_ENEMY_TYPES : WORLD_1_ENEMY_TYPES);
    }

    const packSize = GAME_CONFIG.ENEMY_PACK_SIZE_MIN
        + Math.floor(Math.random() * (GAME_CONFIG.ENEMY_PACK_SIZE_MAX - GAME_CONFIG.ENEMY_PACK_SIZE_MIN + 1));
    const spread = GAME_CONFIG.ENEMY_PACK_RADIUS * 2;

    const pack: Enemy[] = [];
    for (let i = 0; i < packSize; i++) {
        const position = {
            x: center.x + (Math.random() - 0.5) * spread,
            y: center.y + (Math.random() - 0.5) * spread,
        };
        pack.push(new Enemy(position, level, undefined, `mob_${Date.now()}_${Math.random()}`, typeId));
    }
    return pack;
}

/**
 * Spawns a boss in a random unoccupied boss zone, or returns null if the
 * maximum number of bosses is already alive.
 */
export function createBoss(worldId: string, existingEnemies: Enemy[]): Enemy | null {
    const activeBosses = existingEnemies.filter(e => e.isBoss && !e.isDead);
    if (activeBosses.length >= BOSS_CONFIG.MAX_ACTIVE_BOSSES) return null;

    const occupiedZones = new Set(activeBosses.map(e => e.bossZoneId));
    const availableZones = BOSS_ZONES.filter(z => !occupiedZones.has(z.id));
    if (availableZones.length === 0) return null;

    const zone = randomItem(availableZones);
    // World 2 bosses share zone ids with world 1 but have their own stat blocks
    const typeId = worldId === WORLD_IDS.WORLD_2 ? `grove_${zone.id}` : zone.id;
    return new Enemy({ x: zone.x, y: zone.y }, GAME_CONFIG.MAX_LEVEL, zone.id, `boss_${Date.now()}`, typeId);
}
