
import { SkillDefinition, CharacterClass } from './types';
import { findNearestEnemy, getDistance, normalizeVector } from './math';
import { Projectile } from './entities/Projectile';
import { VisualEffect } from './entities/VisualEffect';
import { GroundEffect } from './entities/GroundEffect';

const WarriorSkills: SkillDefinition[] = [
    {
        name: 'Whirlwind',
        description: 'Deal continuous damage to nearby enemies for 3 seconds.',
        cooldown: 8000,
        unlockLevel: 1,
        use: (player, game) => {
            player.addStatusEffect({ type: 'whirlwind_active', duration: 3000 });
            game.addVisualEffect(new VisualEffect(player.position, 'whirlwind', 3000, { radius: 120 }));
        }
    },
    {
        name: 'Charge',
        description: 'Dash to the nearest enemy, dealing damage and stunning them.',
        cooldown: 12000,
        unlockLevel: 11,
        use: (player, game) => {
            const target = findNearestEnemy(player.position, game.enemies, 400);
            if (target) {
                const dir = normalizeVector({ x: target.position.x - player.position.x, y: target.position.y - player.position.y });
                
                // Teleport player close to enemy (Dash effect)
                game.addVisualEffect(new VisualEffect(player.position, 'dash_trail', 300, { endPos: target.position }));
                player.position.x = target.position.x - dir.x * 40;
                player.position.y = target.position.y - dir.y * 40;

                // Damage and Stun
                const stats = player.getFinalStats();
                let damage = stats.damage * 1.5;
                if (target.isBoss) damage *= stats.bossDamageMultiplier;

                const ft = target.takeDamage(damage, { name: player.name, level: player.level });
                if(ft) game.addFloatingText(ft);
                target.addStatusEffect({ type: 'stun', duration: 1500 });
                game.addVisualEffect(new VisualEffect(target.position, 'stomp_wave', 500, { radius: 50, color: 'white' }));
            }
        }
    },
    {
        name: 'Iron Skin',
        description: 'Harden your skin, gaining a massive shield for 6 seconds.',
        cooldown: 20000,
        unlockLevel: 21,
        use: (player, game) => {
            const shieldAmount = player.maxHealth * 0.5;
            player.addStatusEffect({ type: 'shield', duration: 6000, shieldHealth: shieldAmount });
            game.addVisualEffect(new VisualEffect(player.position, 'buff_aura', 6000, { color: '#94a3b8', radius: 40 }));
        }
    },
    {
        name: 'War Cry',
        description: 'Release a mighty roar, stunning all nearby enemies.',
        cooldown: 25000,
        unlockLevel: 31,
        use: (player, game) => {
            game.addVisualEffect(new VisualEffect(player.position, 'stomp_wave', 800, { radius: 300, color: '#dc2626' }));
            const stats = player.getFinalStats();
            game.enemies.forEach(enemy => {
                if (getDistance(player.position, enemy.position) < 300) {
                     enemy.addStatusEffect({ type: 'stun', duration: 2000 });
                     let damage = stats.damage * 0.5;
                     if (enemy.isBoss) damage *= stats.bossDamageMultiplier;

                     const ft = enemy.takeDamage(damage, { name: player.name, level: player.level });
                     if(ft) game.addFloatingText(ft);
                }
            });
        }
    },
    {
        name: 'Berserker Rage',
        description: 'Go into a frenzy, increasing movement speed and damage significantly.',
        cooldown: 45000,
        unlockLevel: 41,
        use: (player, game) => {
            player.addStatusEffect({ type: 'haste', duration: 8000, speedMultiplier: 1.4 });
            player.addStatusEffect({ type: 'empowered', duration: 8000, damageMultiplier: 1.5 });
            game.addVisualEffect(new VisualEffect(player.position, 'buff_aura', 8000, { color: '#ef4444', radius: 50 }));
        }
    }
];

const MageSkills: SkillDefinition[] = [
     {
        name: 'Fireball',
        description: 'Launch an exploding fireball at the nearest enemy.',
        cooldown: 4000,
        unlockLevel: 1,
        use: (player, game) => {
            const nearestEnemy = findNearestEnemy(player.position, game.enemies, 800);
            let direction = { x: 1, y: 0 };
            if (nearestEnemy) {
                direction = normalizeVector({ x: nearestEnemy.position.x - player.position.x, y: nearestEnemy.position.y - player.position.y });
            }
            const stats = player.getFinalStats();
            const p = new Projectile(player.position, direction, player.damage * 2.5, 8, player.id, player.name, player.level, '#f97316', stats.bossDamageMultiplier);
            p.onHitEffects = { type: 'explosion', radius: 100 };
            p.radius = 12;
            game.addProjectile(p);
        }
    },
    {
        name: 'Frost Nova',
        description: 'Freeze all nearby enemies, dealing damage and stunning them.',
        cooldown: 15000,
        unlockLevel: 11,
        use: (player, game) => {
            game.addVisualEffect(new VisualEffect(player.position, 'frost_nova', 800, { radius: 250, color: '#60a5fa' }));
            const stats = player.getFinalStats();
            game.enemies.forEach(enemy => {
                if (getDistance(player.position, enemy.position) < 250) {
                     enemy.addStatusEffect({ type: 'stun', duration: 2500 });
                     let damage = stats.damage;
                     if (enemy.isBoss) damage *= stats.bossDamageMultiplier;

                     const ft = enemy.takeDamage(damage, { name: player.name, level: player.level });
                     if(ft) game.addFloatingText(ft);
                }
            });
        }
    },
    {
        name: 'Blink',
        description: 'Teleport forward instantly to escape danger.',
        cooldown: 8000,
        unlockLevel: 21,
        use: (player, game) => {
            let blinkDir = { x: 0, y: 0 };
            const target = findNearestEnemy(player.position, game.enemies, 1000);
            
            if (target) {
                 blinkDir = normalizeVector({ x: target.position.x - player.position.x, y: target.position.y - player.position.y });
            } else {
                // Random blink if no enemies
                const angle = Math.random() * Math.PI * 2;
                blinkDir = { x: Math.cos(angle), y: Math.sin(angle) };
            }

            game.addVisualEffect(new VisualEffect(player.position, 'teleport_out', 500, { radius: 30 }));
            
            player.position.x += blinkDir.x * 250;
            player.position.y += blinkDir.y * 250;
            
            game.addVisualEffect(new VisualEffect(player.position, 'teleport_in', 500, { radius: 30, endPos: player.position }));
        }
    },
    {
        name: 'Lightning Bolt',
        description: 'Fire a high-velocity bolt of lightning that pierces enemies.',
        cooldown: 6000,
        unlockLevel: 31,
        use: (player, game) => {
            const nearestEnemy = findNearestEnemy(player.position, game.enemies, 1000);
            let direction = { x: 1, y: 0 };
            if (nearestEnemy) {
                direction = normalizeVector({ x: nearestEnemy.position.x - player.position.x, y: nearestEnemy.position.y - player.position.y });
            }
            const stats = player.getFinalStats();
            const p = new Projectile(player.position, direction, player.damage * 3, 15, player.id, player.name, player.level, '#facc15', stats.bossDamageMultiplier);
            p.piercing = true;
            p.radius = 8;
            game.addProjectile(p);
        }
    },
    {
        name: 'Arcane Barrage',
        description: 'Unleash a volley of seeking arcane missiles.',
        cooldown: 18000,
        unlockLevel: 41,
        use: (player, game) => {
             const stats = player.getFinalStats();
             for (let i = 0; i < 5; i++) {
                const angle = (Math.PI * 2 / 5) * i;
                const dir = { x: Math.cos(angle), y: Math.sin(angle) };
                const p = new Projectile(player.position, dir, player.damage * 1.2, 7, player.id, player.name, player.level, '#d8b4fe', stats.bossDamageMultiplier);
                p.bounces = 1; // Simulate homing/seeking by bouncing
                p.radius = 10;
                game.addProjectile(p);
             }
        }
    }
];

const ArcherSkills: SkillDefinition[] = [
     {
        name: 'Rain of Arrows',
        description: 'Fire a volley of arrows at a nearby enemy location.',
        cooldown: 10000,
        unlockLevel: 1,
        use: (player, game) => {
            const target = findNearestEnemy(player.position, game.enemies, 600);
            const targetPos = target ? target.position : { x: player.position.x + 100, y: player.position.y };
            const stats = player.getFinalStats();
            
            game.addVisualEffect(new VisualEffect(targetPos, 'rain_of_arrows', 2000, { radius: 120 }));
            game.addGroundEffect(new GroundEffect(targetPos, 120, 4000, '#22c55e', { type: 'dot', damagePerTick: player.damage * 0.8, duration: 4000 }, player.id, player.name, player.level, 'rain_of_arrows', stats.bossDamageMultiplier));
        }
    },
    {
        name: 'Multishot',
        description: 'Fire 3 arrows in a cone spread.',
        cooldown: 5000,
        unlockLevel: 11,
        use: (player, game) => {
            const nearestEnemy = findNearestEnemy(player.position, game.enemies, 800);
            let baseAngle = 0;
            if (nearestEnemy) {
                baseAngle = Math.atan2(nearestEnemy.position.y - player.position.y, nearestEnemy.position.x - player.position.x);
            }
            const stats = player.getFinalStats();
            
            const angles = [baseAngle - 0.3, baseAngle, baseAngle + 0.3];
            angles.forEach(angle => {
                const dir = { x: Math.cos(angle), y: Math.sin(angle) };
                game.addProjectile(new Projectile(player.position, dir, player.damage, 10, player.id, player.name, player.level, '#bef264', stats.bossDamageMultiplier));
            });
        }
    },
    {
        name: 'Sprint',
        description: 'Gain a burst of movement speed.',
        cooldown: 15000,
        unlockLevel: 21,
        use: (player, game) => {
            player.addStatusEffect({ type: 'haste', duration: 5000, speedMultiplier: 1.6 });
            game.addVisualEffect(new VisualEffect(player.position, 'buff_aura', 5000, { color: '#4ade80', radius: 30 }));
        }
    },
    {
        name: 'Power Shot',
        description: 'Fire a massive arrow that pierces enemies and deals heavy damage.',
        cooldown: 8000,
        unlockLevel: 31,
        use: (player, game) => {
            const nearestEnemy = findNearestEnemy(player.position, game.enemies, 1000);
            let direction = { x: 1, y: 0 };
            if (nearestEnemy) {
                direction = normalizeVector({ x: nearestEnemy.position.x - player.position.x, y: nearestEnemy.position.y - player.position.y });
            }
            const stats = player.getFinalStats();
            const p = new Projectile(player.position, direction, player.damage * 4, 18, player.id, player.name, player.level, '#f87171', stats.bossDamageMultiplier);
            p.piercing = true;
            p.radius = 10;
            game.addProjectile(p);
        }
    },
    {
        name: 'Arrow Storm',
        description: 'Fire arrows in all directions.',
        cooldown: 20000,
        unlockLevel: 41,
        use: (player, game) => {
            const count = 12;
            const stats = player.getFinalStats();
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i;
                const dir = { x: Math.cos(angle), y: Math.sin(angle) };
                game.addProjectile(new Projectile(player.position, dir, player.damage, 10, player.id, player.name, player.level, '#a3e635', stats.bossDamageMultiplier));
            }
        }
    }
];

export const SKILLS_DB: { [key in CharacterClass]: SkillDefinition[] } = {
    [CharacterClass.Warrior]: WarriorSkills,
    [CharacterClass.Mage]: MageSkills,
    [CharacterClass.Archer]: ArcherSkills,
};
