
import { Vector2D } from './types';

export function getDistance(p1: Vector2D, p2: Vector2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalizeVector(vec: Vector2D): Vector2D {
  const length = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: vec.x / length,
    y: vec.y / length,
  };
}

// Generic interface to avoid importing the full Enemy class
interface Targetable {
    position: Vector2D;
    isDead: boolean;
}

export function findNearestEnemy<T extends Targetable>(position: Vector2D, enemies: T[], maxRange: number = Infinity): T | null {
    let nearest: T | null = null;
    let minDist = maxRange;

    for (const enemy of enemies) {
        if (enemy.isDead) continue;
        const dist = getDistance(position, enemy.position);
        if (dist < minDist) {
            minDist = dist;
            nearest = enemy;
        }
    }
    return nearest;
}
