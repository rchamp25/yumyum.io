import { Character } from './Character';
import { Player } from './Player';
import { Vector2D, EnemyType, GameContext } from '../types';
import { getDistance, normalizeVector } from '../utils';
import { GAME_CONFIG } from '../constants';
import { Projectile } from './Projectile';

export { EnemyType };

export class Enemy extends Character {
  enemyType: EnemyType;
  speed: number;
  target: Player | null = null;
  lastAttackTime: number = 0;
  xpValue: number;
  attackRange: number;
  attackCooldown: number;
  initialPosition: Vector2D;
  isReturning: boolean = false;

  constructor(position: Vector2D, type: EnemyType = EnemyType.Grunt) {
    let radius = 14, health = 30, color = '#a855f7', damage = 5, speed = GAME_CONFIG.ENEMY_SPEED, xp = 10;
    let attackRange = GAME_CONFIG.ENEMY_ATTACK_RANGE;
    let attackCooldown = GAME_CONFIG.ENEMY_ATTACK_COOLDOWN;

    switch (type) {
      case EnemyType.Grunt:
        break;
      case EnemyType.Scout:
        radius = 10; health = 20; color = '#f59e0b'; damage = 4; speed *= 1.5; xp = 8;
        break;
      case EnemyType.Ranger:
        radius = 15; health = 40; color = '#10b981'; damage = 7; speed *= 0.8; xp = 15;
        attackRange = 250; attackCooldown = 1800;
        break;
      case EnemyType.Tank:
        radius = 20; health = 80; color = '#64748b'; damage = 8; speed *= 0.6; xp = 20;
        attackRange = 25;
        break;
    }
    super(position, radius, health, color, damage);
    this.name = EnemyType[type];
    this.enemyType = type;
    this.speed = speed * (0.9 + Math.random() * 0.2);
    this.xpValue = xp;
    this.attackRange = attackRange;
    this.attackCooldown = attackCooldown;
    this.initialPosition = { ...position };
  }

  update(player: Player, game: GameContext, worldWidth: number, worldHeight: number) {
    this.processStatusEffects();
    if (this.isDead || this.hasStatus('stun')) return;

    const worldCenter = { x: worldWidth / 2, y: worldHeight / 2 };
    const isPlayerInSafeZone = getDistance(player.position, worldCenter) < GAME_CONFIG.SAFE_ZONE_RADIUS;

    // --- Return Logic ---
    if (this.isReturning) {
        const distanceToSpawn = getDistance(this.position, this.initialPosition);
        if (distanceToSpawn < this.speed) {
            // Arrived at spawn
            this.position = { ...this.initialPosition };
            this.isReturning = false;
            this.health = this.maxHealth; // Reset health
        } else {
            // Move back to spawn
            const direction = normalizeVector({
                x: this.initialPosition.x - this.position.x,
                y: this.initialPosition.y - this.position.y,
            });
            const currentSpeed = this.speed * (this.hasStatus('slow') ? 0.5 : 1);
            this.position.x += direction.x * currentSpeed;
            this.position.y += direction.y * currentSpeed;
        }
        return; // Don't do anything else while returning
    }

    // --- Target Management ---
    const distanceToPlayer = getDistance(this.position, player.position);
    
    // Check for de-aggro conditions
    if (this.target) {
        const distanceToSpawn = getDistance(this.position, this.initialPosition);
        if (isPlayerInSafeZone || distanceToSpawn > GAME_CONFIG.ENEMY_LEASH_RANGE) {
            this.target = null;
            this.isReturning = true;
            return; // Start returning immediately
        }
    }

    // Check for aggro condition
    if (!this.target && !isPlayerInSafeZone && distanceToPlayer < GAME_CONFIG.ENEMY_AGGRO_RANGE) {
        this.target = player;
    }

    // --- Action Logic ---
    if (this.target) {
        const direction = normalizeVector({
            x: this.target.position.x - this.position.x,
            y: this.target.position.y - this.position.y,
        });

        if (distanceToPlayer > this.attackRange) {
            // Move towards target
            const currentSpeed = this.speed * (this.hasStatus('slow') ? 0.5 : 1);
            const nextX = this.position.x + direction.x * currentSpeed;
            const nextY = this.position.y + direction.y * currentSpeed;

            // Prevent entering safe zone
            const nextDistanceToCenter = getDistance({ x: nextX, y: nextY }, worldCenter);
            if (nextDistanceToCenter > GAME_CONFIG.SAFE_ZONE_RADIUS - this.radius) {
                this.position.x = nextX;
                this.position.y = nextY;
            }
        } else {
            // Attack target
            const now = Date.now();
            if (now - this.lastAttackTime > this.attackCooldown) {
                this.lastAttackTime = now;
                this.attack(player, game, direction);
            }
        }
    }
  }

  attack(player: Player, game: GameContext, direction: Vector2D) {
      if (this.enemyType === EnemyType.Ranger) {
// FIX: Use the addProjectile method from the game context for consistency and to adhere to the intended API.
          game.addProjectile(new Projectile(this.position, direction, this.damage, 6, this.id, this.name, '#f43f5e'));
      } else {
          const ft = player.takeDamage(this.damage, this);
// FIX: Use the addFloatingText method from the game context as `floatingTexts` is not a property of the context.
          if (ft) game.addFloatingText(ft);
      }
  }
  
  draw(ctx: CanvasRenderingContext2D) {
    super.draw(ctx, true); // Always show health bar
  }
}