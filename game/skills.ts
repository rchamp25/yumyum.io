import { SkillDefinition, CharacterClass, GameContext, Vector2D } from './types';
// FIX: Import Character directly from its source file to resolve module error.
import { Character } from './entities/Character';
import { findNearestEnemy, normalizeVector, getDistance } from './utils';
import { Projectile } from './entities/Projectile';
import { VisualEffect } from './entities/VisualEffect';
import { GroundEffect } from './entities/GroundEffect';
import { Player } from './entities/Player';

// --- WARRIOR SKILLS ---

const stomp: SkillDefinition = {
    id: 'w_stomp',
    name: 'Stomp',
    description: 'Smash the ground, damaging and slowing nearby enemies.',
    cooldown: 8000,
    effect: (caster, target, game) => {
        const radius = 150;
        game.addVisualEffect(new VisualEffect(caster.position, 'stomp_wave', 500, { radius, color: '#facc15' }));
        game.enemies.forEach(enemy => {
            if (getDistance(caster.position, enemy.position) < radius) {
                const ft = enemy.takeDamage(caster.getFinalStats().damage * 1.5, caster);
                if(ft) game.addFloatingText(ft);
                enemy.addStatusEffect({ type: 'slow', duration: 3000 });
            }
        });
    }
};

const charge: SkillDefinition = {
    id: 'w_charge',
    name: 'Charge',
    description: 'Dash to an enemy, stunning it briefly.',
    cooldown: 12000,
    requiresTarget: true,
    range: 400,
    effect: (caster, target, game) => {
        if (target instanceof Character) {
            const direction = normalizeVector({ x: target.position.x - caster.position.x, y: target.position.y - caster.position.y });
            const distance = getDistance(caster.position, target.position) - target.radius;
            const chargePos = {
                x: caster.position.x + direction.x * distance,
                y: caster.position.y + direction.y * distance,
            };
            
            game.addVisualEffect(new VisualEffect(caster.position, 'dash_trail', 400, { endPos: chargePos, color: 'rgba(239, 68, 68, 0.6)' }));
            caster.position = chargePos;

            const ft = target.takeDamage(caster.getFinalStats().damage, caster);
            if(ft) game.addFloatingText(ft);
            target.addStatusEffect({ type: 'stun', duration: 1500 });
        }
    }
};

const whirlwind: SkillDefinition = {
    id: 'w_whirlwind',
    name: 'Whirlwind',
    description: 'Spin with your weapon out, dealing continuous damage to nearby enemies.',
    cooldown: 15000,
    effect: (caster, target, game) => {
        const radius = 120;
        const duration = 3000;
        game.addGroundEffect(new GroundEffect(caster.position, radius, duration, 'rgba(255, 255, 255, 0.8)', { type: 'dot', duration, damagePerTick: caster.getFinalStats().damage * 2 }, caster.name, 'whirlwind'));
    }
};

const rallyingCry: SkillDefinition = {
    id: 'w_rallying_cry',
    name: 'Rallying Cry',
    description: 'Let out a powerful shout, increasing your damage for a short time.',
    cooldown: 20000,
    effect: (caster, target, game) => {
        caster.addStatusEffect({ type: 'damage_buff', duration: 8000, multiplier: 1.3 });
        game.addVisualEffect(new VisualEffect(caster.position, 'buff_aura', 1000, { radius: caster.radius + 10, color: '#ef4444' }));
    }
};

const execute: SkillDefinition = {
    id: 'w_execute',
    name: 'Execute',
    description: 'A powerful strike that deals massive damage to a single foe.',
    cooldown: 6000,
    requiresTarget: true,
    range: 60,
    effect: (caster, target, game) => {
        if (target instanceof Character) {
            game.addVisualEffect(new VisualEffect(target.position, 'slash_arc', 300, { radius: 40, color: 'red' }));
            const ft = target.takeDamage(caster.getFinalStats().damage * 3, caster);
            if(ft) game.addFloatingText(ft);
        }
    }
};

// --- MAGE SKILLS ---
const fireball: SkillDefinition = {
    id: 'm_fireball',
    name: 'Fireball',
    description: 'Launch a ball of fire that explodes on impact.',
    cooldown: 5000,
    requiresTarget: true,
    range: 450,
    effect: (caster, target, game) => {
        let targetPosition: Vector2D;
        if (target instanceof Character) {
            targetPosition = target.position;
        } else {
            targetPosition = target as Vector2D;
        }
        const direction = normalizeVector({ x: targetPosition.x - caster.position.x, y: targetPosition.y - caster.position.y });
        const p = new Projectile(caster.position, direction, caster.getFinalStats().damage, 10, caster.id, caster.name, '#f97316');
        p.onHitEffects = { type: 'explosion', radius: 80 };
        game.addProjectile(p);
    }
};

const frostNova: SkillDefinition = {
    id: 'm_frost_nova',
    name: 'Frost Nova',
    description: 'Release a wave of frost, damaging and slowing nearby enemies.',
    cooldown: 10000,
    effect: (caster, target, game) => {
        const radius = 200;
        game.addVisualEffect(new VisualEffect(caster.position, 'frost_nova', 600, { radius, color: '#60a5fa' }));
        game.enemies.forEach(enemy => {
            if (getDistance(caster.position, enemy.position) < radius) {
                const ft = enemy.takeDamage(caster.getFinalStats().damage * 0.8, caster);
                if(ft) game.addFloatingText(ft);
                enemy.addStatusEffect({ type: 'slow', duration: 4000 });
            }
        });
    }
};

const teleport: SkillDefinition = {
    id: 'm_teleport',
    name: 'Teleport',
    description: 'Instantly travel a short distance.',
    cooldown: 12000,
    effect: (caster, target, game) => {
        const distance = 250;
        const direction = normalizeVector({ x: (target as Vector2D).x - caster.position.x, y: (target as Vector2D).y - caster.position.y });
        
        const newPos = {
            x: caster.position.x + direction.x * distance,
            y: caster.position.y + direction.y * distance,
        };
        
        game.addVisualEffect(new VisualEffect(caster.position, 'teleport_out', 300, { color: '#a78bfa' }));
        caster.position = newPos;
        game.addVisualEffect(new VisualEffect(caster.position, 'teleport_in', 300, { color: '#a78bfa', endPos: newPos }));
    }
};

const arcaneShield: SkillDefinition = {
    id: 'm_arcane_shield',
    name: 'Arcane Shield',
    description: 'Summon a magical barrier that absorbs damage.',
    cooldown: 25000,
    effect: (caster, target, game) => {
        const shieldAmount = caster.getFinalStats().maxHealth * 0.5;
        caster.addStatusEffect({ type: 'shield', duration: 10000, shieldHealth: shieldAmount });
    }
};

const chainLightning: SkillDefinition = {
    id: 'm_chain_lightning',
    name: 'Chain Lightning',
    description: 'Unleash lightning that jumps between enemies.',
    cooldown: 7000,
    requiresTarget: true,
    range: 350,
    effect: (caster, target, game) => {
        if (target instanceof Character) {
            const direction = normalizeVector({ x: target.position.x - caster.position.x, y: target.position.y - caster.position.y });
            const p = new Projectile(caster.position, direction, caster.getFinalStats().damage, 15, caster.id, caster.name, '#fde047');
            p.bounces = 2; // Hit up to 3 enemies total
            game.addProjectile(p);
        }
    }
};

// --- ARCHER SKILLS ---
const piercingShot: SkillDefinition = {
    id: 'a_piercing_shot',
    name: 'Piercing Shot',
    description: 'Fire an arrow that flies through multiple enemies.',
    cooldown: 1000,
    requiresTarget: true,
    range: 500,
    effect: (caster, target, game) => {
        let targetPosition: Vector2D;
        if (target instanceof Character) {
            targetPosition = target.position;
        } else {
            // Fallback for safety, though should not be triggered with requiresTarget: true
            targetPosition = target as Vector2D;
        }
        const direction = normalizeVector({ x: targetPosition.x - caster.position.x, y: targetPosition.y - caster.position.y });
        const p = new Projectile(caster.position, direction, caster.getFinalStats().damage, 12, caster.id, caster.name, '#bef264');
        p.piercing = true;
        game.addProjectile(p);
    }
};

const volley: SkillDefinition = {
    id: 'a_volley',
    name: 'Volley',
    description: 'Fire a cone of arrows towards an enemy.',
    cooldown: 8000,
    requiresTarget: true,
    range: 400,
    effect: (caster, target, game) => {
        let targetPosition: Vector2D;
        if (target instanceof Character) {
            targetPosition = target.position;
        } else {
            targetPosition = target as Vector2D;
        }
        const mainDirection = normalizeVector({ x: targetPosition.x - caster.position.x, y: targetPosition.y - caster.position.y });
        const angle = Math.atan2(mainDirection.y, mainDirection.x);
        const spread = Math.PI / 8; // 22.5 degrees total spread

        for (let i = -2; i <= 2; i++) {
            const currentAngle = angle + (i * spread / 4);
            const direction = { x: Math.cos(currentAngle), y: Math.sin(currentAngle) };
            const p = new Projectile(caster.position, direction, caster.getFinalStats().damage * 0.7, 10, caster.id, caster.name, '#d9f99d');
            p.range = 300;
            game.addProjectile(p);
        }
    }
};

const dash: SkillDefinition = {
    id: 'a_dash',
    name: 'Dash',
    description: 'Perform a quick dash, dodging out of harm\'s way.',
    cooldown: 10000,
    effect: (caster, target, game) => {
        const distance = 200;
        const direction = normalizeVector({ x: (target as Vector2D).x - caster.position.x, y: (target as Vector2D).y - caster.position.y });
        
        const endPos = {
            x: caster.position.x + direction.x * distance,
            y: caster.position.y + direction.y * distance,
        };
        
        game.addVisualEffect(new VisualEffect(caster.position, 'dash_trail', 400, { endPos, color: 'rgba(134, 239, 172, 0.6)' }));
        caster.position = endPos;
    }
};

const poisonArrow: SkillDefinition = {
    id: 'a_poison_arrow',
    name: 'Poison Arrow',
    description: 'Fire a venomous arrow that deals damage over time.',
    cooldown: 6000,
    requiresTarget: true,
    range: 500,
    effect: (caster, target, game) => {
         if (target instanceof Character) {
            const direction = normalizeVector({ x: target.position.x - caster.position.x, y: target.position.y - caster.position.y });
            const p = new Projectile(caster.position, direction, caster.getFinalStats().damage * 0.5, 12, caster.id, caster.name, '#4ade80');
            p.onHitEffects = {
                type: 'status',
                effect: { type: 'dot', duration: 5000, damagePerTick: caster.getFinalStats().damage * 1.5 }
            };
            game.addProjectile(p);
        }
    }
};

const rainOfArrows: SkillDefinition = {
    id: 'a_rain_of_arrows',
    name: 'Rain of Arrows',
    description: 'Call down a shower of arrows on an area.',
    cooldown: 18000,
    requiresTarget: false,
    range: 600,
    effect: (caster, target, game) => {
        const radius = 150;
        const duration = 5000;
        const targetPos = target as Vector2D;
        game.addGroundEffect(new GroundEffect(targetPos, radius, duration, '#22c55e', { type: 'dot', duration, damagePerTick: caster.getFinalStats().damage * 3 }, caster.name, 'rain_of_arrows'));
    }
};


const WARRIOR_SKILLS: SkillDefinition[] = [stomp, charge, whirlwind, rallyingCry, execute];
const MAGE_SKILLS: SkillDefinition[] = [fireball, frostNova, teleport, arcaneShield, chainLightning];
const ARCHER_SKILLS: SkillDefinition[] = [piercingShot, volley, dash, poisonArrow, rainOfArrows];

export function getSkillsForClass(characterClass: CharacterClass): SkillDefinition[] {
    switch (characterClass) {
        case CharacterClass.Warrior: return WARRIOR_SKILLS;
        case CharacterClass.Mage: return MAGE_SKILLS;
        case CharacterClass.Archer: return ARCHER_SKILLS;
        default: return [];
    }
}