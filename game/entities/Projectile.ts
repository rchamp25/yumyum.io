
import { Vector2D, StatusEffect, GameContext } from "../types";
import { normalizeVector, getDistance, findNearestEnemy } from "../math";
import { Character } from "./Character";
import { Player } from "./Player";
import { VisualEffect } from "./VisualEffect";

let nextId = 0;

export class Projectile {
  id: number;
  position: Vector2D;
  velocity: Vector2D;
  radius: number = 5;
  damage: number;
  speed: number;
  ownerId: string | number;
  ownerName: string;
  ownerLevel: number;
  color: string;
  piercing: boolean = false;
  bounces: number = 0;
  hitIds: (string | number)[] = [];
  onHitEffects?: { 
    type: 'explosion' | 'status', 
    radius?: number, 
    effect?: Omit<StatusEffect, 'startTime'> 
  };
  range: number = 1000;
  distanceTraveled: number = 0;
  bossDamageMultiplier: number;
  isHostile: boolean;


  constructor(
    startPosition: Vector2D,
    direction: Vector2D,
    damage: number,
    speed: number,
    ownerId: string | number,
    ownerName: string,
    ownerLevel: number,
    color: string = 'white',
    bossDamageMultiplier: number = 1,
    isHostile: boolean = false
  ) {
    this.id = nextId++;
    this.position = { ...startPosition };
    const normalizedDir = normalizeVector(direction);
    this.velocity = {
      x: normalizedDir.x * speed,
      y: normalizedDir.y * speed,
    };
    this.damage = damage;
    this.speed = speed;
    this.ownerId = ownerId;
    this.ownerName = ownerName;
    this.ownerLevel = ownerLevel;
    this.color = color;
    this.bossDamageMultiplier = bossDamageMultiplier;
    this.isHostile = isHostile;
  }

  update() {
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    this.distanceTraveled += this.speed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    
    // Trail effect
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(this.position.x, this.position.y);
    ctx.lineTo(this.position.x - this.velocity.x * 2, this.position.y - this.velocity.y * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.radius;
    ctx.stroke();
    ctx.restore();
  }
  
  onHit(target: Character, game: GameContext) {
    if (this.hitIds.includes(target.id)) return;

    if (this.ownerId === game.player.id) {
        game.player.enterCombat();
    }

    let finalDamage = this.damage;
    // Check if target is boss and apply multiplier
    if ('isBoss' in target && (target as any).isBoss) {
        finalDamage *= this.bossDamageMultiplier;
    }

    const ft = target.takeDamage(finalDamage, { name: this.ownerName, level: this.ownerLevel });
    if (ft) {
        game.addFloatingText(ft);
        if (target.id === game.player.id) {
            game.playSound('damage');
        } else {
            game.playSound('hit');
        }
    }
    this.hitIds.push(target.id);

    // Apply on-hit effects
    if (this.onHitEffects) {
        switch (this.onHitEffects.type) {
            case 'explosion':
                game.addVisualEffect(new VisualEffect(this.position, 'fire_explosion', 500, {radius: this.onHitEffects.radius}));
                const targets = (target instanceof Player) ? [game.player] : game.enemies;
                targets.forEach(enemy => {
                    if (enemy.id !== target.id && getDistance(this.position, enemy.position) < (this.onHitEffects!.radius || 80)) {
                         let explosionDamage = this.damage * 0.75;
                         if ('isBoss' in enemy && (enemy as any).isBoss) {
                             explosionDamage *= this.bossDamageMultiplier;
                         }
                         const explosionFt = enemy.takeDamage(explosionDamage, { name: `${this.ownerName}'s Explosion`, level: this.ownerLevel });
                         if(explosionFt) {
                             game.addFloatingText(explosionFt);
                             if (enemy.id === game.player.id) game.playSound('damage');
                             else game.playSound('hit');
                         }
                    }
                });
                break;
            case 'status':
                if (this.onHitEffects.effect) {
                    target.addStatusEffect(this.onHitEffects.effect);
                }
                break;
        }
    }

    // Handle bouncing
    if (this.bounces > 0) {
        this.bounces--;
        // Use 'as any' to cast to the generic requirement, or rely on the fact that Enemy satisfies Targetable
        const newTarget = findNearestEnemy(this.position, game.enemies.filter(e => !this.hitIds.includes(e.id)), 300);
        if (newTarget) {
            const direction = normalizeVector({ x: newTarget.position.x - this.position.x, y: newTarget.position.y - this.position.y });
            this.velocity.x = direction.x * this.speed;
            this.velocity.y = direction.y * this.speed;
        } else {
            this.expire();
        }
    }
  }

  expire() {
    this.distanceTraveled = this.range;
  }

  isExpired(): boolean {
      return this.distanceTraveled >= this.range;
  }
}
