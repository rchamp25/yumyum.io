
import { Character } from './Character';
import { Vector2D, CharacterData, CharacterClass, GameContext, SkillState, Item, ItemSlot, SkillDefinition } from '../types';
import { GAME_CONFIG } from '../constants';
import { normalizeVector, getDistance } from '../utils';
import { Projectile } from './Projectile';
import { FloatingText } from './FloatingText';
import { GroundEffect } from './GroundEffect';
import { VisualEffect } from './VisualEffect';

// SKILL DEFINITIONS
const SKILLS_WARRIOR: SkillDefinition[] = [
  {
    name: 'Dash',
    description: 'Quickly dash forward.',
    cooldown: 4000,
    execute: (player, game) => {
        const direction = normalizeVector({ x: player.mousePos.x - player.position.x, y: player.mousePos.y - player.position.y });
        const dashDistance = 200;
        const endPos = { x: player.position.x + direction.x * dashDistance, y: player.position.y + direction.y * dashDistance };
        game.addVisualEffect(new VisualEffect(player.position, 'dash_trail', 200, { endPos }));
        player.position = endPos;
    }
  },
  {
    name: 'Stomp',
    description: 'Slam the ground, stunning nearby enemies.',
    cooldown: 8000,
    execute: (player, game) => {
        const radius = 120;
        game.addVisualEffect(new VisualEffect(player.position, 'stomp_wave', 300, { radius }));
        game.enemies.forEach(enemy => {
            if (getDistance(player.position, enemy.position) < radius) {
                const ft = enemy.takeDamage(player.damage * 1.5);
                if (ft) game.addFloatingText(ft);
                enemy.addStatusEffect({ type: 'stun', duration: 2000 });
            }
        });
    }
  },
  {
    name: 'Whirlwind',
    description: 'Spin, damaging all adjacent enemies.',
    cooldown: 6000,
    execute: (player, game) => {
        game.addVisualEffect(new VisualEffect(player.position, 'whirlwind', 1000, { radius: player.radius + 30 }));
        game.enemies.forEach(enemy => {
            if (getDistance(player.position, enemy.position) < player.radius + 30) {
                const ft = enemy.takeDamage(player.damage * 0.5);
                if (ft) game.addFloatingText(ft);
            }
        });
    }
  },
];

const SKILLS_MAGE: SkillDefinition[] = [
  {
    name: 'Teleport',
    description: 'Instantly move to the cursor location.',
    cooldown: 6000,
    execute: (player, game) => {
      game.addVisualEffect(new VisualEffect(player.position, 'teleport_out', 200));
      player.position.x = player.mousePos.x;
      player.position.y = player.mousePos.y;
      game.addVisualEffect(new VisualEffect(player.position, 'teleport_in', 200, { endPos: player.position }));
    }
  },
  {
    name: 'Fireball',
    description: 'Launch an explosive fireball.',
    cooldown: 3000,
    execute: (player, game) => {
        const direction = normalizeVector({ x: player.mousePos.x - player.position.x, y: player.mousePos.y - player.position.y });
        game.addProjectile(new Projectile(player.position, direction, player.damage * 2, 8, player.id, '#f97316', 10));
    }
  },
  {
      name: 'Frost Nova',
      description: 'Emit a ring of ice, slowing enemies.',
      cooldown: 10000,
      execute: (player, game) => {
          const radius = 150;
          game.addVisualEffect(new VisualEffect(player.position, 'frost_nova', 500, { radius }));
          game.enemies.forEach(enemy => {
              if (getDistance(player.position, enemy.position) < radius) {
                  enemy.addStatusEffect({ type: 'slow', duration: 4000 });
              }
          });
      }
  }
];

const SKILLS_ARCHER: SkillDefinition[] = [
  {
    name: 'Multi-shot',
    description: 'Fire a cone of three arrows.',
    cooldown: 2000,
    execute: (player, game) => {
        const baseDirection = normalizeVector({ x: player.mousePos.x - player.position.x, y: player.mousePos.y - player.position.y });
        const angle = Math.atan2(baseDirection.y, baseDirection.x);
        const spread = Math.PI / 12; // 15 degrees
        for (let i = -1; i <= 1; i++) {
            const newAngle = angle + i * spread;
            const direction = { x: Math.cos(newAngle), y: Math.sin(newAngle) };
            game.addProjectile(new Projectile(player.position, direction, player.damage * 0.8, 12, player.id, '#22c55e'));
        }
    }
  },
  {
      name: 'Rain of Arrows',
      description: 'Call down a volley of arrows.',
      cooldown: 10000,
      execute: (player, game) => {
          const radius = 120;
          game.addVisualEffect(new VisualEffect(player.mousePos, 'rain_of_arrows', 3000, { radius }));
          game.addGroundEffect(new GroundEffect(player.mousePos, radius, 3000, '#22c55e', { type: 'dot', damagePerTick: player.damage, duration: 1000 }, 'rain_of_arrows'));
      }
  }
];

export function getSkillsForClass(characterClass: CharacterClass): SkillDefinition[] {
  switch (characterClass) {
    case CharacterClass.Warrior: return SKILLS_WARRIOR.slice(0, 5);
    case CharacterClass.Mage: return SKILLS_MAGE.slice(0, 5);
    case CharacterClass.Archer: return SKILLS_ARCHER.slice(0, 5);
    default: return [];
  }
}

export class Player extends Character {
  characterData: CharacterData;
  xp: number;
  xpToNextLevel: number;
  level: number;
  skills: SkillState[];
  mousePos: Vector2D = { x: 0, y: 0 };
  isDashing: boolean = false;

  constructor(data: CharacterData) {
    super({ x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 }, 16, data.stats.maxHealth, '#4ade80', data.stats.damage);
    this.id = data.id; 
    
    this.characterData = data;
    this.health = data.stats.health;
    this.maxHealth = data.stats.maxHealth;
    this.damage = data.stats.damage;
    this.level = data.level;
    this.xp = data.xp;
    this.xpToNextLevel = GAME_CONFIG.BASE_XP_TO_NEXT_LEVEL * Math.pow(GAME_CONFIG.XP_PER_LEVEL_MULTIPLIER, this.level - 1);
    
    this.skills = getSkillsForClass(data.characterClass).map(definition => ({
        definition,
        lastUsed: 0,
    }));
    this.recalculateStats();
  }

  update(pressedKeys: Set<string>, game: GameContext) {
    this.processStatusEffects();
    if (this.isDead || this.isDashing || this.hasStatus('stun')) return;
    
    let moveDirection: Vector2D = { x: 0, y: 0 };

    if (pressedKeys.has('w') || pressedKeys.has('arrowup')) moveDirection.y -= 1;
    if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) moveDirection.y += 1;
    if (pressedKeys.has('a') || pressedKeys.has('arrowleft')) moveDirection.x -= 1;
    if (pressedKeys.has('d') || pressedKeys.has('arrowright')) moveDirection.x += 1;
    
    if (moveDirection.x !== 0 || moveDirection.y !== 0) {
        const normalized = normalizeVector(moveDirection);
        const currentSpeed = this.characterData.stats.speed * (this.hasStatus('slow') ? 0.5 : 1);
        this.position.x += normalized.x * currentSpeed;
        this.position.y += normalized.y * currentSpeed;
    }
    
    this.position.x = Math.max(this.radius, Math.min(this.position.x, GAME_CONFIG.WORLD_WIDTH - this.radius));
    this.position.y = Math.max(this.radius, Math.min(this.position.y, GAME_CONFIG.WORLD_HEIGHT - this.radius));
    
    this.handleSkillUsage(pressedKeys, game);
  }
  
  handleSkillUsage(pressedKeys: Set<string>, game: GameContext) {
      const now = Date.now();
      this.skills.forEach((skill, index) => {
          const key = (index + 1).toString();
          if (pressedKeys.has(key)) {
              if (now - skill.lastUsed >= skill.definition.cooldown) {
                  skill.definition.execute(this, game);
                  skill.lastUsed = now;
              }
          }
      });
  }

  gainXP(amount: number, game: GameContext) {
    this.xp += amount;
    game.addFloatingText(new FloatingText(`+${amount} XP`, {x: this.position.x, y: this.position.y + 20}, '#a78bfa'));
    
    while (this.xp >= this.xpToNextLevel) {
      this.levelUp(game);
    }
    this.characterData.xp = this.xp;
  }
  
  levelUp(game: GameContext) {
      this.xp -= this.xpToNextLevel;
      this.level++;
      this.xpToNextLevel = Math.floor(GAME_CONFIG.BASE_XP_TO_NEXT_LEVEL * Math.pow(GAME_CONFIG.XP_PER_LEVEL_MULTIPLIER, this.level - 1));
      
      this.recalculateStats();
      this.health = this.maxHealth;
      
      this.characterData.level = this.level;
      
      game.addVisualEffect(new VisualEffect(this.position, 'buff_aura', 1000, { radius: 50, color: '#facc15' }));
      game.addFloatingText(new FloatingText('LEVEL UP!', { x: this.position.x, y: this.position.y - 30 }, '#facc15', 20));
  }

  collectGold(amount: number) {
      this.characterData.gold += amount;
  }
  
  collectItem(item: Item): boolean {
      const emptySlotIndex = this.characterData.inventory.findIndex(slot => slot === null);
      if (emptySlotIndex !== -1) {
          this.characterData.inventory[emptySlotIndex] = item;
          return true;
      }
      return false; // Inventory full
  }

  equipItem(item: Item, inventoryIndex: number) {
      const slot = item.slot;
      const currentlyEquipped = this.characterData.equipment[slot];
      
      this.characterData.inventory[inventoryIndex] = currentlyEquipped;
      this.characterData.equipment[slot] = item;
      
      this.recalculateStats();
  }
  
  unequipItem(slot: ItemSlot) {
      const item = this.characterData.equipment[slot];
      if (!item) return;

      const emptySlotIndex = this.characterData.inventory.findIndex(invSlot => invSlot === null);
      if (emptySlotIndex === -1) {
          return;
      }
      
      this.characterData.inventory[emptySlotIndex] = item;
      this.characterData.equipment[slot] = null;
      
      this.recalculateStats();
  }
  
  recalculateStats() {
      const baseStats = {
          maxHealth: GAME_CONFIG.PLAYER_HEALTH + (this.level - 1) * 10,
          damage: GAME_CONFIG.PLAYER_DAMAGE + (this.level - 1) * 2,
          speed: GAME_CONFIG.PLAYER_SPEED,
      };
      
      let newMaxHealth = baseStats.maxHealth;
      let newDamage = baseStats.damage;
      let newSpeed = baseStats.speed;
      
      Object.values(this.characterData.equipment).forEach(item => {
          if (item) {
              newMaxHealth += item.bonuses.maxHealth || 0;
              newDamage += item.bonuses.damage || 0;
              newSpeed += item.bonuses.speed || 0;
          }
      });
      
      this.characterData.stats.maxHealth = newMaxHealth;
      this.characterData.stats.damage = newDamage;
      this.characterData.stats.speed = newSpeed;

      this.maxHealth = newMaxHealth;
      this.damage = newDamage;

      if (this.health > this.maxHealth) {
          this.health = this.maxHealth;
      }
      this.characterData.stats.health = this.health;
  }
  
  setMousePosition(pos: Vector2D) {
      this.mousePos = pos;
  }

  getFinalCharacterData(): CharacterData {
      this.characterData.xp = this.xp;
      this.characterData.level = this.level;
      this.characterData.stats.health = this.health > 0 ? this.health : this.maxHealth;
      return this.characterData;
  }
}
