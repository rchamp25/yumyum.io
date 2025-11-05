import { Vector2D, StatusEffect, GameContext, CharacterClass } from "../types";
import { normalizeVector, getDistance, findNearestEnemy } from "../utils";
import { Character } from "./Character";
import { Player } from "./Player";
import { Enemy } from "./Enemy";
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


  constructor(
    startPosition: Vector2D,
    direction: Vector2D,
    damage: number,
    speed: number,
    ownerId: string | number,
    ownerName: string,
    color: string = 'white'
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
    this.color = color;
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

    const ft = target.takeDamage(this.damage, { name: this.ownerName });
    if (ft) game.addFloatingText(ft);
    this.hitIds.push(target.id);

    // Apply on-hit effects
    if (this.onHitEffects) {
        switch (this.onHitEffects.type) {
            case 'explosion':
                game.addVisualEffect(new VisualEffect(this.position, 'fire_explosion', 500, {radius: this.onHitEffects.radius}));
                const targets = (target instanceof Player) ? [game.player] : game.enemies;
                targets.forEach(enemy => {
                    if (enemy.id !== target.id && getDistance(this.position, enemy.position) < (this.onHitEffects!.radius || 80)) {
                         const explosionFt = enemy.takeDamage(this.damage * 0.75, { name: `${this.ownerName}'s Explosion` });
                         if(explosionFt) game.addFloatingText(explosionFt);
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