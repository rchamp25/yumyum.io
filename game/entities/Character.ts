
import { Vector2D, StatusEffect, GameContext } from '../types';
import { FloatingText } from './FloatingText';

export abstract class Character {
    id: string | number;
    position: Vector2D;
    radius: number;
    health: number;
    maxHealth: number;
    damage: number;
    color: string;
    level: number;
    isDead: boolean = false;
    statusEffects: StatusEffect[] = [];
    shield: number = 0;
    invulnerableUntil: number = 0;

    // Animation properties
    isMoving: boolean = false;
    animationTick: number = 0;
    hitFlashTimer: number = 0;
    attackAnimationTimer: number = 0;

    constructor(position: Vector2D, radius: number, maxHealth: number, color: string, damage: number, level: number = 1) {
        this.id = `char_${Math.random()}`;
        this.position = position;
        this.radius = radius;
        this.maxHealth = maxHealth;
        this.health = maxHealth;
        this.damage = damage;
        this.color = color;
        this.level = level;
    }

    abstract update(...args: any[]): void;

    setInvulnerable(duration: number) {
        this.invulnerableUntil = Date.now() + duration;
    }

    isInvulnerable(): boolean {
        return Date.now() < this.invulnerableUntil;
    }

    takeDamage(amount: number, source?: { name: string }): FloatingText | null {
        if (this.isDead) return null;
        if (this.isInvulnerable()) return null;

        let damageTaken = amount;
        
        // Shield absorption
        if (this.shield > 0) {
            const absorbed = Math.min(this.shield, damageTaken);
            this.shield -= absorbed;
            damageTaken -= absorbed;
        }

        this.health -= damageTaken;

        // Trigger Hit Flash
        this.hitFlashTimer = 8;

        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
        }

        const roundedDamage = Math.round(damageTaken);
        if (roundedDamage > 0) {
            return new FloatingText(roundedDamage.toString(), { x: this.position.x, y: this.position.y - this.radius }, '#ff4d4d');
        }
        return null;
    }

    updateAnimation() {
        if (this.isMoving) {
            this.animationTick++;
        } else {
            this.animationTick = 0;
        }

        if (this.hitFlashTimer > 0) this.hitFlashTimer--;
        if (this.attackAnimationTimer > 0) this.attackAnimationTimer--;
    }

    addStatusEffect(effect: Omit<StatusEffect, 'startTime'>) {
        // Prevent stacking stuns
        if (effect.type === 'stun' && this.statusEffects.some(e => e.type === 'stun')) {
            return;
        }
        
        const newEffect: StatusEffect = { ...effect, startTime: Date.now() };

        if(newEffect.type === 'shield' && newEffect.shieldHealth) {
            this.shield += newEffect.shieldHealth;
        }

        this.statusEffects.push(newEffect);
    }
    
    processStatusEffects(game?: GameContext) {
        const now = Date.now();

        // Handle Ticks (e.g. DOTs)
        this.statusEffects.forEach(effect => {
            if (effect.type === 'dot' && effect.damagePerTick) {
                if (!effect.lastTick) effect.lastTick = effect.startTime;
                
                // Tick every second
                if (now - effect.lastTick >= 1000) {
                    effect.lastTick = now;
                    const ft = this.takeDamage(effect.damagePerTick, { name: 'Status Effect' });
                    if (ft && game) {
                        game.addFloatingText(ft);
                    }
                }
            }
        });

        // Handle Expiry
        this.statusEffects = this.statusEffects.filter(effect => {
             const elapsed = now - effect.startTime;
             if (elapsed >= effect.duration) {
                // Handle shield removal on expiry
                if(effect.type === 'shield' && effect.shieldHealth) {
                    // Only remove remaining shield, don't go negative if it was consumed
                    this.shield = Math.max(0, this.shield - effect.shieldHealth);
                    // Actually, simpler logic: reset shield if it was purely from this effect? 
                    // Since we don't track which shield points belong to which effect, 
                    // a simple reduction is the best approximation, clamped to 0.
                }
                 return false; // Effect expired
             }
             return true;
        });
    }

    hasStatus(type: StatusEffect['type']): boolean {
        return this.statusEffects.some(e => e.type === type);
    }

    draw(ctx: CanvasRenderingContext2D, drawHealthBar: boolean = true) {
        if (this.isDead) return;

        ctx.save();
        ctx.translate(this.position.x, this.position.y);

        // Animation calculations
        // Bobbing when moving
        const bobOffset = this.isMoving ? Math.sin(this.animationTick * 0.15) * 4 : 0;
        // Scale punch when attacking
        const attackScale = this.attackAnimationTimer > 0 
            ? 1 + Math.sin((this.attackAnimationTimer / 15) * Math.PI) * 0.15 
            : 1;
        
        // Invulnerability Flashing
        if (this.isInvulnerable()) {
            // Flash every 100ms
            if (Math.floor(Date.now() / 100) % 2 === 0) {
                ctx.globalAlpha = 0.5;
            }
        }

        // Shadow (Draw first, stays grounded/unscaled relative to body movement)
        ctx.beginPath();
        ctx.ellipse(0, this.radius, this.radius, this.radius / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // Apply body animations
        ctx.translate(0, bobOffset);
        ctx.scale(attackScale, attackScale);

        // Body
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        
        if (this.hitFlashTimer > 0) {
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = this.color;
        }

        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        const barYOffset = this.radius + 10;
        
        // Level display
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px sans-serif';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.fillText(`Lv. ${this.level}`, 0, -barYOffset - 8);
        ctx.shadowBlur = 0;

        // Health bar
        if (drawHealthBar && this.health < this.maxHealth) {
            const barWidth = this.radius * 2;
            const barHeight = 5;
            const barX = -this.radius;
            const barY = -barYOffset;

            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            const healthPercentage = this.health > 0 ? this.health / this.maxHealth : 0;
            ctx.fillStyle = '#dc2626'; // red-600
            ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
        }

        ctx.restore();
    }
}
