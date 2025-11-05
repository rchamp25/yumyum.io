import { Vector2D } from "../types";
// FIX: Imported the missing 'getDistance' utility function.
import { getDistance } from "../utils";

type EffectType = 'dash_trail' | 'stomp_wave' | 'whirlwind' | 'slash_arc' | 'buff_aura' | 'teleport_in' | 'teleport_out' | 'explosion' | 'fire_explosion' | 'frost_nova' | 'rain_of_arrows';

interface EffectOptions {
    radius?: number;
    color?: string;
    endPos?: Vector2D;
    angle?: number;
}

export class VisualEffect {
    position: Vector2D;
    type: EffectType;
    duration: number;
    startTime: number;
    options: EffectOptions;

    life: number;
    maxLife: number;

    // For particle effects like fire_explosion
    particles: {pos: Vector2D, vel: Vector2D, size: number, color: string}[] = [];

    constructor(position: Vector2D, type: EffectType, duration: number, options: EffectOptions = {}) {
        this.position = { ...position };
        this.type = type;
        this.duration = duration;
        this.startTime = Date.now();
        this.options = options;

        this.maxLife = duration;
        this.life = duration;

        if (this.type === 'fire_explosion') {
            for (let i = 0; i < 30; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 4 + 1;
                this.particles.push({
                    pos: { ...this.position },
                    vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                    size: Math.random() * 8 + 4,
                    color: ['#f97316', '#f59e0b', '#dc2626'][Math.floor(Math.random() * 3)]
                });
            }
        }
    }

    update() {
        this.life = this.maxLife - (Date.now() - this.startTime);
        if (this.type === 'fire_explosion') {
            this.particles.forEach(p => {
                p.pos.x += p.vel.x;
                p.pos.y += p.vel.y;
                p.vel.x *= 0.95; // friction
                p.vel.y *= 0.95;
                p.size *= 0.96;
            });
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        const progress = 1 - (this.life / this.maxLife);
        if (progress < 0 || progress > 1) return;

        ctx.save();
        
        switch (this.type) {
            case 'fire_explosion': {
                ctx.globalAlpha = 1 - progress;
                this.particles.forEach(p => {
                    ctx.beginPath();
                    ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.fill();
                });
                break;
            }
            case 'explosion': {
                const currentRadius = (this.options.radius || 80) * progress;
                ctx.globalAlpha = 1 - progress;
                ctx.beginPath();
                ctx.arc(this.position.x, this.position.y, currentRadius, 0, Math.PI * 2);
                ctx.fillStyle = this.options.color || '#f97316';
                ctx.fill();
                break;
            }
            case 'frost_nova': {
                const currentRadius = (this.options.radius || 150) * progress;
                ctx.globalAlpha = 1 - progress;
                ctx.beginPath();
                ctx.arc(this.position.x, this.position.y, currentRadius, 0, Math.PI * 2);
                ctx.strokeStyle = this.options.color || 'white';
                ctx.lineWidth = 8 * (1 - progress);
                ctx.stroke();
                break;
            }
            case 'stomp_wave': {
                const currentRadius = (this.options.radius || 100) * progress;
                ctx.globalAlpha = 1 - progress;
                ctx.beginPath();
                ctx.arc(this.position.x, this.position.y, currentRadius, 0, Math.PI * 2);
                ctx.strokeStyle = this.options.color || 'white';
                ctx.lineWidth = 5 * (1 - progress);
                ctx.stroke();
                break;
            }
            case 'dash_trail': {
                ctx.globalAlpha = 1 - progress;
                const endPos = this.options.endPos || this.position;
                ctx.beginPath();
                ctx.moveTo(this.position.x, this.position.y);
                ctx.lineTo(endPos.x, endPos.y);
                ctx.strokeStyle = this.options.color || 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 15 * (1 - progress);
                ctx.stroke();
                break;
            }
            case 'whirlwind': {
                ctx.globalAlpha = 1 - progress;
                const angle = progress * Math.PI * 4 + Date.now() / 100;
                const radius = (this.options.radius || 120) * (0.5 + progress * 0.5);
                ctx.beginPath();
                ctx.arc(this.position.x, this.position.y, radius, angle, angle + Math.PI * 0.8);
                ctx.strokeStyle = this.options.color || 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 8;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(this.position.x, this.position.y, radius, angle + Math.PI, angle + Math.PI * 1.8);
                ctx.stroke();
                break;
            }
            case 'rain_of_arrows': {
                // Persistent circle indicator
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.arc(this.position.x, this.position.y, this.options.radius || 120, 0, Math.PI * 2);
                ctx.fillStyle = this.options.color || '#22c55e';
                ctx.fill();
                // Falling arrows
                if (Math.random() > 0.8) {
                    ctx.globalAlpha = 0.8;
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 1;
                    const x = this.position.x + (Math.random() - 0.5) * (this.options.radius || 120) * 2;
                    const y = this.position.y + (Math.random() - 0.5) * (this.options.radius || 120) * 2;
                    if (getDistance({x,y}, this.position) < (this.options.radius || 120)) {
                        ctx.beginPath();
                        ctx.moveTo(x, y-10);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                    }
                }
                break;
            }
            case 'buff_aura': {
                 const currentRadius = (this.options.radius || 30) * (1 + progress * 0.2);
                 ctx.globalAlpha = (1 - progress) * 0.5;
                 ctx.beginPath();
                 ctx.arc(this.position.x, this.position.y, currentRadius, 0, Math.PI * 2);
                 ctx.fillStyle = this.options.color || 'rgba(255, 215, 0, 0.4)';
                 ctx.fill();
                 break;
            }
            case 'teleport_in': {
                ctx.globalAlpha = 1 - progress;
                const radius = (this.options.radius || 30) * progress;
                ctx.beginPath();
                ctx.arc(this.options.endPos!.x, this.options.endPos!.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = this.options.color || 'white';
                ctx.fill();
                break;
            }
            case 'teleport_out': {
                 ctx.globalAlpha = 1 - progress;
                 const radius = (this.options.radius || 30) * (1-progress);
                 ctx.beginPath();
                 ctx.arc(this.position.x, this.position.y, radius, 0, Math.PI * 2);
                 ctx.fillStyle = this.options.color || 'white';
                 ctx.fill();
                 break;
            }
        }

        ctx.restore();
    }

    isExpired(): boolean {
        return this.life <= 0;
    }
}
