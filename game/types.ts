
export interface Vector2D {
  x: number;
  y: number;
}

export enum CharacterClass {
  Warrior,
  Mage,
  Archer,
}

export enum EnemyType {
  Grunt,
  Scout,
  Ranger,
  Tank,
}

export interface GameStats {
  level: number;
  kills: number;
  gold: number;
}

export interface StatBonus {
  maxHealth?: number;
  damage?: number;
  speed?: number;
  armor?: number;
  critChance?: number;
  critDamage?: number;
}

export interface Stats {
  maxHealth: number;
  health: number;
  damage: number;
  speed: number;
  armor?: number;
  critChance?: number;
  critDamage?: number;
}

export enum ItemRarity {
    Common = 'Common',
    Uncommon = 'Uncommon',
    Rare = 'Rare',
    Epic = 'Epic',
    Legendary = 'Legendary'
}

export enum ItemSlot {
    Weapon = 'Weapon',
    Armor = 'Armor',
    Boots = 'Boots',
    Accessory = 'Accessory'
}

export interface Item {
    id: string;
    name: string;
    description: string;
    rarity: ItemRarity;
    slot: ItemSlot;
    icon: string; // Placeholder for an icon identifier
    bonuses: StatBonus;
    levelRequirement: number;
}

export interface CharacterData {
  id: string;
  name: string;
  characterClass: CharacterClass;
  level: number;
  xp: number;
  gold: number;
  kills: number;
  stats: Stats;
  inventory: (Item | null)[];
  equipment: Record<ItemSlot, Item | null>;
}

export interface StatusEffect {
  type: 'stun' | 'slow' | 'dot' | 'shield';
  duration: number;
  startTime: number;
  damagePerTick?: number;
  shieldHealth?: number;
}

export interface SkillDefinition {
  name: string;
  description: string;
  cooldown: number;
  execute: (player: any, game: GameContext) => void; // Using 'any' to avoid circular dependency on Player class
}

export interface SkillState {
  definition: SkillDefinition;
  lastUsed: number;
}

export interface GameContext {
    player: any;
    enemies: any[];
    projectiles: any[];
    addProjectile: (p: any) => void;
    addFloatingText: (ft: any) => void;
    addVisualEffect: (ve: any) => void;
    addGroundEffect: (ge: any) => void;
}
