import { Character } from './Character';
import { Vector2D, CharacterData, GameContext, SkillState, CharacterClass, SkillDefinition, Item, ItemSlot, StatusEffect, Recipe } from '../types';
import { normalizeVector, getDistance, findNearestEnemy } from '../utils';
import { GAME_CONFIG } from '../constants';
import { Projectile } from './Projectile';
import { GroundEffect } from './GroundEffect';
import { VisualEffect } from './VisualEffect';

// FIX: Restored full skill definitions for all character classes.
const SKILLS: { [key in CharacterClass]: SkillDefinition[] } = {
  [CharacterClass.Warrior]: [
    {
      id: 'stomp', name: 'Stomp', description: 'Damage and briefly stun nearby enemies.', cooldown: 8000,
      effect: (caster, target, game) => {
        game.addVisualEffect(new VisualEffect(caster.position, 'stomp_wave', 300, { radius: 100 }));
        game.enemies.forEach(enemy => {
          if (getDistance(caster.position, enemy.position) < 100) {
            const ft = enemy.takeDamage(caster.damage * 0.5);
            if(ft) game.addFloatingText(ft);
            // FIX: Removed startTime from addStatusEffect call.
            enemy.addStatusEffect({ type: 'stun', duration: 1000 });
          }
        });
      }
    },
    {
      id: 'charge', name: 'Charge', description: 'Dash forward, damaging the first enemy hit.', cooldown: 10000, range: 400,
      effect: (caster, target, game) => {
        const dir = normalizeVector({ x: (target as Vector2D).x - caster.position.x, y: (target as Vector2D).y - caster.position.y });
        const endPos = { x: caster.position.x + dir.x * 400, y: caster.position.y + dir.y * 400 };
        game.addVisualEffect(new VisualEffect(caster.position, 'dash_trail', 400, { endPos }));
        caster.position = endPos;
      }
    },
    {
      id: 'whirlwind', name: 'Whirlwind', description: 'Spin, dealing continuous damage to nearby enemies.', cooldown: 12000,
      effect: (caster, target, game) => {
        // FIX: Added 'whirlwind' as a valid ground effect type.
        game.addGroundEffect(new GroundEffect(caster.position, 120, 3000, 'rgba(255,255,255,0.2)', { type: 'dot', duration: 3000, damagePerTick: caster.damage * 1.5 }, 'whirlwind'));
      }
    },
    {
      id: 'rallying_cry', name: 'Rallying Cry', description: 'Temporarily increase your damage.', cooldown: 20000,
      effect: (caster, target, game) => {
        // FIX: Removed startTime from addStatusEffect call.
        caster.addStatusEffect({ type: 'damage_buff', duration: 10000, multiplier: 1.3 });
        game.addVisualEffect(new VisualEffect(caster.position, 'buff_aura', 10000, { color: 'rgba(239, 68, 68, 0.4)' }));
      }
    },
    {
      id: 'shield_bash', name: 'Shield Bash', description: 'Slam a target, dealing damage and stunning them.', cooldown: 6000, range: 30, requiresTarget: true,
      effect: (caster, target, game) => {
          if (target instanceof Character) {
              const ft = target.takeDamage(caster.damage * 1.2);
              if(ft) game.addFloatingText(ft);
              // FIX: Removed startTime from addStatusEffect call.
              target.addStatusEffect({ type: 'stun', duration: 2000 });
          }
      }
    },
  ],
  [CharacterClass.Mage]: [
    {
      id: 'fireball', name: 'Fireball', description: 'Launch a fiery projectile that explodes on impact.', cooldown: 3000, range: 500, requiresTarget: true,
      effect: (caster, target, game) => {
        const dir = normalizeVector({ x: (target as Vector2D).x - caster.position.x, y: (target as Vector2D).y - caster.position.y });
        const proj = new Projectile(caster.position, dir, caster.damage, 8, caster.id, '#f97316');
        (proj as any).onHitEffects = { type: 'explosion', radius: 80 };
        game.addProjectile(proj);
      }
    },
    {
      id: 'frost_nova', name: 'Frost Nova', description: 'Emit a wave of frost, damaging and slowing nearby enemies.', cooldown: 10000,
      effect: (caster, target, game) => {
        game.addVisualEffect(new VisualEffect(caster.position, 'frost_nova', 500, { radius: 150, color: '#38bdf8' }));
        game.enemies.forEach(enemy => {
          if (getDistance(caster.position, enemy.position) < 150) {
            const ft = enemy.takeDamage(caster.damage * 0.7);
            if(ft) game.addFloatingText(ft);
            // FIX: Removed startTime from addStatusEffect call.
            enemy.addStatusEffect({ type: 'slow', duration: 4000 });
          }
        });
      }
    },
    {
      id: 'chain_lightning', name: 'Chain Lightning', description: 'A bolt that bounces to multiple enemies.', cooldown: 7000, range: 400, requiresTarget: true,
      effect: (caster, target, game) => {
          if (target instanceof Character) {
              const dir = normalizeVector({ x: target.position.x - caster.position.x, y: target.position.y - caster.position.y });
              const proj = new Projectile(caster.position, dir, caster.damage, 10, caster.id, '#a78bfa');
              (proj as any).bounces = 3;
              game.addProjectile(proj);
          }
      }
    },
    {
      id: 'teleport', name: 'Teleport', description: 'Instantly move to a nearby location.', cooldown: 12000, range: 350,
      effect: (caster, target, game) => {
        const endPos = target as Vector2D;
        game.addVisualEffect(new VisualEffect(caster.position, 'teleport_out', 200));
        caster.position = endPos;
        game.addVisualEffect(new VisualEffect(caster.position, 'teleport_in', 200, {endPos}));
      }
    },
    {
      id: 'arcane_shield', name: 'Arcane Shield', description: 'Create a temporary shield that absorbs damage.', cooldown: 25000,
      effect: (caster, target, game) => {
          const shieldAmount = caster.maxHealth * 0.5;
          // FIX: Removed startTime from addStatusEffect call.
          caster.addStatusEffect({type: 'shield', duration: 10000, shieldHealth: shieldAmount });
      }
    },
  ],
  [CharacterClass.Archer]: [
    {
      id: 'piercing_shot', name: 'Piercing Shot', description: 'Fire an arrow that pierces through multiple enemies.', cooldown: 1000, range: 600, requiresTarget: true,
      effect: (caster, target, game) => {
        const dir = normalizeVector({ x: (target as Vector2D).x - caster.position.x, y: (target as Vector2D).y - caster.position.y });
        const proj = new Projectile(caster.position, dir, caster.damage, 12, caster.id, '#22c55e');
        (proj as any).piercing = true;
        game.addProjectile(proj);
      }
    },
    {
      id: 'volley', name: 'Volley', description: 'Fire a cone of 3 arrows.', cooldown: 6000, range: 500, requiresTarget: true,
      effect: (caster, target, game) => {
        const baseDir = normalizeVector({ x: (target as Vector2D).x - caster.position.x, y: (target as Vector2D).y - caster.position.y });
        const angle = Math.atan2(baseDir.y, baseDir.x);
        for(let i = -1; i <= 1; i++) {
            const newAngle = angle + i * (Math.PI / 12); // 15 degree spread
            const dir = { x: Math.cos(newAngle), y: Math.sin(newAngle) };
            game.addProjectile(new Projectile(caster.position, dir, caster.damage * 0.8, 10, caster.id, '#22c55e'));
        }
      }
    },
    {
      id: 'rain_of_arrows', name: 'Rain of Arrows', description: 'Fire arrows into the sky that rain down on an area.', cooldown: 15000, range: 500,
      effect: (caster, target, game) => {
        game.addGroundEffect(new GroundEffect(target as Vector2D, 120, 5000, '#16a34a', { type: 'dot', duration: 5000, damagePerTick: caster.damage }, 'rain_of_arrows'));
      }
    },
    {
      id: 'poison_arrow', name: 'Poison Arrow', description: 'Fire an arrow that poisons the target, dealing damage over time.', cooldown: 8000, range: 600, requiresTarget: true,
      effect: (caster, target, game) => {
          if (target instanceof Character) {
            const dir = normalizeVector({ x: target.position.x - caster.position.x, y: target.position.y - caster.position.y });
            const proj = new Projectile(caster.position, dir, caster.damage * 0.5, 10, caster.id, '#84cc16');
            // FIX: Removed startTime from status effect definition.
            (proj as any).onHitEffects = { type: 'status', effect: { type: 'dot', duration: 5000, damagePerTick: caster.damage } };
            game.addProjectile(proj);
          }
      }
    },
    {
      id: 'dash', name: 'Dash', description: 'Quickly dash in a direction.', cooldown: 7000, range: 300,
      effect: (caster, target, game) => {
        const dir = normalizeVector({ x: (target as Vector2D).x - caster.position.x, y: (target as Vector2D).y - caster.position.y });
        const endPos = { x: caster.position.x + dir.x * 300, y: caster.position.y + dir.y * 300 };
        game.addVisualEffect(new VisualEffect(caster.position, 'dash_trail', 300, { endPos, color: 'rgba(34, 197, 94, 0.5)' }));
        caster.position = endPos;
      }
    },
  ],
};


export class Player extends Character {
  characterData: CharacterData;
  skills: SkillState[];
  xpToNextLevel: number;
  id: string; // override id to be string
  baseStats: CharacterData['stats'];

  constructor(position: Vector2D, characterData: CharacterData) {
    super(position, 16, characterData.stats.maxHealth, '#1e90ff', characterData.stats.damage);
    this.id = characterData.id;
    this.characterData = JSON.parse(JSON.stringify(characterData)); // Deep copy
    this.baseStats = JSON.parse(JSON.stringify(characterData.stats));
    this.xpToNextLevel = GAME_CONFIG.BASE_XP_TO_NEXT_LEVEL;
    
    this.skills = SKILLS[this.characterData.characterClass].map(definition => ({
        definition,
        lastUsed: 0,
    }));
    
    this.recalculateStats();
    // FIX: Player health should reflect saved state, not always be full.
    this.health = characterData.stats.health || characterData.stats.maxHealth; 
    this.updateLevel();
  }

  recalculateStats() {
    // Reset to base
    this.maxHealth = this.baseStats.maxHealth;
    this.damage = this.baseStats.damage;
    this.characterData.stats.speed = this.baseStats.speed;

    // Apply equipment stats
    Object.values(this.characterData.equipment).forEach(item => {
        if (item && item.stats) {
            this.maxHealth += item.stats.maxHealth || 0;
            this.damage += item.stats.damage || 0;
            this.characterData.stats.speed += item.stats.speed || 0;
        }
    });
    
    // Apply temporary buffs
    const damageBuff = this.statusEffects.find(e => e.type === 'damage_buff');
    if (damageBuff && damageBuff.multiplier) {
        this.damage *= damageBuff.multiplier;
    }

    if (this.health > this.maxHealth) {
        this.health = this.maxHealth;
    }
  }

  update(keys: Set<string>, mousePosition: Vector2D, game: GameContext) {
    const oldHealth = this.maxHealth;
    
    this.processStatusEffects();
    this.recalculateStats();

    if (this.maxHealth !== oldHealth) { // If max health changed (e.g. from gear)
       this.health = this.health * (this.maxHealth / oldHealth); // Scale health
    }

    if (this.isDead || this.hasStatus('stun')) return;

    // Movement
    let moveDirection: Vector2D = { x: 0, y: 0 };
    if (keys.has('w') || keys.has('arrowup')) moveDirection.y -= 1;
    if (keys.has('s') || keys.has('arrowdown')) moveDirection.y += 1;
    if (keys.has('a') || keys.has('arrowleft')) moveDirection.x -= 1;
    if (keys.has('d') || keys.has('arrowright')) moveDirection.x += 1;

    if (moveDirection.x !== 0 || moveDirection.y !== 0) {
      moveDirection = normalizeVector(moveDirection);
      const currentSpeed = this.characterData.stats.speed * (this.hasStatus('slow') ? 0.5 : 1);
      this.position.x += moveDirection.x * currentSpeed;
      this.position.y += moveDirection.y * currentSpeed;
    }
    
    // Clamp position to world bounds
    this.position.x = Math.max(this.radius, Math.min(GAME_CONFIG.WORLD_WIDTH - this.radius, this.position.x));
    this.position.y = Math.max(this.radius, Math.min(GAME_CONFIG.WORLD_HEIGHT - this.radius, this.position.y));
  }

  useSkill(index: number, mouseTarget: Vector2D, game: GameContext) {
    if (index < 0 || index >= this.skills.length) return;
    const skill = this.skills[index];
    const now = Date.now();

    const attackSpeedBuff = this.statusEffects.find(e => e.type === 'attack_speed_buff');
    const currentCooldown = attackSpeedBuff ? skill.definition.cooldown / (attackSpeedBuff.multiplier || 1) : skill.definition.cooldown;
    
    if (now - skill.lastUsed >= currentCooldown) {
        let target: Vector2D | Character = mouseTarget;
        if (skill.definition.requiresTarget) {
            const nearestEnemy = findNearestEnemy(this.position, game.enemies, skill.definition.range);
            if (nearestEnemy) {
                target = nearestEnemy;
            } else {
                 // If no enemy in range for a required-target spell, don't cast
                return; 
            }
        }
        
        skill.definition.effect(this, target, game);
        skill.lastUsed = now;
    }
  }

  addXP(amount: number) {
    this.characterData.xp += amount;
    if (this.characterData.xp >= this.xpToNextLevel) {
      this.levelUp();
    }
  }

  levelUp() {
    this.characterData.level++;
    this.characterData.xp = this.characterData.xp - this.xpToNextLevel;
    this.updateLevel();

    // Improve base stats
    this.baseStats.maxHealth += 10;
    this.baseStats.damage += 2;
    this.recalculateStats();
    this.health = this.maxHealth; // Full heal on level up
  }

  private updateLevel() {
    this.xpToNextLevel = Math.floor(
      GAME_CONFIG.BASE_XP_TO_NEXT_LEVEL * Math.pow(GAME_CONFIG.XP_PER_LEVEL_MULTIPLIER, this.characterData.level - 1)
    );
  }
  
  addGold(amount: number) { this.characterData.gold += amount; }
  incrementKills() { this.characterData.kills++; }

  addItem(item: Item): boolean {
    if (item.stackable) {
        const existingStack = this.characterData.inventory.find(i => i?.id === item.id);
        if (existingStack && existingStack.quantity) {
            existingStack.quantity += item.quantity || 1;
            return true;
        }
    }
    const emptySlot = this.characterData.inventory.findIndex(slot => slot === null);
    if (emptySlot !== -1) {
        this.characterData.inventory[emptySlot] = item;
        return true;
    }
    return false; // Inventory full
  }

  equipItem(inventoryIndex: number) {
    const item = this.characterData.inventory[inventoryIndex];
    if (item && item.type === 'Equipment' && item.slot) {
        const oldItem = this.characterData.equipment[item.slot];
        this.characterData.equipment[item.slot] = item;
        this.characterData.inventory[inventoryIndex] = oldItem;
        this.recalculateStats();
    }
  }

  unequipItem(slot: ItemSlot) {
      const item = this.characterData.equipment[slot];
      if (item) {
          if (this.addItem(item)) {
              this.characterData.equipment[slot] = null;
              this.recalculateStats();
          }
      }
  }
  
  craftItem(recipe: Recipe): boolean {
    // Check for materials
    const hasMaterials = recipe.ingredients.every(ing => {
        const materialStack = this.characterData.inventory.find(i => i?.id === ing.materialId);
        return materialStack && materialStack.quantity && materialStack.quantity >= ing.quantity;
    });

    if (!hasMaterials) return false;

    // Check for inventory space for the result
    if (this.characterData.inventory.filter(i => i === null).length === 0) {
        return false;
    }

    // Consume materials
    recipe.ingredients.forEach(ing => {
        const materialStack = this.characterData.inventory.find(i => i?.id === ing.materialId);
        if (materialStack && materialStack.quantity) {
            materialStack.quantity -= ing.quantity;
            if (materialStack.quantity <= 0) {
                const index = this.characterData.inventory.indexOf(materialStack);
                this.characterData.inventory[index] = null;
            }
        }
    });

    // Add crafted item
    this.addItem({ ...recipe.result });
    return true;
  }
  
  draw(ctx: CanvasRenderingContext2D) {
    super.draw(ctx, false);
  }

  getClassName(): string {
      return CharacterClass[this.characterData.characterClass];
  }

  getFinalCharacterData(): CharacterData {
      const finalData = JSON.parse(JSON.stringify(this.characterData));
      finalData.stats.health = Math.round(this.health);
      finalData.stats.maxHealth = this.maxHealth;
      finalData.stats.damage = this.baseStats.damage; // Save base damage without buffs
      finalData.stats.speed = this.baseStats.speed;
      return finalData;
  }
}