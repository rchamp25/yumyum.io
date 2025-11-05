
import { Vector2D } from "../types";

export class FloatingText {
  position: Vector2D;
  text: string;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  opacity: number;

  constructor(text: string, position: Vector2D, color: string = 'white', size: number = 16) {
    this.text = text;
    this.position = { ...position };
    this.color = color;
    this.size = size;
    this.maxLife = 60; // 60 frames = 1 second
    this.life = this.maxLife;
    this.opacity = 1;
  }

  update() {
    this.life--;
    this.position.y -= 0.5;
    this.opacity = this.life / this.maxLife;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.font = `bold ${this.size}px sans-serif`;
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.opacity;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.fillText(this.text, this.position.x, this.position.y);
    ctx.restore();
  }

  isExpired(): boolean {
    return this.life <= 0;
  }
}
