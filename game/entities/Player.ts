import { Character } from './Character';
import { Vector2D, CharacterData, CharacterStats, Item, ItemSlot, SkillState, GameStats, CharacterClass, DeathEvent } from '../types';
import { getSkillsForClass } from '../skills';
import { GAME_CONFIG } from '../constants';
import { findNearestEnemy } from '../utils';
import { Enemy } from './Enemy';
import { FloatingText } from './FloatingText';

export class Player extends Character {
    name: string;
    characterClass: CharacterClass;
    level: number;
    xp: number;
    gold: number;
    kills: number;

    baseStats: CharacterStats;
    equipment: Record<ItemSlot, Item | null>;
    inventory: (Item | null)[];
    skills: SkillState[];
    speed: number;

    totalDamageTaken: number = 0;
    lastHitBy: { name: string } | null = null;
    deathLog: DeathEvent[] = [];

    lastCombatTime: number = 0;
    isInCombat: boolean = false;
    lastRegenTime: number = 0;

    private readonly COMBAT_TIMEOUT = 5000; // 5 seconds
    private readonly REGEN_INTERVAL_OOC = 1000; // 1 second
    private readonly REGEN_AMOUNT_OOC = 5;
    private readonly REGEN_INTERVAL_COMBAT = 5000; // 5 seconds
    private readonly REGEN_AMOUNT_COMBAT = 10;


    constructor(data: CharacterData) {
        super(data.position || { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 }, GAME_CONFIG.PLAYER_RADIUS, data.stats.maxHealth, '#4ade80', data.stats.damage);
        this.id = data.id;
        this.name = data.name;
        this.characterClass = data.characterClass;
        this.level = data.level;
        this.xp = data.xp;
        this.gold = data.gold;
        this.kills = data.kills;
        
        this.baseStats = data.stats;
        this.health = data.stats.health ?? data.stats.maxHealth;
        this.inventory = data.inventory;
        this.equipment = data.equipment;
        this.speed = data.stats.speed;

        if (data.skills) {
            // Re-link skill definitions in case they were not fully serialized
            this.skills = getSkillsForClass(this.characterClass).map((def, i) => ({
                definition: def,
                lastUsed: data.skills![i]?.lastUsed || 0,
            }));
        } else {
            this.skills = getSkillsForClass(this.characterClass).map(def => ({
                definition: def,
                lastUsed: 0,
            }));
        }
        this.recalculateStats();
    }

    enterCombat() {
        this.isInCombat = true;
        this.lastCombatTime = Date.now();
    }

    update(pressedKeys: Set<string>, mousePosition: Vector2D, worldWidth: number, worldHeight: number) {
        this.processStatusEffects();
        if (this.isDead) return;

        // Combat timeout check
        if (this.isInCombat && Date.now() - this.lastCombatTime > this.COMBAT_TIMEOUT) {
            this.isInCombat = false;
        }

        // HP Regeneration
        if (this.health < this.maxHealth) {
            const now = Date.now();
            const interval = this.isInCombat ? this.REGEN_INTERVAL_COMBAT : this.REGEN_INTERVAL_OOC;
            const amount = this.isInCombat ? this.REGEN_AMOUNT_COMBAT : this.REGEN_AMOUNT_OOC;

            // Initialize lastRegenTime on first update if needed
            if (this.lastRegenTime === 0) this.lastRegenTime = now;

            if (now - this.lastRegenTime >= interval) {
                this.health = Math.min(this.maxHealth, this.health + amount);
                this.lastRegenTime = now;
            }
        }

        let moveX = 0;
        let moveY = 0;
        if (pressedKeys.has('w')) moveY -= 1;
        if (pressedKeys.has('s')) moveY += 1;
        if (pressedKeys.has('a')) moveX -= 1;
        if (pressedKeys.has('d')) moveX += 1;

        if (moveX !== 0 || moveY !== 0) {
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            const currentSpeed = this.speed * (this.hasStatus('slow') ? 0.5 : 1);
            this.position.x += (moveX / length) * currentSpeed;
            this.position.y += (moveY / length) * currentSpeed;
        }

        // Clamp position to world bounds
        this.position.x = Math.max(this.radius, Math.min(worldWidth - this.radius, this.position.x));
        this.position.y = Math.max(this.radius, Math.min(worldHeight - this.radius, this.position.y));
    }

    logEvent(message: string) {
        this.deathLog.push({ timestamp: Date.now(), message });
        if (this.deathLog.length > 5) {
            this.deathLog.shift(); // Keep the log at a max of 5 entries
        }
    }
    
    takeDamage(amount: number, source?: { name: string }): FloatingText | null {
        const result = super.takeDamage(amount, source);
        if (result && amount > 0) {
            this.enterCombat();
            this.totalDamageTaken += amount;
            if (source) {
                this.lastHitBy = source;
                // Only log significant damage events
                if (amount > this.maxHealth * 0.1) {
                    this.logEvent(`Took ${Math.round(amount)} damage from ${source.name}`);
                }
            }
        }
        return result;
    }
    
    recalculateStats() {
        const finalStats = this.getFinalStats();
        this.maxHealth = finalStats.maxHealth;
        this.damage = finalStats.damage;
        this.speed = finalStats.speed;
        
        // Don't let health exceed new max health
        if (this.health > this.maxHealth) {
            this.health = this.maxHealth;
        }
    }

    getFinalStats(): CharacterStats {
        const finalStats: CharacterStats = { maxHealth: this.baseStats.maxHealth, damage: this.baseStats.damage, speed: this.baseStats.speed };
        Object.values(this.equipment).forEach(item => {
            if (item && item.stats) {
                for (const [stat, value] of Object.entries(item.stats)) {
                    if (value) {
                         (finalStats as any)[stat] = ((finalStats as any)[stat] || 0) + value;
                    }
                }
            }
        });
        return finalStats;
    }

    addXp(amount: number) {
        if (this.level >= GAME_CONFIG.MAX_LEVEL) {
            this.xp = 0;
            return;
        }

        this.xp += amount;
        let xpForNextLevel = GAME_CONFIG.BASE_XP_TO_NEXT_LEVEL * Math.pow(GAME_CONFIG.XP_PER_LEVEL_MULTIPLIER, this.level - 1);
        
        while (this.xp >= xpForNextLevel && this.level < GAME_CONFIG.MAX_LEVEL) {
            this.levelUp(xpForNextLevel);
            if (this.level < GAME_CONFIG.MAX_LEVEL) {
                xpForNextLevel = GAME_CONFIG.BASE_XP_TO_NEXT_LEVEL * Math.pow(GAME_CONFIG.XP_PER_LEVEL_MULTIPLIER, this.level - 1);
            }
        }

        if (this.level >= GAME_CONFIG.MAX_LEVEL) {
            this.xp = 0;
        }
    }
    
    levelUp(xpUsed: number) {
        this.xp -= xpUsed;
        this.level++;
        this.baseStats.maxHealth += 10;
        this.baseStats.damage += 2;
        this.recalculateStats();
        this.health = this.maxHealth; // Full heal on level up
        this.logEvent(`Reached Level ${this.level}!`);
    }
    
    getGameStats(): GameStats {
        return {
            level: this.level,
            kills: this.kills,
            gold: this.gold,
            totalDamageTaken: Math.round(this.totalDamageTaken),
            killerName: this.lastHitBy?.name || 'The Environment',
            deathLog: this.deathLog,
        };
    }

    respawn() {
        this.health = this.maxHealth;
        this.position = { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 };
        this.isDead = false;
        this.statusEffects = [];
        this.shield = 0;
        this.deathLog = [];
        this.totalDamageTaken = 0;
        this.lastHitBy = null;
        this.isInCombat = false;
    }

    toCharacterData(): CharacterData {
        return {
            id: this.id as string,
            name: this.name,
            characterClass: this.characterClass,
            level: this.level,
            xp: this.xp,
            gold: this.gold,
            kills: this.kills,
            position: this.position,
            stats: {
                ...this.baseStats,
                health: this.health, // Save current health
            },
            inventory: this.inventory,
            equipment: this.equipment,
            skills: this.skills.map(s => ({ definition: { id: s.definition.id } as any, lastUsed: s.lastUsed })),
        };
    }

    findNearestEnemy(enemies: Enemy[], maxRange?: number): Enemy | null {
        return findNearestEnemy(this.position, enemies, maxRange);
    }
}
