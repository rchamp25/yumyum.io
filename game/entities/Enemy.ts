
import { Character } from './Character';
import { Vector2D, GameContext, ServerEnemy } from '../types';
import { normalizeVector, getDistance } from '../math';
import { DroppedItem } from './DroppedItem';
import { GAME_CONFIG, BOSS_CONFIG, BOSS_ZONES, ENEMY_TYPES, BOSS_TYPES, EnemyType } from '../constants';
import { Projectile } from './Projectile';
import { FloatingText } from './FloatingText';
import { Player } from './Player';
import { VisualEffect } from './VisualEffect';
import { GroundEffect } from './GroundEffect';
import { generateLoot } from '../lootUtils';

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
    private wanderTarget: Vector2D | null = null;
    private nextWanderTime: number = 0;
    private specialAttackCooldown: number = 0;

    constructor(position: Vector2D, level: number, bossZoneId?: string, id?: string) {
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
        const damage = Math.floor(0.75 * type.damageMultiplier * (1 + level * 0.15));

        super(position, type.radius, maxHealth, type.color, damage, level);
        
        this.id = id || `enemy_${Math.random()}`;
        this.name = type.name;
        this.type = type;
        this.speed = type.speed;
        this.attackRange = type.attackRange;
        this.isBoss = isBoss;
        this.bossZoneId = bossZoneId;
        
        let xpBase = 15 * level + Math.pow(level, 2.1);
        if (isBoss) xpBase *= 10;
        this.xpValue = Math.floor(xpBase);
        
        this.goldValue = Math.floor(Math.random() * level + 1) * (isBoss ? 20 : 1);
        this.spawnPosition = { ...position };
        this.nextWanderTime = Date.now() + Math.random() * 2000;

        this.setInvulnerable(3000);
    }

    sync(data: ServerEnemy) {
        this.position = data.position;
        this.health = data.health;
        this.maxHealth = data.maxHealth;
        this.level = data.level;
        if (data.radius) this.radius = data.radius;
        if (data.damage) this.damage = data.damage;
    }

    takeDamage(amount: number, source?: { name: string, level?: number }): FloatingText | null {
        if (!this.isBoss) {
            const inBossZone = BOSS_ZONES.some(z => getDistance(this.position, z) < BOSS_CONFIG.ZONE_RADIUS);
            if (inBossZone) return null;
        }

        let finalAmount = amount;
        
        if (source && source.level !== undefined) {
            const levelDiff = this.level - source.level;
            if (levelDiff > 5) {
                const penaltySteps = levelDiff - 5;
                const multiplier = Math.pow(0.5, penaltySteps);
                finalAmount = Math.max(1, Math.floor(amount * multiplier));
            }
        }

        const ft = super.takeDamage(finalAmount, source);
        
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
        const leashRange = this.isBoss ? BOSS_CONFIG.ZONE_RADIUS : GAME_CONFIG.ENEMY_LEASH_RANGE;

        if (this.state !== 'returning') {
             const playerInSafeZone = player.isInSafeZone;
             const outsideLeash = distToSpawn > leashRange;
             
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

        if (this.state === 'idle') {
            const aggroRange = this.isBoss ? BOSS_CONFIG.ZONE_RADIUS : GAME_CONFIG.ENEMY_AGGRO_RANGE;
            if (distToPlayer <= aggroRange) {
                this.state = 'chasing';
                this.wanderTarget = null;
            }
        } else if (this.state === 'chasing') {
             if (distToPlayer <= this.attackRange) {
                 this.state = 'attacking';
             }
        } else if (this.state === 'attacking') {
            if (distToPlayer > this.attackRange) {
                this.state = 'chasing';
            }
        }

        const currentSpeed = this.speed * (this.hasStatus('slow') ? (1 - (this.statusEffects.find(e=>e.type==='slow')?.slowFactor || 0.5)) : 1);

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
                    this.position = { ...this.spawnPosition };
                    this.health = this.maxHealth;
                    this.state = 'idle';
                    this.wanderTarget = null;
                    this.nextWanderTime = Date.now() + 1000;
                } else {
                    const returnDir = normalizeVector({
                        x: this.spawnPosition.x - this.position.x,
                        y: this.spawnPosition.y - this.position.y
                    });
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
                this.wanderTarget = null;
                this.nextWanderTime = now + 1500 + Math.random() * 3000;
            } else {
                const dir = normalizeVector({
                    x: this.wanderTarget.x - this.position.x,
                    y: this.wanderTarget.y - this.position.y
                });
                this.position.x += dir.x * (speed * 0.4);
                this.position.y += dir.y * (speed * 0.4);
            }
        } else {
            if (now > this.nextWanderTime) {
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
        } else {
            const direction = normalizeVector({
                x: player.position.x - this.position.x,
                y: player.position.y - this.position.y
            });
            game.addProjectile(new Projectile(this.position, direction, this.damage, 6, this.id, this.name, this.level, '#a1a1aa', 1, true));
        }
    }

    private performBossAttack(player: Character, game: GameContext) {
        const now = Date.now();
        if (now > this.specialAttackCooldown && Math.random() < 0.3) {
            this.specialAttackCooldown = now + 5000;
            this.attackAnimationTimer = 30;
            game.addFloatingText(new FloatingText("! SPECIAL !", {x: this.position.x, y: this.position.y - 80}, '#ef4444', 24));
            
            if (this.bossZoneId === 'boss_nw') {
                game.addVisualEffect(new VisualEffect(this.position, 'stomp_wave', 2000, { radius: 200, color: '#0ea5e9' }));
                game.addGroundEffect(new GroundEffect(this.position, 200, 1500, 'rgba(14, 165, 233, 0.3)', { 
                    type: 'dot', damagePerTick: this.damage * 2, duration: 500
                }, this.id, this.name, this.level));
            } else if (this.bossZoneId === 'boss_ne') {
                for(let i=0; i<3; i++) {
                    const offset = { x: (Math.random()-0.5)*300, y: (Math.random()-0.5)*300 };
                    const pos = { x: player.position.x + offset.x, y: player.position.y + offset.y };
                    game.addGroundEffect(new GroundEffect(pos, 100, 2000, 'rgba(220, 38, 38, 0.4)', {
                        type: 'dot', damagePerTick: this.damage * 1.5, duration: 500
                    }, this.id, this.name, this.level));
                }
            } else if (this.bossZoneId === 'boss_sw') {
                game.addGroundEffect(new GroundEffect(player.position, 120, 5000, 'rgba(163, 230, 53, 0.4)', {
                    type: 'dot', damagePerTick: this.damage * 0.5, duration: 5000
                }, this.id, this.name, this.level));
            } else if (this.bossZoneId === 'boss_se') {
                 game.addGroundEffect(new GroundEffect(player.position, 150, 2000, 'rgba(124, 58, 237, 0.4)', {
                    type: 'dot', damagePerTick: this.damage * 2.5, duration: 200
                }, this.id, this.name, this.level));
            }

        } else {
            this.attack(player, game);
        }
    }

    dropLoot(player: Player): DroppedItem[] {
        if (this.lootDropped) return [];
        this.lootDropped = true;
        
        const finalStats = player.getFinalStats();
        const itemFind = finalStats.itemFind || 0;
        
        // Client-side dropLoot (Offline Only) does not pass isOnline=true
        const items = generateLoot(this.level, this.position, this.isBoss, itemFind, false);
        
        return items.map(item => new DroppedItem(this.position, item));
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this.state === 'returning') {
            ctx.globalAlpha = 0.6;
        }

        super.draw(ctx, false);
        
        ctx.globalAlpha = 1.0;

        if (!this.isDead) {
            if (this.state === 'chasing' || this.state === 'attacking') {
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('!', this.position.x, this.position.y - this.radius - 25);
            } else if (this.state === 'returning') {
                ctx.fillStyle = '#3b82f6';
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('?', this.position.x, this.position.y - this.radius - 25);
            }

            const timeSinceAttack = Date.now() - this.lastAttackTime;
            if (timeSinceAttack < this.type.attackCooldown) {
                const barWidth = this.isBoss ? 40 : 24;
                const barHeight = 4;
                const x = this.position.x - barWidth / 2;
                const y = this.position.y + this.radius + 10;
                
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(x, y, barWidth, barHeight);
                
                const progress = timeSinceAttack / this.type.attackCooldown;
                ctx.fillStyle = '#facc15';
                ctx.fillRect(x, y, barWidth * progress, barHeight);
            }
        }
        
        ctx.fillStyle = this.isBoss ? '#fbbf24' : 'white';
        if (this.isBoss) ctx.font = 'bold 14px sans-serif';
        else ctx.font = '10px sans-serif';
        
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 2;
        ctx.fillText(this.name, this.position.x, this.position.y + this.radius + 22);
        ctx.shadowBlur = 0;

        if (!this.isDead && this.health < this.maxHealth) {
            const barWidth = this.isBoss ? this.radius * 2.5 : this.radius * 2;
            const barHeight = this.isBoss ? 8 : 5;
            const barX = this.position.x - barWidth / 2;
            const barY = this.position.y - this.radius - 15;

            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            const healthPercentage = this.health > 0 ? this.health / this.maxHealth : 0;
            ctx.fillStyle = this.isBoss ? '#9333ea' : '#dc2626';
            ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
            
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
    }
}
