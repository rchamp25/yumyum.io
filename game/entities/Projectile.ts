import { Vector2D, StatusEffect } from "../types";
import { normalizeVector } from "../utils";

let nextId = 0;

export class Projectile {
  id: number;
  position: Vector2D;
  velocity: Vector2D;
  radius: number = 5;
  damage: number;
  speed: number;
  ownerId: string | number;
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
  }

  isExpired(): boolean {
      return this.distanceTraveled >= this.range;
  }
}
