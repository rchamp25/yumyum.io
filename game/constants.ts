
import { ItemRarity, WaypointData } from './types';

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
    ENEMY_AGGRO_RANGE: 180, // How far an enemy can see the player (Reduced)
    ENEMY_LEASH_RANGE: 600, // How far from spawn an enemy will chase
};

export const BOSS_CONFIG = {
    ZONE_RADIUS: 600,
    SPAWN_COOLDOWN: 180000, // 3 Minutes
    MAX_ACTIVE_BOSSES: 2, // Only 2 bosses alive at once
    BOSS_DROP_BONUS: 10, // Extra items dropped by bosses
    BOSS_ITEM_FIND_BONUS: 5.0, // +500% Item Find (Flat addition)
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
    { id: 'boss_nw', x: 250, y: 250, name: "Frozen Peak" },
    { id: 'boss_ne', x: GAME_CONFIG.WORLD_WIDTH - 250, y: 250, name: "Burning Steppe" },
    { id: 'boss_sw', x: 250, y: GAME_CONFIG.WORLD_HEIGHT - 250, name: "Toxic Bog" },
    { id: 'boss_se', x: GAME_CONFIG.WORLD_WIDTH - 250, y: GAME_CONFIG.WORLD_HEIGHT - 250, name: "Crystal Cavern" },
];

export const LOOT_CONFIG = {
    // Bonuses per player level
    LEVEL_RARITY_BONUS: 0.0001, // 0.01% per level. Level 45 = +0.45% chance for higher rarity
    LEVEL_DROP_RATE_BONUS: 0.001, // 0.1% per level. Level 45 = +4.5% equipment drop rate
    LEVEL_MATERIAL_DROP_RATE_BONUS: 0.002, // 0.2% per level. Level 45 = +9% material drop rate

    // Base Drop Rates
    EQUIPMENT_DROP_RATE: 0.05, // 5% base chance (Reduced from 15%)
    MATERIAL_DROP_RATE: 0.20, // 20% base chance (Reduced from 50%)
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

    // Accumulate to make total XP needed for next level (optional, usually game stores "current level xp")
    // But here we are storing "XP needed to go from Current to Next"
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

export interface EnemyType {
    name: string;
    radius: number;
    healthMultiplier: number;
    damageMultiplier: number;
    speed: number;
    color: string;
    attackRange: number;
    attackCooldown: number;
    attackType: 'melee' | 'ranged';
}

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

export const BOSS_TYPES: { [key: string]: EnemyType } = {
    'boss_nw': { // Frozen Peak
        name: 'Titan of the Deep',
        radius: 70,
        healthMultiplier: 80, 
        damageMultiplier: 9.0, // Doubled from 4.5
        speed: 2.5,
        color: '#0ea5e9', // Sky Blue
        attackRange: 90,
        attackCooldown: 2000,
        attackType: 'melee'
    },
    'boss_ne': { // Burning Steppe
        name: 'Infernal Warlord',
        radius: 60,
        healthMultiplier: 70,
        damageMultiplier: 12.0, // Doubled from 6.0
        speed: 3.0,
        color: '#dc2626', // Red
        attackRange: 80,
        attackCooldown: 1500,
        attackType: 'melee'
    },
    'boss_sw': { // Toxic Bog
        name: 'Broodmother',
        radius: 65,
        healthMultiplier: 60,
        damageMultiplier: 7.5, // Doubled from 3.75
        speed: 3.5,
        color: '#a3e635', // Lime
        attackRange: 400,
        attackCooldown: 1200,
        attackType: 'ranged'
    },
    'boss_se': { // Crystal Cavern
        name: 'Void Weaver',
        radius: 55,
        healthMultiplier: 65,
        damageMultiplier: 15.0, // Doubled from 7.5
        speed: 2.0,
        color: '#7c3aed', // Violet
        attackRange: 500,
        attackCooldown: 2000,
        attackType: 'ranged'
    }
};
