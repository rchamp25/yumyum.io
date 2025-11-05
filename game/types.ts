// Forward-declare entity classes for GameContext
// FIX: Added import for Character to resolve type error in SkillDefinition.
import { Character } from './entities/Character';
import { Player } from './entities/Player';
import { Enemy } from './entities/Enemy';
import { Projectile } from './entities/Projectile';
import { FloatingText } from './entities/FloatingText';
import { VisualEffect } from './entities/VisualEffect';
import { GroundEffect } from './entities/GroundEffect';
// FIX: Removed circular dependency import of Item.
// import { Item } from './items';


export interface Vector2D {
  x: number;
  y: number;
}

export enum CharacterClass {
  Warrior,
  Mage,
  Archer,
}

export interface GameStats {
  level: number;
  kills: number;
  gold: number;
}

export interface CharacterStats {
    // FIX: Added health to correctly store current health when saving character data.
    health?: number;
    maxHealth: number;
    damage: number;
    speed: number;
}

export interface CharacterData extends GameStats {
  id: string;
  name: string;
  characterClass: CharacterClass;
  xp: number;
  stats: CharacterStats;
  inventory: (Item | null)[];
  equipment: Record<ItemSlot, Item | null>;
}

export enum ItemSlot {
    Weapon = 'Weapon',
    Armor = 'Armor',
    Boots = 'Boots',
    Accessory = 'Accessory',
}

export enum ItemRarity {
    Common,
    Uncommon,
    Rare,
    Epic,
    Legendary,
}

export interface Item {
    id: string;
    name: string;
    type: 'Equipment' | 'Material';
    slot?: ItemSlot;
    rarity: ItemRarity;
    stats?: Partial<CharacterStats>;
    description?: string;
    icon: string;
    stackable?: boolean;
    quantity?: number;
    levelReq?: number;
}

// FIX: Expanded StatusEffect to include buffs for more complex skills.
export interface StatusEffect {
  type: 'stun' | 'slow' | 'dot' | 'shield' | 'damage_buff' | 'attack_speed_buff';
  duration: number;
  startTime: number;
  damagePerTick?: number;
  shieldHealth?: number;
  multiplier?: number; // For buffs
}

export enum EnemyType {
  Grunt,
  Scout,
  Ranger,
  Tank,
}

export interface GameContext {
    addProjectile: (projectile: Projectile) => void;
    addFloatingText: (text: FloatingText) => void;
    addVisualEffect: (effect: VisualEffect) => void;
    addGroundEffect: (effect: GroundEffect) => void;
    addDroppedItem: (item: Item, position: Vector2D) => void;
    spawnEnemy: () => void;
    player: Player;
    enemies: Enemy[];
    projectiles: Projectile[];
}

export interface SkillDefinition {
    id: string;
    name: string;
    description: string;
    cooldown: number;
    requiresTarget?: boolean;
    range?: number;
    effect: (caster: Player, target: Vector2D | Character, game: GameContext) => void;
}

export interface SkillState {
    definition: SkillDefinition;
    lastUsed: number;
}

export interface Recipe {
    id: string;
    result: Item;
    ingredients: { materialId: string, quantity: number }[];
}

export enum NPCType {
    QuestGiver,
    Vendor,
    Crafter,
}