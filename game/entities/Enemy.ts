
import { Character } from './Character';
import { Vector2D, GameContext, Item, ItemRarity } from '../types';
import { normalizeVector, getDistance } from '../utils';
import { DroppedItem } from './DroppedItem';
import { MATERIALS_DB, getRandomItem, ALL_EQUIPMENT, ALL_MYTHICS } from '../items';
import { GAME_CONFIG, LOOT_CONFIG, BOSS_CONFIG, BOSS_ZONES } from '../constants';
import { Projectile } from './Projectile';
import { FloatingText } from './FloatingText';
import { Player } from './Player';
import { VisualEffect } from './VisualEffect';
import { GroundEffect } from './GroundEffect';

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

const BOSS_TYPES: { [key: string]: EnemyType } = {
    'boss_nw': { // Frozen Peak
        name: 'Titan of the Deep',
        radius: 70,
        healthMultiplier: 80, 
        damageMultiplier: 4.5, // Buffed from 3.0
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
        damageMultiplier: 6.0, // Buffed from 4.0
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
        damageMultiplier: 3.75, // Buffed from 2.5
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
        damageMultiplier: 7.5, // Buffed from 5.0
        speed: 2.0,
        color: '#7c3aed', // Violet
        attackRange: 500,
        attackCooldown: 2000,
        attackType: 'ranged'
    }
};

export class Enemy extends Character {
    name: string;
    xpValue: number;
    goldValue: number;
    type: EnemyType;
    lootDropped: boolean = false;
    isBoss: boolean = false;
    bossZoneId?: string;
    
    private spawnPosition: Vector2D;
    private state: 'idle' | 'chasing' | 'attacking' | 'returning' = 'idle';
    private lastAttackTime: number = 0;
    private attackRange: number;
    private speed: number;

    // AI State properties
    private wanderTarget: Vector2D | null = null;
    private nextWanderTime: number = 0;
    
    // Boss Logic
    private specialAttackCooldown: number = 0;

    constructor(position: Vector2D, level: number, bossZoneId?: string) {
        let type: EnemyType;
        let isBoss = false;

        if (bossZoneId && BOSS_TYPES[bossZoneId]) {
            type = BOSS_TYPES[bossZoneId];
            isBoss = true;
        } else {
            const typeKey = Object.keys(ENEMY_TYPES)[Math.floor(Math.random() * Object.keys(ENEMY_TYPES).length)];
            type = ENEMY_TYPES[typeKey];
        }

        const maxHealth = Math.floor(20 * type.healthMultiplier * (1 + level * 0.2));
        // Reduced damage to 1/4th of previous value (factor 0.75 replaces 3)
        const damage = Math.floor(0.75 * type.damageMultiplier * (1 + level * 0.15));

        super(position, type.radius, maxHealth, type.color, damage, level);
        
        this.id = `enemy_${Math.random()}`;
        this.name = type.name;
        this.type = type;
        this.speed = type.speed;
        this.attackRange = type.attackRange;
        this.isBoss = isBoss;
        this.bossZoneId = bossZoneId;
        
        // XP Scaling
        let xpBase = 15 * level + Math.pow(level, 2.1);
        if (isBoss) xpBase *= 10; // Bosses give way more XP
        this.xpValue = Math.floor(xpBase);
        
        this.goldValue = Math.floor(Math.random() * level + 1) * (isBoss ? 20 : 1);
        this.spawnPosition = { ...position };
        this.nextWanderTime = Date.now() + Math.random() * 2000;

        // Spawn invulnerability
        this.setInvulnerable(3000);
    }

    // Override takeDamage to trigger aggro and apply level gap penalty
    takeDamage(amount: number, source?: { name: string, level?: number }): FloatingText | null {
        // Check for Immunity if not a boss and inside Boss Zone
        if (!this.isBoss) {
            const inBossZone = BOSS_ZONES.some(z => getDistance(this.position, z) < BOSS_CONFIG.ZONE_RADIUS);
            if (inBossZone) return null; // Normal mobs are immune in boss zones to prevent farming them with the buff
        }

        let finalAmount = amount;
        
        // Apply Damage Reduction if Mob is much higher level than attacker
        if (source && source.level !== undefined) {
            const levelDiff = this.level - source.level;
            if (levelDiff > 5) {
                const penaltySteps = levelDiff - 5;
                // 6 levels higher = 50% damage, 7 levels = 25%, 8 levels = 12.5%
                const multiplier = Math.pow(0.5, penaltySteps);
                finalAmount = Math.max(1, Math.floor(amount * multiplier));
            }
        }

        const ft = super.takeDamage(finalAmount, source);
        
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
        
        // Bosses have a strict leash to their arena
        const leashRange = this.isBoss ? BOSS_CONFIG.ZONE_RADIUS : GAME_CONFIG.ENEMY_LEASH_RANGE;

        // Priority 1: Returning Logic (Leash / Safe Zone / Boss Zone De-aggro)
        if (this.state !== 'returning') {
             const playerInSafeZone = player.isInSafeZone;
             const outsideLeash = distToSpawn > leashRange;
             
             // Check if Player entered Boss Zone and we are NOT a boss
             let shouldDeAggro = false;
             if (!this.isBoss) {
                 const inBossZone = BOSS_ZONES.some(z => getDistance(player.position, z) < BOSS_CONFIG.ZONE_RADIUS);
                 if (inBossZone) shouldDeAggro = true;
             }

             if (playerInSafeZone || outsideLeash || shouldDeAggro) {
                this.state = 'returning';
                this.wanderTarget = null;
            }
        }

        // Priority 2: State Transitions
        if (this.state === 'idle') {
            // Bosses are always aggressive inside their zone
            const aggroRange = this.isBoss ? BOSS_CONFIG.ZONE_RADIUS : GAME_CONFIG.ENEMY_AGGRO_RANGE;
            if (distToPlayer <= aggroRange) {
                this.state = 'chasing';
                this.wanderTarget = null;
            }
        } else if (this.state === 'chasing') {
             if (distToPlayer <= this.attackRange) {
                 this.state = 'attacking';
             } else if (distToPlayer > GAME_CONFIG.ENEMY_AGGRO_RANGE * 1.5 && !this.isBoss) {
                 // Soft reset for normal mobs
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
                    if (this.isBoss) {
                        this.performBossAttack(player, game);
                    } else {
                        this.attack(player, game);
                    }
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
                const wanderRadius = this.isBoss ? 200 : 100;
                const radius = Math.random() * wanderRadius;
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
                const ft = player.takeDamage(this.damage, { name: this.name, level: this.level });
                if (ft) {
                    game.addFloatingText(ft);
                    if ('id' in player && player.id === game.player.id) {
                        game.playSound('damage');
                    }
                }
            }
        } else { // Ranged
            const direction = normalizeVector({
                x: player.position.x - this.position.x,
                y: player.position.y - this.position.y
            });
            // Bosses should always be able to hit players with ranged attacks
            game.addProjectile(new Projectile(this.position, direction, this.damage, 6, this.id, this.name, this.level, '#a1a1aa'));
        }
    }

    private performBossAttack(player: Character, game: GameContext) {
        const now = Date.now();
        // 30% chance to do special attack if cooldown is up
        if (now > this.specialAttackCooldown && Math.random() < 0.3) {
            this.specialAttackCooldown = now + 5000; // 5s CD on special
            this.attackAnimationTimer = 30;

            // Special Attack Logic
            game.addFloatingText(new FloatingText("! SPECIAL !", {x: this.position.x, y: this.position.y - 80}, '#ef4444', 24));
            
            if (this.bossZoneId === 'boss_nw') { // Titan (Stomp)
                game.addVisualEffect(new VisualEffect(this.position, 'stomp_wave', 2000, { radius: 200, color: '#0ea5e9' }));
                // Delayed massive damage
                game.addGroundEffect(new GroundEffect(this.position, 200, 1500, 'rgba(14, 165, 233, 0.3)', { 
                    type: 'dot', damagePerTick: this.damage * 2, duration: 500 // Burst
                }, this.id, this.name, this.level));
            } else if (this.bossZoneId === 'boss_ne') { // Infernal (Firestorm)
                // Spawn 3 random explosions near player
                for(let i=0; i<3; i++) {
                    const offset = { x: (Math.random()-0.5)*300, y: (Math.random()-0.5)*300 };
                    const pos = { x: player.position.x + offset.x, y: player.position.y + offset.y };
                    game.addGroundEffect(new GroundEffect(pos, 100, 2000, 'rgba(220, 38, 38, 0.4)', {
                        type: 'dot', damagePerTick: this.damage * 1.5, duration: 500
                    }, this.id, this.name, this.level));
                }
            } else if (this.bossZoneId === 'boss_sw') { // Broodmother (Poison Puddle)
                game.addGroundEffect(new GroundEffect(player.position, 120, 5000, 'rgba(163, 230, 53, 0.4)', {
                    type: 'dot', damagePerTick: this.damage * 0.5, duration: 5000
                }, this.id, this.name, this.level));
            } else if (this.bossZoneId === 'boss_se') { // Void Weaver (Void Blast)
                 game.addGroundEffect(new GroundEffect(player.position, 150, 2000, 'rgba(124, 58, 237, 0.4)', {
                    type: 'dot', damagePerTick: this.damage * 2.5, duration: 200
                }, this.id, this.name, this.level));
            }

        } else {
            // Normal Attack
            this.attack(player, game);
        }
    }

    dropLoot(player: Player): DroppedItem[] {
        if (this.lootDropped) return [];
        this.lootDropped = true;
        
        const drops: DroppedItem[] = [];
        const playerLevel = player.level;
        
        // Item Find Calculation
        // We use player stats directly now as Player.ts applies the massive zone bonus
        const baseItemFind = player.getFinalStats().itemFind || 0;
        const itemFindMultiplier = 1 + baseItemFind;

        const rarityBonus = playerLevel * LOOT_CONFIG.LEVEL_RARITY_BONUS;
        
        // Drop materials
        // Item Find increases drop rate
        const matDropChance = (LOOT_CONFIG.MATERIAL_DROP_RATE + (playerLevel * LOOT_CONFIG.LEVEL_MATERIAL_DROP_RATE_BONUS)) * itemFindMultiplier;

        if (Math.random() < matDropChance) {
             const numMaterials = Math.floor(Math.random() * (LOOT_CONFIG.MATERIAL_QUANTITY_MAX - LOOT_CONFIG.MATERIAL_QUANTITY_MIN + 1)) + LOOT_CONFIG.MATERIAL_QUANTITY_MIN;
             for (let i = 0; i < numMaterials; i++) {
                 const matRoll = Math.random();
                 
                 // Calculate adjusted probability thresholds based on item find
                 const legThresh = Math.min(1, (LOOT_CONFIG.MATERIAL_RARITY_THRESHOLDS.LEGENDARY + rarityBonus) * itemFindMultiplier);
                 const epiThresh = Math.min(1, (LOOT_CONFIG.MATERIAL_RARITY_THRESHOLDS.EPIC + rarityBonus) * itemFindMultiplier);
                 const rareThresh = Math.min(1, (LOOT_CONFIG.MATERIAL_RARITY_THRESHOLDS.RARE + rarityBonus) * itemFindMultiplier);
                 const uncThresh = Math.min(1, (LOOT_CONFIG.MATERIAL_RARITY_THRESHOLDS.UNCOMMON + rarityBonus) * itemFindMultiplier);

                 let material: Item | null = null;
                 
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

        // Boss Specific Mythic Drop
        if (this.isBoss) {
             const mythicChance = 0.01 * itemFindMultiplier; // 1% base chance scaled by item find
             if (Math.random() < mythicChance) {
                 // Pick a random mythic from the pool
                 if (ALL_MYTHICS.length > 0) {
                     const randomMythic = ALL_MYTHICS[Math.floor(Math.random() * ALL_MYTHICS.length)];
                     drops.push(new DroppedItem(this.position, { ...randomMythic }));
                 }
             }
        }

        // Drop equipment
        // Bosses drop BOSS_DROP_BONUS (10) + 1 items
        const dropLoopCount = this.isBoss ? (BOSS_CONFIG.BOSS_DROP_BONUS + 1) : 1;

        for(let i=0; i<dropLoopCount; i++) {
            const equipDropChance = (LOOT_CONFIG.EQUIPMENT_DROP_RATE + (playerLevel * LOOT_CONFIG.LEVEL_DROP_RATE_BONUS)) * itemFindMultiplier;
            
            // Bosses guarantee at least one check pass if it's their bonus loops
            const shouldDrop = i > 0 || Math.random() < equipDropChance;

            if (shouldDrop) {
                const item = this.getRandomItemWithGating(playerLevel, itemFindMultiplier);
                if (item) {
                    drops.push(new DroppedItem(this.position, item));
                }
            }
        }

        return drops;
    }

    // Local helper to handle Rarity Gating + Item Find
    private getRandomItemWithGating(playerLevel: number, itemFindMultiplier: number): Item | null {
        const roll = Math.random();
        let chosenRarity: ItemRarity = ItemRarity.Common;
        const levelBonus = playerLevel * LOOT_CONFIG.LEVEL_RARITY_BONUS;

        const legChance = (LOOT_CONFIG.RARITY_CHANCES[ItemRarity.Legendary] + levelBonus) * itemFindMultiplier;
        const epiChance = (LOOT_CONFIG.RARITY_CHANCES[ItemRarity.Epic] + levelBonus) * itemFindMultiplier;
        const rareChance = (LOOT_CONFIG.RARITY_CHANCES[ItemRarity.Rare] + levelBonus) * itemFindMultiplier;
        const uncChance = (LOOT_CONFIG.RARITY_CHANCES[ItemRarity.Uncommon] + levelBonus) * itemFindMultiplier;

        if (this.level >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Legendary] && roll < legChance) {
            chosenRarity = ItemRarity.Legendary;
        } else if (this.level >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Epic] && roll < epiChance) {
            chosenRarity = ItemRarity.Epic;
        } else if (this.level >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Rare] && roll < rareChance) {
            chosenRarity = ItemRarity.Rare;
        } else if (this.level >= LOOT_CONFIG.RARITY_LEVEL_REQUIREMENTS[ItemRarity.Uncommon] && roll < uncChance) {
            chosenRarity = ItemRarity.Uncommon;
        }

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

        super.draw(ctx, false); // Don't draw standard health bar yet
        
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
                const barWidth = this.isBoss ? 40 : 24;
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
        ctx.fillStyle = this.isBoss ? '#fbbf24' : 'white'; // Gold for bosses
        if (this.isBoss) ctx.font = 'bold 14px sans-serif';
        else ctx.font = '10px sans-serif';
        
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 2;
        ctx.fillText(this.name, this.position.x, this.position.y + this.radius + 22);
        ctx.shadowBlur = 0;

        // Draw Health Bar (Custom for Bosses)
        if (!this.isDead && this.health < this.maxHealth) {
            const barWidth = this.isBoss ? this.radius * 2.5 : this.radius * 2;
            const barHeight = this.isBoss ? 8 : 5;
            const barX = this.position.x - barWidth / 2;
            const barY = this.position.y - this.radius - 15;

            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            const healthPercentage = this.health > 0 ? this.health / this.maxHealth : 0;
            ctx.fillStyle = this.isBoss ? '#9333ea' : '#dc2626'; // Purple for bosses, Red for normal
            ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
            
            // Border
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
    }
}
