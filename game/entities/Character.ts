import { Vector2D, StatusEffect } from "../types";
import { FloatingText } from "./FloatingText";

let nextId = 0;

export abstract class Character {
  // FIX: Changed id type from number to `string | number` to allow both string IDs for players and numeric IDs for other characters.
  id: string | number;
  position: Vector2D;
  radius: number;
  health: number;
  maxHealth: number;
  color: string;
  damage: number;
  statusEffects: StatusEffect[] = [];
  isDead: boolean = false;
  shield: number = 0;

  constructor(position: Vector2D, radius: number, health: number, color: string, damage: number) {
    this.id = nextId++;
    this.position = position;
    this.radius = radius;
    this.health = health;
    this.maxHealth = health;
    this.color = color;
    this.damage = damage;
  }

  abstract update(...args: any[]): void;

  draw(ctx: CanvasRenderingContext2D, alwaysShowHealthBar: boolean = false) {
    // Draw Shield
    if (this.shield > 0) {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(96, 165, 250, 1)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Health bar
    if (alwaysShowHealthBar || this.health < this.maxHealth || this.shield > 0) {
      const barWidth = this.radius * 2;
      const barHeight = 5;
      const barX = this.position.x - this.radius;
      const barY = this.position.y - this.radius - 10;
      
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      const healthPercentage = this.health / this.maxHealth;
      ctx.fillStyle = healthPercentage > 0.5 ? '#4ade80' : healthPercentage > 0.2 ? '#facc15' : '#f87171';
      ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
      
      // Shield bar overlay
      if (this.shield > 0) {
        const shieldEffect = this.statusEffects.find(e => e.type === 'shield');
        if (shieldEffect && shieldEffect.shieldHealth) {
           const shieldPercentage = this.shield / shieldEffect.shieldHealth;
           ctx.fillStyle = 'rgba(59, 130, 246, 0.7)';
           ctx.fillRect(barX, barY, barWidth * shieldPercentage, barHeight);
        }
      }
    }
  }

  takeDamage(amount: number): FloatingText | null {
    if (this.isDead) return null;

    let damageTaken = amount;
    
    if (this.shield > 0) {
      const shieldDamage = Math.min(this.shield, damageTaken);
      this.shield -= shieldDamage;
      damageTaken -= shieldDamage;
      if (this.shield <= 0) {
          this.statusEffects = this.statusEffects.filter(e => e.type !== 'shield');
      }
    }

    this.health -= damageTaken;
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
    }
    return new FloatingText(Math.round(amount).toString(), {x: this.position.x, y: this.position.y - this.radius}, '#f87171');
  }

  addStatusEffect(effect: Omit<StatusEffect, 'startTime'>) {
    if (effect.type === 'shield' && effect.shieldHealth) {
        const existingShield = this.statusEffects.find(e => e.type === 'shield');
        if (existingShield && existingShield.shieldHealth && existingShield.shieldHealth > effect.shieldHealth) {
            return;
        }
        this.statusEffects = this.statusEffects.filter(e => e.type !== 'shield');
        this.shield = effect.shieldHealth;
    }
    this.statusEffects.push({ ...effect, startTime: Date.now() });
  }

  hasStatus(type: StatusEffect['type']): boolean {
    return this.statusEffects.some(e => e.type === type);
  }

  processStatusEffects() {
    const now = Date.now();
    this.statusEffects = this.statusEffects.filter(effect => {
        const elapsed = now - effect.startTime;
        if (elapsed >= effect.duration) {
            if (effect.type === 'shield') this.shield = 0;
            return false;
        }
        if (effect.type === 'dot' && effect.damagePerTick) {
            const damage = (effect.damagePerTick / effect.duration) * (1000/60); 
            this.takeDamage(damage);
        }
        return true;
    });
  }
}