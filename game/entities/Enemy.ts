
import { Character } from './Character';
import { Vector2D, GameContext, Item, ItemRarity } from '../types';
import { normalizeVector, getDistance } from '../utils';
import { DroppedItem } from './DroppedItem';
import { MATERIALS_DB, getRandomItem, ALL_EQUIPMENT } from '../items';
import { GAME_CONFIG, LOOT_CONFIG } from '../constants';
import { Projectile } from './Projectile';
import { FloatingText } from './FloatingText';
import { Player } from './Player';

interface EnemyType {
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

const ENEMY_TYPES: { [key: string]: EnemyType } = {
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

export class Enemy extends Character {
    name: string;
    xpValue: number;
    goldValue: number;
    type: EnemyType;
    lootDropped: boolean = false;
    
    private spawnPosition: Vector2D;
    private state: 'idle' | 'chasing' | 'attacking' | 'returning' = 'idle';
    private lastAttackTime: number = 0;
    private attackRange: number;
    private speed: number;

    // AI State properties
    private wanderTarget: Vector2D | null = null;
    private nextWanderTime: number = 0;

    constructor(position: Vector2D, level: number) {
        const typeKey = Object.keys(ENEMY_TYPES)[Math.floor(Math.random() * Object.keys(ENEMY_TYPES).length)];
        const type = ENEMY_TYPES[typeKey];

        const maxHealth = Math.floor(20 * type.healthMultiplier * (1 + level * 0.2));
        // Reduced damage to 1/4th of previous value (factor 0.75 replaces 3)
        const damage = Math.floor(0.75 * type.damageMultiplier * (1 + level * 0.15));

        super(position, type.radius, maxHealth, type.color, damage, level);
        
        this.id = `enemy_${Math.random()}`;
        this.name = `${type.name}`;
        this.type = type;
        this.speed = type.speed;
        this.attackRange = type.attackRange;
        
        // XP Scaling: Polynomial scale to match higher XP requirements
        // Level 1: ~20 XP
        // Level 45: ~4000+ XP
        this.xpValue = Math.floor(15 * level + Math.pow(level, 2.1));
        
        this.goldValue = Math.floor(Math.random() * level + 1);
        this.spawnPosition = { ...position };
        this.nextWanderTime = Date.now() + Math.random() * 2000;

        // Spawn invulnerability
        this.setInvulnerable(3000);
    }

    // Override takeDamage to trigger aggro
    takeDamage(amount: number, source?: { name: string }): FloatingText | null {
        const ft = super.takeDamage(amount, source);
        // If we are idle and take damage, we get aggroed
        if (!this.isDead && (this.state === 'idle' || this.state === 'returning')) {
            this.state = 'chasing';
            this.wanderTarget = null;
        }
        return ft;
    }
    
    update(game: GameContext) {
        if (this.isDead) return;
        this.processStatusEffects(game);
        if (this.hasStatus('stun')) {
            this.isMoving = false;
            this.updateAnimation();
            return;
        }
        
        const { player } = game;
        const distToPlayer = getDistance(this.position, player.position);
        const distToSpawn = getDistance(this.position, this.spawnPosition);

        // Priority 1: Returning Logic (Leash / Safe Zone)
        if (this.state !== 'returning') {
             if (player.isInSafeZone || distToSpawn > GAME_CONFIG.ENEMY_LEASH_RANGE) {
                this.state = 'returning';
                this.wanderTarget = null;
            }
        }

        // Priority 2: State Transitions
        if (this.state === 'idle') {
            // Check for aggro based on proximity
            if (distToPlayer <= GAME_CONFIG.ENEMY_AGGRO_RANGE) {
                this.state = 'chasing';
                this.wanderTarget = null;
            }
        } else if (this.state === 'chasing') {
             if (distToPlayer <= this.attackRange) {
                 this.state = 'attacking';
             } else if (distToPlayer > GAME_CONFIG.ENEMY_AGGRO_RANGE * 1.5) {
                 // Soft reset if player runs far away but not leash range yet
             }
        } else if (this.state === 'attacking') {
            if (distToPlayer > this.attackRange) {
                this.state = 'chasing';
            }
        }

        const currentSpeed = this.speed * (this.hasStatus('slow') ? (1 - (this.statusEffects.find(e=>e.type==='slow')?.slowFactor || 0.5)) : 1);

        // Priority 3: Execute State Action
        this.isMoving = false;

        switch(this.state) {
            case 'idle':
                this.performWander(currentSpeed);
                this.isMoving = this.wanderTarget !== null;
                break;
                
            case 'chasing':
                const chaseDir = normalizeVector({
                    x: player.position.x - this.position.x,
                    y: player.position.y - this.position.y
                });
                this.position.x += chaseDir.x * currentSpeed;
                this.position.y += chaseDir.y * currentSpeed;
                this.isMoving = true;
                break;
                
            case 'attacking':
                if (Date.now() - this.lastAttackTime > this.type.attackCooldown) {
                    this.attack(player, game);
                    this.lastAttackTime = Date.now();
                }
                this.isMoving = false;
                break;
                
            case 'returning':
                if (distToSpawn < 10) {
                    // Arrived at spawn
                    this.position = { ...this.spawnPosition };
                    this.health = this.maxHealth; // Heal up
                    this.state = 'idle';
                    this.wanderTarget = null;
                    this.nextWanderTime = Date.now() + 1000;
                } else {
                    const returnDir = normalizeVector({
                        x: this.spawnPosition.x - this.position.x,
                        y: this.spawnPosition.y - this.position.y
                    });
                    // Return faster than normal speed
                    this.position.x += returnDir.x * (currentSpeed * 1.5);
                    this.position.y += returnDir.y * (currentSpeed * 1.5);
                    this.isMoving = true;
                }
                break;
        }

        this.updateAnimation();
    }
    
    private performWander(speed: number) {
        const now = Date.now();
        if (this.wanderTarget) {
            const dist = getDistance(this.position, this.wanderTarget);
            if (dist < 5) {
                // Reached target
                this.wanderTarget = null;
                this.nextWanderTime = now + 1500 + Math.random() * 3000;
            } else {
                const dir = normalizeVector({
                    x: this.wanderTarget.x - this.position.x,
                    y: this.wanderTarget.y - this.position.y
                });
                this.position.x += dir.x * (speed * 0.4); // Wander slowly
                this.position.y += dir.y * (speed * 0.4);
            }
        } else {
            if (now > this.nextWanderTime) {
                // Pick a random point near spawn
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 100;
                this.wanderTarget = {
                    x: this.spawnPosition.x + Math.cos(angle) * radius,
                    y: this.spawnPosition.y + Math.sin(angle) * radius
                };
            }
        }
    }
    
    attack(player: Character, game: GameContext) {
        // Trigger attack animation
        this.attackAnimationTimer = 15;

        if (this.type.attackType === 'melee') {
            if (getDistance(this.position, player.position) < this.attackRange + player.radius) {
                const ft = player.takeDamage(this.damage, { name: this.name });
                if (ft) game.addFloatingText(ft);
            }
        } else { // Ranged
            const direction = normalizeVector({
                x: player.position.x - this.position.x,
                y: player.position.y - this.position.y
            });
            game.addProjectile(new Projectile(this.position, direction, this.damage, 6, this.id, this.name, '#a1a1aa'));
        }
    }

    dropLoot(player: Player): DroppedItem[] {
        if (this.lootDropped) return [];
        this.lootDropped = true;
        
        const drops: DroppedItem[] = [];
        const playerLevel = player.level;
        const itemFind = player.getFinalStats().itemFind || 0;
        const itemFindMultiplier = 1 + itemFind;

        const rarityBonus = playerLevel * LOOT_CONFIG.LEVEL_RARITY_BONUS;
        
        // Drop materials
        // Item Find increases drop rate
        const matDropChance = (LOOT_CONFIG.MATERIAL_DROP_RATE + (playerLevel * LOOT_CONFIG.LEVEL_MATERIAL_DROP_RATE_BONUS)) * itemFindMultiplier;

        if (Math.random() < matDropChance) {
             const numMaterials = Math.floor(Math.random() * (LOOT_CONFIG.MATERIAL_QUANTITY_MAX - LOOT_CONFIG.MATERIAL_QUANTITY_MIN + 1)) + LOOT_CONFIG.MATERIAL_QUANTITY_MIN;
             for (let i = 0; i < numMaterials; i++) {
                 const matRoll = Math.random();
                 
                 // Calculate adjusted probability thresholds based on item find
                 // We want the threshold to be easier to hit (higher).
                 // Since we use < THRESHOLD, we should INCREASE the threshold by itemFind
                 // But wait, rare thresholds are small (0.005). Increasing them makes them more common.
                 // Correct: threshold * (1 + itemFind)
                 
                 // Ensure we don't exceed 1
                 const legThresh = Math.min(1, (LOOT_CONFIG.MATERIAL_RARITY_THRESHOLDS.LEGENDARY + rarityBonus) * itemFindMultiplier);
                 const epiThresh = Math.min(1, (LOOT_CONFIG.MATERIAL_RARITY_THRESHOLDS.EPIC + rarityBonus) * itemFindMultiplier);
                 const rareThresh = Math.min(1, (LOOT_CONFIG.MATERIAL_RARITY_THRESHOLDS.RARE + rarityBonus) * itemFindMultiplier);
                 const uncThresh = Math.min(1, (LOOT_CONFIG.MATERIAL_RARITY_THRESHOLDS.UNCOMMON + rarityBonus) * itemFindMultiplier);

                 let material: Item | null = null;
                 
                 // Check level requirements (Materials follow same as equipment for simplicity or just check enemy level)
                 // Using enemy level to gate material rarity
                 
                 if (this.level >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Legendary] && matRoll < legThresh) {
                     material = MATERIALS_DB['mat_leg'];
                 } else if (this.level >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Epic] && matRoll < epiThresh) {
                     material = MATERIALS_DB['mat_epi'];
                 } else if (this.level >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Rare] && matRoll < rareThresh) {
                     material = MATERIALS_DB['mat_rar'];
                 } else if (this.level >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Uncommon] && matRoll < uncThresh) {
                     material = MATERIALS_DB['mat_unc'];
                 } else {
                     material = MATERIALS_DB['mat_com'];
                 }
                 
                 if (material) {
                    drops.push(new DroppedItem(this.position, {...material, quantity: 1}));
                 }
             }
        }

        // Drop equipment
        const equipDropChance = (LOOT_CONFIG.EQUIPMENT_DROP_RATE + (playerLevel * LOOT_CONFIG.LEVEL_DROP_RATE_BONUS)) * itemFindMultiplier;
        
        if (Math.random() < equipDropChance) {
            // Pass Enemy Level to helper to enforce gating, and item find multiplier for rarity boost
            const item = this.getRandomItemWithGating(playerLevel, itemFindMultiplier);
            if (item) {
                drops.push(new DroppedItem(this.position, item));
            }
        }

        return drops;
    }

    // Local helper to handle Rarity Gating + Item Find
    private getRandomItemWithGating(playerLevel: number, itemFindMultiplier: number): Item | null {
        const roll = Math.random();
        let chosenRarity: ItemRarity = ItemRarity.Common;
        const levelBonus = playerLevel * LOOT_CONFIG.LEVEL_RARITY_BONUS;

        // Adjusted thresholds
        const legChance = (LOOT_CONFIG.RARITY_CHANCES[ItemRarity.Legendary] + levelBonus) * itemFindMultiplier;
        const epiChance = (LOOT_CONFIG.RARITY_CHANCES[ItemRarity.Epic] + levelBonus) * itemFindMultiplier;
        const rareChance = (LOOT_CONFIG.RARITY_CHANCES[ItemRarity.Rare] + levelBonus) * itemFindMultiplier;
        const uncChance = (LOOT_CONFIG.RARITY_CHANCES[ItemRarity.Uncommon] + levelBonus) * itemFindMultiplier;

        // Check roll against thresholds AND Enemy Level against Requirements
        if (this.level >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Legendary] && roll < legChance) {
            chosenRarity = ItemRarity.Legendary;
        } else if (this.level >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Epic] && roll < epiChance) {
            chosenRarity = ItemRarity.Epic;
        } else if (this.level >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Rare] && roll < rareChance) {
            chosenRarity = ItemRarity.Rare;
        } else if (this.level >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Uncommon] && roll < uncChance) {
            chosenRarity = ItemRarity.Uncommon;
        }
        // Fallback to Common (Level requirement is 1, so always passes)

        const possibleItems = ALL_EQUIPMENT.filter(item => item.rarity === chosenRarity);
        if (possibleItems.length > 0) {
            const item = possibleItems[Math.floor(Math.random() * possibleItems.length)];
            return { ...item }; // Return a copy
        }

        return null;
    }

    draw(ctx: CanvasRenderingContext2D) {
        // State visuals
        if (this.state === 'returning') {
            ctx.globalAlpha = 0.6; // Ghostly when returning
        }

        super.draw(ctx);
        
        ctx.globalAlpha = 1.0; // Reset alpha

        // Draw Aggro/State Indicator
        if (!this.isDead) {
            if (this.state === 'chasing' || this.state === 'attacking') {
                ctx.fillStyle = '#ef4444'; // Red
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('!', this.position.x, this.position.y - this.radius - 25);
            } else if (this.state === 'returning') {
                ctx.fillStyle = '#3b82f6'; // Blue
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('?', this.position.x, this.position.y - this.radius - 25);
            }

            // Draw Attack Cooldown Bar
            const timeSinceAttack = Date.now() - this.lastAttackTime;
            if (timeSinceAttack < this.type.attackCooldown) {
                const barWidth = 24;
                const barHeight = 4;
                const x = this.position.x - barWidth / 2;
                const y = this.position.y + this.radius + 10; // Below feet
                
                // Background
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(x, y, barWidth, barHeight);
                
                // Progress
                const progress = timeSinceAttack / this.type.attackCooldown;
                ctx.fillStyle = '#facc15'; // Yellow charging bar
                ctx.fillRect(x, y, barWidth * progress, barHeight);
            }
        }
        
        // Name text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = '10px sans-serif';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 2;
        ctx.fillText(this.name, this.position.x, this.position.y + this.radius + 22);
        ctx.shadowBlur = 0;
    }
}
