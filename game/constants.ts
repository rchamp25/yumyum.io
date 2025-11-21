
import { ItemRarity, WaypointData, EnemyType } from './types';

export const GAME_CONFIG = {
    WORLD_WIDTH: 6000,
    WORLD_HEIGHT: 6000,
    MAX_LEVEL: 45,
    PLAYER_HEALTH: 100,
    PLAYER_DAMAGE: 5,
    PLAYER_SPEED: 4,
    PLAYER_HEALTH_REGEN: 2, // HP per second
    PLAYER_ITEM_FIND: 0, // Base Item Find %
    PLAYER_RADIUS: 20,
    DEFAULT_INVENTORY_SIZE: 50,
    SAFE_ZONE_RADIUS: 250,
    MAX_ENEMIES: 350, // Increased for larger map
    ENEMY_SPAWN_BUFFER: 100, // Distance from safe zone edge
    ENEMY_PACK_SIZE_MIN: 3,
    ENEMY_PACK_SIZE_MAX: 5,
    ENEMY_PACK_RADIUS: 75,
    ENEMY_AGGRO_RANGE: 90, // Halved from 180
    ENEMY_LEASH_RANGE: 300, // Halved from 600
    BOSS_AGGRO_RANGE: 180, // Kept original
    BOSS_LEASH_RANGE: 600, // Kept original
};

export const WORLD_IDS = {
    WORLD_1: 'world_1',
    WORLD_2: 'world_2'
};

export const WORLD_CONFIGS = {
    [WORLD_IDS.WORLD_1]: {
        name: "The Rat",
        bgColor: '#1a202c', // Gray 900
        gridColor: '#2d3748', // Gray 700
        itemFindCap: 15.0, // 1500%
        bossItemFindBonus: 5.0, // 500%
    },
    [WORLD_IDS.WORLD_2]: {
        name: "The Grove",
        bgColor: '#052e16', // Dark Green (Emerald 950)
        gridColor: '#14532d', // Green 900
        itemFindCap: 20.0, // 2000%
        bossItemFindBonus: 3.0, // +300% ON TOP of World 1, effectively 800% base in logic? 
        // Wait, prompt says "add 300% more itemfind when in the boss ring than the world 1 bosses"
        // World 1 boss bonus is 5.0 (500%). So World 2 should be 8.0 (800%).
        bossItemFindValue: 8.0, 
    }
};

export const BOSS_CONFIG = {
    ZONE_RADIUS: 600,
    SPAWN_COOLDOWN: 180000, // 3 Minutes
    MAX_ACTIVE_BOSSES: 2, // Only 2 bosses alive at once
    BOSS_DROP_BONUS: 10, // Extra items dropped by bosses
    BOSS_ITEM_FIND_BONUS: 5.0, // +500% Item Find (Flat addition) - DEFAULT for World 1
};

export const ONLINE_BOSS_CONFIG = {
    HEALTH_MULTIPLIER: 15,
    DAMAGE_MULTIPLIER: 3,
    SIZE_MULTIPLIER: 2,
    DROP_COUNT_MULTIPLIER: 2,
    ITEM_FIND_BONUS: 8.0, // +800%
    ITEM_FIND_CAP: 15.0, // 1500%
};

export const BOSS_ZONES = [
    { id: 'boss_nw', x: 250, y: 250, name: "North West Zone" },
    { id: 'boss_ne', x: GAME_CONFIG.WORLD_WIDTH - 250, y: 250, name: "North East Zone" },
    { id: 'boss_sw', x: 250, y: GAME_CONFIG.WORLD_HEIGHT - 250, name: "South West Zone" },
    { id: 'boss_se', x: GAME_CONFIG.WORLD_WIDTH - 250, y: GAME_CONFIG.WORLD_HEIGHT - 250, name: "South East Zone" },
];

export const LOOT_CONFIG = {
    // Bonuses per player level
    LEVEL_RARITY_BONUS: 0.0001, // 0.01% per level. Level 45 = +0.45% chance for higher rarity
    LEVEL_DROP_RATE_BONUS: 0.001, // 0.1% per level. Level 45 = +4.5% equipment drop rate
    LEVEL_MATERIAL_DROP_RATE_BONUS: 0.002, // 0.2% per level. Level 45 = +9% material drop rate

    // Base Drop Rates
    EQUIPMENT_DROP_RATE: 0.10, // 10% base chance (Doubled from 5%)
    MATERIAL_DROP_RATE: 0.40, // 40% base chance (Doubled from 20%)
    MATERIAL_QUANTITY_MIN: 1,
    MATERIAL_QUANTITY_MAX: 2,

    // Rarity Thresholds for Equipment (Checked against Math.random())
    RARITY_CHANCES: {
        [ItemRarity.Legendary]: 0.0005, // 0.05% Base (Reduced from 0.2%)
        [ItemRarity.Epic]: 0.005,       // 0.5% Base (Reduced from 2%)
        [ItemRarity.Rare]: 0.04,        // 4% Base (Reduced from 10%)
        [ItemRarity.Uncommon]: 0.15,    // 15% Base (Reduced from 30%)
        [ItemRarity.Common]: 1.0,      // Fallback
    },

    // Level Requirements for Mobs to drop specific rarities
    RARITY_LEVEL_REQUIREMENTS: {
        [ItemRarity.Legendary]: 30, // Mobs must be lvl 30+
        [ItemRarity.Epic]: 15,      // Mobs must be lvl 15+
        [ItemRarity.Rare]: 5,       // Mobs must be lvl 5+
        [ItemRarity.Uncommon]: 1,
        [ItemRarity.Common]: 1,
    },

    // Rarity Thresholds for Materials
    MATERIAL_RARITY_THRESHOLDS: {
        LEGENDARY: 0.002, // 0.2%
        EPIC: 0.02,       // 2%
        RARE: 0.10,       // 10%
        UNCOMMON: 0.30,   // 30%
    }
};

export const LEVEL_XP_REQUIREMENTS: { [level: number]: number } = {};

// Generate XP Curve
// Strategy: Fast 1-10, Moderate 11-30, Steep 31-45
let previousReq = 0;
for (let i = 1; i <= GAME_CONFIG.MAX_LEVEL; i++) {
    let xpNeeded;
    
    if (i <= 10) {
        // Levels 1-10: Very fast
        xpNeeded = Math.floor(50 * Math.pow(i, 1.5)); 
    } else if (i <= 30) {
        // Levels 11-30: Moderate curve
        xpNeeded = Math.floor(previousReq * 1.2) + 500;
    } else {
        // Levels 31-45: Steep curve (Grindy)
        xpNeeded = Math.floor(previousReq * 1.35) + 5000;
    }

    LEVEL_XP_REQUIREMENTS[i] = xpNeeded;
    previousReq = xpNeeded;
}

const WC = GAME_CONFIG.WORLD_WIDTH / 2;
const HC = GAME_CONFIG.WORLD_HEIGHT / 2;

export const WAYPOINTS: WaypointData[] = [
    // Center
    { id: 'wp_spawn', name: 'Village Center', position: { x: WC, y: HC } },
    
    // Cardinals
    { id: 'wp_north', name: 'Northern Citadel', position: { x: WC, y: 400 } },
    { id: 'wp_south', name: 'Southern Necropolis', position: { x: WC, y: GAME_CONFIG.WORLD_HEIGHT - 400 } },
    { id: 'wp_east', name: 'Eastern Glade', position: { x: GAME_CONFIG.WORLD_WIDTH - 400, y: HC } },
    { id: 'wp_west', name: 'Western Harbor', position: { x: 400, y: HC } },
    
    // Diagonals (New Regions)
    { id: 'wp_nw', name: 'Frozen Peaks', position: { x: 800, y: 800 } },
    { id: 'wp_ne', name: 'Burning Steppes', position: { x: GAME_CONFIG.WORLD_WIDTH - 800, y: 800 } },
    { id: 'wp_sw', name: 'Toxic Bog', position: { x: 800, y: GAME_CONFIG.WORLD_HEIGHT - 800 } },
    { id: 'wp_se', name: 'Crystal Caverns', position: { x: GAME_CONFIG.WORLD_WIDTH - 800, y: GAME_CONFIG.WORLD_HEIGHT - 800 } },
];

// --- ENEMIES ---

export const ENEMY_TYPES: { [key: string]: EnemyType } = {
    'slime': { 
        name: 'Slime', 
        radius: 15, 
        healthMultiplier: 0.8, 
        damageMultiplier: 0.8, 
        speed: 2, 
        color: '#4ade80', // Light Green
        attackRange: 20, 
        attackCooldown: 1500, 
        attackType: 'melee' 
    },
    'goblin': { 
        name: 'Goblin', 
        radius: 16, 
        healthMultiplier: 0.7, 
        damageMultiplier: 0.9, 
        speed: 3.5, // Very Fast
        color: '#84cc16', // Lime
        attackRange: 22, 
        attackCooldown: 800, // Fast attacks
        attackType: 'melee' 
    },
    'orc': { 
        name: 'Orc', 
        radius: 28, 
        healthMultiplier: 2.5, // Tanky
        damageMultiplier: 1.8, // High Damage
        speed: 1.8, // Slow
        color: '#14532d', // Dark Green
        attackRange: 45, 
        attackCooldown: 2500, // Slow attacks
        attackType: 'melee' 
    },
    'skeleton': { 
        name: 'Skeleton', 
        radius: 20, 
        healthMultiplier: 1.2, 
        damageMultiplier: 1.2, 
        speed: 2.6, 
        color: '#e5e7eb', // Gray/Bone
        attackRange: 25, 
        attackCooldown: 1400, 
        attackType: 'melee' 
    },
};

export const GROVE_ENEMIES: { [key: string]: EnemyType } = {
    'wolf': { 
        name: 'Dire Wolf', 
        radius: 20, 
        healthMultiplier: 2.0, 
        damageMultiplier: 3.0, 
        speed: 4.5, // Very Fast
        color: '#71717a', // Zinc
        attackRange: 30, 
        attackCooldown: 600, 
        attackType: 'melee' 
    },
    'treant': { 
        name: 'Rotting Treant', 
        radius: 35, 
        healthMultiplier: 5.0, 
        damageMultiplier: 4.0, 
        speed: 1.5, // Slow
        color: '#3f6212', // Dark Olive
        attackRange: 50, 
        attackCooldown: 2000, 
        attackType: 'melee' 
    },
    'bear': { 
        name: 'Corrupted Bear', 
        radius: 30, 
        healthMultiplier: 4.0, 
        damageMultiplier: 5.0, 
        speed: 3.0, 
        color: '#451a03', // Dark Brown
        attackRange: 40, 
        attackCooldown: 1500, 
        attackType: 'melee' 
    },
    'dryad': { 
        name: 'Vengeful Dryad', 
        radius: 18, 
        healthMultiplier: 2.5, 
        damageMultiplier: 4.0, 
        speed: 3.5, 
        color: '#86efac', // Light Green
        attackRange: 300, 
        attackCooldown: 1000, 
        attackType: 'ranged' 
    },
};

export const BOSS_TYPES: { [key: string]: EnemyType } = {
    // World 1 Bosses
    'boss_nw': { 
        name: 'Titan of the Deep',
        radius: 70,
        healthMultiplier: 80, 
        damageMultiplier: 9.0, 
        speed: 2.5,
        color: '#0ea5e9', 
        attackRange: 90,
        attackCooldown: 2000,
        attackType: 'melee'
    },
    'boss_ne': { 
        name: 'Infernal Warlord',
        radius: 60,
        healthMultiplier: 70,
        damageMultiplier: 12.0,
        speed: 3.0,
        color: '#dc2626', 
        attackRange: 80,
        attackCooldown: 1500,
        attackType: 'melee'
    },
    'boss_sw': { 
        name: 'Broodmother',
        radius: 65,
        healthMultiplier: 60,
        damageMultiplier: 7.5,
        speed: 3.5,
        color: '#a3e635', 
        attackRange: 400,
        attackCooldown: 1200,
        attackType: 'ranged'
    },
    'boss_se': { 
        name: 'Void Weaver',
        radius: 55,
        healthMultiplier: 65,
        damageMultiplier: 15.0, 
        speed: 2.0,
        color: '#7c3aed', 
        attackRange: 500,
        attackCooldown: 2000,
        attackType: 'ranged'
    }
};

// World 2 Bosses - UPDATED KEYS TO BE UNIQUE
export const GROVE_BOSSES: { [key: string]: EnemyType } = {
    'grove_boss_nw': { 
        name: 'Elder Barkskin',
        radius: 80,
        healthMultiplier: 80 * 20, // 20x World 1
        damageMultiplier: 9.0, 
        speed: 2.0,
        color: '#365314', 
        attackRange: 100,
        attackCooldown: 2500,
        attackType: 'melee'
    },
    'grove_boss_ne': { 
        name: 'Alpha Warg',
        radius: 65,
        healthMultiplier: 70 * 20,
        damageMultiplier: 12.0,
        speed: 5.0,
        color: '#52525b', 
        attackRange: 90,
        attackCooldown: 800,
        attackType: 'melee'
    },
    'grove_boss_sw': { 
        name: 'Spore Queen',
        radius: 75,
        healthMultiplier: 60 * 20,
        damageMultiplier: 7.5,
        speed: 3.0,
        color: '#16a34a', 
        attackRange: 450,
        attackCooldown: 1200,
        attackType: 'ranged'
    },
    'grove_boss_se': { 
        name: 'Corrupted Druid',
        radius: 60,
        healthMultiplier: 65 * 20,
        damageMultiplier: 15.0, 
        speed: 3.5,
        color: '#14532d', 
        attackRange: 600,
        attackCooldown: 1800,
        attackType: 'ranged'
    }
};
