import { Vector2D } from "./types";
import { Enemy } from "./entities/Enemy";

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

export function findNearestEnemy(position: Vector2D, enemies: Enemy[], maxRange?: number): Enemy | null {
    let nearestEnemy: Enemy | null = null;
    let minDistance = maxRange !== undefined ? maxRange : Infinity;

    for (const enemy of enemies) {
        if (enemy.isDead) continue;
        
        const distance = getDistance(position, enemy.position);
        
        if (distance < minDistance) {
            minDistance = distance;
            nearestEnemy = enemy;
        }
    }

    return nearestEnemy;
}