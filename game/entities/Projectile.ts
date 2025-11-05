
import { Vector2D } from "../types";
import { Character } from "./Character";
import { getDistance } from "../utils";

export class Projectile {
  position: Vector2D;
  velocity: Vector2D;
  damage: number;
  speed: number;
  radius: number;
  ownerId: string | number;
  color: string;
  life: number = 200; // frames

  constructor(startPos: Vector2D, direction: Vector2D, damage: number, speed: number, ownerId: string | number, color: string = 'white', radius: number = 5) {
    this.position = { ...startPos };
    this.velocity = { x: direction.x * speed, y: direction.y * speed };
    this.damage = damage;
    this.speed = speed;
    this.ownerId = ownerId;
    this.color = color;
    this.radius = radius;
  }

  update() {
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    this.life--;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  isExpired(): boolean {
    return this.life <= 0;
  }
  
  hasCollided(character: Character): boolean {
      if (character.id === this.ownerId || character.isDead) {
          return false;
      }
      return getDistance(this.position, character.position) < this.radius + character.radius;
  }
}
