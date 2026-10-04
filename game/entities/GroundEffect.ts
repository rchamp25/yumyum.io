
import { Vector2D, StatusEffect, GameContext } from "../types";
import { Enemy } from "./Enemy";
import { getDistance } from "../math";

export class GroundEffect {
    position: Vector2D;
    radius: number;
    duration: number;
    startTime: number;
    color: string;
    effect: Omit<StatusEffect, 'startTime'>;
    lastTickTime: number = 0;
    tickInterval: number = 500; // ms
    ownerId: string | number;
    ownerName: string;
    ownerLevel: number;
    type: 'default' | 'rain_of_arrows' | 'whirlwind';
    bossDamageMultiplier: number;

    constructor(position: Vector2D, radius: number, duration: number, color: string, effect: Omit<StatusEffect, 'startTime'>, ownerId: string | number, ownerName: string, ownerLevel: number, type: 'default' | 'rain_of_arrows' | 'whirlwind' = 'default', bossDamageMultiplier: number = 1) {
        this.position = { ...position };
        this.radius = radius;
        this.duration = duration;
        this.startTime = Date.now();
        this.color = color;
        this.effect = effect;
        this.ownerId = ownerId;
        this.ownerName = ownerName;
        this.ownerLevel = ownerLevel;
        this.type = type;
        this.bossDamageMultiplier = bossDamageMultiplier;
    }

    update(enemies: Enemy[], game: GameContext) {
        const now = Date.now();
        if (now - this.lastTickTime > this.tickInterval) {
            this.lastTickTime = now;
            
            // If owner is Player, check enemies
            if (this.ownerId === game.player.id) {
                enemies.forEach(enemy => {
                    if (getDistance(this.position, enemy.position) < this.radius + enemy.radius) {
                        game.player.enterCombat();
                        if (this.effect.type === 'dot' && this.effect.damagePerTick) {
                            const tickDamage = this.effect.damagePerTick * (this.tickInterval / 1000);
                            let finalDamage = tickDamage;
                            if (enemy.isBoss) {
                                finalDamage *= this.bossDamageMultiplier;
                            }
                            const ft = enemy.takeDamage(finalDamage, { name: this.ownerName, level: this.ownerLevel });
                            if (ft) game.addFloatingText(ft);
                        } else {
                            enemy.addStatusEffect(this.effect);
                        }
                    }
                });
            } 
            // If owner is Enemy (Boss), check Player
            else {
                const player = game.player;
                if (getDistance(this.position, player.position) < this.radius + player.radius) {
                    if (this.effect.type === 'dot' && this.effect.damagePerTick) {
                        const tickDamage = this.effect.damagePerTick * (this.tickInterval / 1000);
                        const ft = player.takeDamage(tickDamage, { name: this.ownerName, level: this.ownerLevel });
                        if (ft) {
                            game.addFloatingText(ft);
                            game.playSound('damage');
                        }
                    } else {
                        player.addStatusEffect(this.effect);
                    }
                }
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        const elapsed = Date.now() - this.startTime;
        const remaining = this.duration - elapsed;
        const opacity = Math.max(0, remaining / this.duration);
        const progress = elapsed / this.duration;

        if (this.type === 'whirlwind') {
            ctx.globalAlpha = opacity * 0.8;
            const angle = progress * Math.PI * 8 + Date.now() / 50;
            const radius = this.radius * (0.5 + progress * 0.5);
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, radius, angle, angle + Math.PI * 0.8);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 8;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, radius, angle + Math.PI, angle + Math.PI * 1.8);
            ctx.stroke();
        } else if (this.type === 'rain_of_arrows') {
            // Draw a lingering scorch mark
            ctx.globalAlpha = opacity * 0.25;
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'black';
            ctx.fill();
            // Add some texture to the scorch mark
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                const randomRadius = Math.random() * this.radius * 0.5;
                const randomAngle = Math.random() * Math.PI * 2;
                const xOffset = Math.cos(randomAngle) * this.radius * 0.4;
                const yOffset = Math.sin(randomAngle) * this.radius * 0.4;
                ctx.arc(this.position.x + xOffset, this.position.y + yOffset, randomRadius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fill();
            }
        } else {
            ctx.globalAlpha = opacity * 0.5;
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        
        ctx.restore();
    }

    isExpired(): boolean {
        return Date.now() - this.startTime > this.duration;
    }
}
