
import type { Player } from './entities/Player';
import type { Enemy } from './entities/Enemy';
import type { Projectile } from './entities/Projectile';
import type { FloatingText } from './entities/FloatingText';
import type { VisualEffect } from './entities/VisualEffect';
import type { GroundEffect } from './entities/GroundEffect';

export interface Vector2D {
  x: number;
  y: number;
}

export enum CharacterClass {
  Warrior,
  Mage,
  Archer,
}

export enum ItemSlot {
  Weapon = 'Weapon',
  Armor = 'Armor',
  Boots = 'Boots',
  Accessory = 'Accessory',
  Bag = 'Bag',
}

export enum ItemRarity {
  Common,
  Uncommon,
  Rare,
  Epic,
  Legendary,
  Mythic,
}

export interface ItemStats {
  damage?: number;
  maxHealth?: number;
  speed?: number;
  healthRegen?: number;
  maxInventorySlots?: number;
  itemFind?: number; // Percentage as decimal (0.5 = 50%)
  bossDamageMultiplier?: number; // Additional multiplier (1 = +100%)
}

export interface Item {
  id: string;
  name: string;
  type: 'Equipment' | 'Material';
  slot?: ItemSlot;
  rarity: ItemRarity;
  stats?: ItemStats;
  description?: string;
  sellPrice: number;
  quantity?: number;
  locked?: boolean;
}

export interface CharacterData {
  id: string;
  name: string;
  characterClass: CharacterClass;
  level: number;
  xp: number;
  gold: number;
  kills: number;
  stats: {
    maxHealth: number;
    health: number;
    damage: number;
    speed: number;
    healthRegen: number;
    itemFind: number;
    bossDamageMultiplier: number;
  };
  inventory: (Item | null)[];
  equipment: Record<ItemSlot, Item | null>;
  position?: Vector2D; // For online mode
  discoveredWaypoints?: string[];
  hasClaimedDevRewards?: boolean; // Tracks if dev mode items have been granted
}

export interface DeathLogEvent {
    message: string;
}

export interface GameStats {
  killerName: string;
  level: number;
  kills: number;
  gold: number;
  totalDamageTaken: number;
  deathLog: DeathLogEvent[];
}

export interface StatusEffect {
    type: 'slow' | 'stun' | 'dot' | 'shield' | 'whirlwind_active' | 'haste' | 'empowered';
    duration: number;
    startTime: number;
    lastTick?: number;
    // Optional properties for specific effects
    slowFactor?: number;
    damagePerTick?: number;
    shieldHealth?: number;
    speedMultiplier?: number;
    damageMultiplier?: number;
}

export interface SkillDefinition {
    name: string;
    description: string;
    cooldown: number; // in ms
    unlockLevel: number;
    use: (player: Player, game: GameContext) => void;
}

export interface SkillState {
    definition: SkillDefinition;
    lastUsed: number;
}

export interface GameContext {
    player: Player;
    enemies: Enemy[];
    addProjectile: (projectile: Projectile) => void;
    addFloatingText: (text: FloatingText) => void;
    addVisualEffect: (effect: VisualEffect) => void;
    addGroundEffect: (effect: GroundEffect) => void;
    playSound: (type: 'attack' | 'damage' | 'hit' | 'level_up' | 'boss_spawn') => void;
    isOnlineMode: boolean;
}

export interface Recipe {
    id: string;
    result: Item;
    ingredients: { materialId: string; quantity: number }[];
}

export enum NPCType {
    QuestGiver,
    Vendor,
    Crafter,
    Seller, // Renamed from MaterialVendor
    WorldTraveler,
}

export interface WaypointData {
    id: string;
    name: string;
    position: Vector2D;
}

export interface ServerEnemy {
    id: string;
    position: Vector2D;
    spawnPosition?: Vector2D; // Added for tracking leash point
    health: number;
    maxHealth: number;
    level: number;
    isBoss: boolean;
    bossZoneId?: string;
    typeId: string; // Key for ENEMY_TYPES or BOSS_TYPES
    radius?: number; // Custom radius for online scaling
    damage?: number; // Custom damage for online scaling
}

export interface PartyMember {
    id: string; // Socket ID (or active ID)
    characterId: string; // Stable ID for reconnects
    name: string;
    level: number;
    characterClass: CharacterClass;
    health: number;
    maxHealth: number;
    isOnline: boolean;
}

export interface Party {
    id: string;
    leaderId: string;
    members: PartyMember[];
}

export interface TradeItem {
    item: Item;
    inventoryIndex: number;
}

export interface TradeOffer {
    gold: number;
    items: TradeItem[];
    isLocked: boolean;
}

export interface TradeSession {
    id: string;
    player1Id: string;
    player2Id: string;
    player1Name: string;
    player2Name: string;
    player1Offer: TradeOffer;
    player2Offer: TradeOffer;
}
