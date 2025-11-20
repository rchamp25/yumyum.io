
import express, { Request, Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { Vector2D, CharacterData, ServerEnemy, Item } from './game/types';
import { GAME_CONFIG, ENEMY_TYPES, BOSS_TYPES, BOSS_ZONES, BOSS_CONFIG } from './game/constants';
import { calculateFinalStats } from './game/stats';
import { generateLoot } from './game/lootUtils';
import { getDistance } from './game/math';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ServerPlayer {
    id: string;
    position: Vector2D;
    characterData: CharacterData;
    input: Set<string>;
    speed: number;
    radius: number;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
    }
});

const players = new Map<string, ServerPlayer>();
const enemies = new Map<string, ServerEnemy>();

let bossSpawnTimer = 0;
let globalBossCooldown = 0;

function spawnEnemies() {
    const currentEnemyCount = enemies.size;
    if (currentEnemyCount >= GAME_CONFIG.MAX_ENEMIES) return;

    bossSpawnTimer++;
    if (bossSpawnTimer >= 60) { 
        bossSpawnTimer = 0;
        const activeBosses = Array.from(enemies.values()).filter(e => e.isBoss);
        const isCooldownReady = Date.now() > globalBossCooldown;

        if (activeBosses.length < BOSS_CONFIG.MAX_ACTIVE_BOSSES && isCooldownReady) {
            const occupiedZoneIds = activeBosses.map(e => e.bossZoneId);
            const availableZones = BOSS_ZONES.filter(z => !occupiedZoneIds.includes(z.id));

            if (availableZones.length > 0) {
                const zone = availableZones[Math.floor(Math.random() * availableZones.length)];
                const type = BOSS_TYPES[zone.id];
                if (type) {
                    const id = `boss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    enemies.set(id, {
                        id,
                        position: { x: zone.x, y: zone.y },
                        health: 20 * type.healthMultiplier * (1 + GAME_CONFIG.MAX_LEVEL * 0.2),
                        maxHealth: 20 * type.healthMultiplier * (1 + GAME_CONFIG.MAX_LEVEL * 0.2),
                        level: GAME_CONFIG.MAX_LEVEL,
                        isBoss: true,
                        bossZoneId: zone.id,
                        typeId: zone.id
                    });
                    globalBossCooldown = Date.now() + BOSS_CONFIG.SPAWN_COOLDOWN;
                }
            }
        }
    }

    if (currentEnemyCount < GAME_CONFIG.MAX_ENEMIES) {
        const packSize = Math.floor(Math.random() * 3) + 3;
        const worldCenter = { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 };
        
        const angle = Math.random() * Math.PI * 2;
        const radius = GAME_CONFIG.SAFE_ZONE_RADIUS + 100 + Math.random() * (GAME_CONFIG.WORLD_WIDTH/2 - 400);
        const cx = worldCenter.x + Math.cos(angle) * radius;
        const cy = worldCenter.y + Math.sin(angle) * radius;
        
        const maxDist = Math.max(GAME_CONFIG.WORLD_WIDTH/2, GAME_CONFIG.WORLD_HEIGHT/2);
        const distFactor = (radius - GAME_CONFIG.SAFE_ZONE_RADIUS) / (maxDist - GAME_CONFIG.SAFE_ZONE_RADIUS);
        let zoneLevel = 1 + Math.floor(distFactor * (GAME_CONFIG.MAX_LEVEL - 1));
        zoneLevel = Math.max(1, Math.min(GAME_CONFIG.MAX_LEVEL, zoneLevel));

        for(let i=0; i<packSize; i++) {
             const ex = cx + (Math.random() - 0.5) * 150;
             const ey = cy + (Math.random() - 0.5) * 150;
             const typeKey = Object.keys(ENEMY_TYPES)[Math.floor(Math.random() * Object.keys(ENEMY_TYPES).length)];
             const type = ENEMY_TYPES[typeKey];
             
             const id = `mob_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
             const maxHp = Math.floor(20 * type.healthMultiplier * (1 + zoneLevel * 0.2));
             
             enemies.set(id, {
                 id,
                 position: { x: ex, y: ey },
                 health: maxHp,
                 maxHealth: maxHp,
                 level: zoneLevel,
                 isBoss: false,
                 typeId: typeKey
             });
        }
    }
}

app.use('/', express.static(__dirname) as any);

app.get('*', (_req: Request, res: Response) => {
    (res as any).sendFile(path.resolve(__dirname, 'index.html'));
});

io.on('connection', (socket: Socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('join_game', (characterData: CharacterData) => {
        const startPosition = characterData.position || { 
            x: GAME_CONFIG.WORLD_WIDTH / 2, 
            y: GAME_CONFIG.WORLD_HEIGHT / 2 
        };

        const stats = calculateFinalStats(characterData.stats, characterData.equipment);

        players.set(socket.id, {
            id: socket.id,
            characterData,
            position: startPosition,
            input: new Set<string>(),
            speed: stats.speed,
            radius: GAME_CONFIG.PLAYER_RADIUS,
        });
        console.log(`Player ${characterData.name} (${socket.id}) joined.`);
    });
    
    socket.on('update_character', (characterData: CharacterData) => {
        const player = players.get(socket.id);
        if (player) {
            // Update the server's copy of character data (equipment, level, etc.)
            player.characterData = characterData;
            
            // Recalculate server-side stats (Speed, Item Find) using the shared utility
            const stats = calculateFinalStats(characterData.stats, characterData.equipment, player.position);
            player.speed = stats.speed;
            // Note: itemFind is calculated on the fly during loot generation
        }
    });

    socket.on('player_input', (inputKeys: string[]) => {
        const player = players.get(socket.id);
        if (player) {
            const keys = Array.isArray(inputKeys) ? inputKeys : [];
            player.input = new Set(keys);
        }
    });
    
    socket.on('hit_enemy', (payload: { enemyId: string, damage: number }) => {
        const enemy = enemies.get(payload.enemyId);
        const attacker = players.get(socket.id);
        
        if (enemy && attacker) {
            enemy.health -= payload.damage;
            if (enemy.health <= 0) {
                enemies.delete(payload.enemyId);
                
                // Reward Logic
                let xpValue = 15 * enemy.level + Math.pow(enemy.level, 2.1);
                if (enemy.isBoss) xpValue *= 10;
                const xpReward = Math.floor(xpValue);
                const goldReward = Math.floor(Math.random() * enemy.level + 1) * (enemy.isBoss ? 20 : 1);

                socket.emit('enemy_killed', {
                    enemyId: payload.enemyId,
                    xp: xpReward,
                    gold: goldReward,
                    enemyLevel: enemy.level
                });
                
                // Boss Logic
                if (enemy.isBoss) {
                     globalBossCooldown = Date.now() + BOSS_CONFIG.SPAWN_COOLDOWN;
                }

                // Loot Generation (Instanced)
                const killerStats = calculateFinalStats(
                    attacker.characterData.stats, 
                    attacker.characterData.equipment, 
                    attacker.position
                );

                const drops = generateLoot(
                    enemy.level, 
                    enemy.position, 
                    enemy.isBoss, 
                    killerStats.itemFind || 0
                );

                if (drops.length > 0) {
                    socket.emit('loot_dropped', drops.map(item => ({
                        item,
                        position: enemy.position
                    })));
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        players.delete(socket.id);
    });
});

setInterval(() => {
    // 1. Update Players
    for (const player of players.values()) {
        let moveX = 0;
        let moveY = 0;
        if (player.input.has('w')) moveY -= 1;
        if (player.input.has('s')) moveY += 1;
        if (player.input.has('a')) moveX -= 1;
        if (player.input.has('d')) moveX += 1;

        if (moveX !== 0 || moveY !== 0) {
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            player.position.x += (moveX / length) * player.speed;
            player.position.y += (moveY / length) * player.speed;

            player.position.x = Math.max(player.radius, Math.min(GAME_CONFIG.WORLD_WIDTH - player.radius, player.position.x));
            player.position.y = Math.max(player.radius, Math.min(GAME_CONFIG.WORLD_HEIGHT - player.radius, player.position.y));
        }
    }
    
    // 2. Update Enemies
    spawnEnemies();
    
    const playerList = Array.from(players.values());
    for (const enemy of enemies.values()) {
        let nearestDist = 99999;
        let nearestPlayer: ServerPlayer | null = null;
        
        for (const p of playerList) {
            const d = getDistance(enemy.position, p.position);
            if (d < nearestDist) {
                nearestDist = d;
                nearestPlayer = p;
            }
        }
        
        const chaseRange = enemy.isBoss ? BOSS_CONFIG.ZONE_RADIUS : GAME_CONFIG.ENEMY_AGGRO_RANGE;
        const attackRange = 30; 
        const type = enemy.isBoss ? BOSS_TYPES[enemy.typeId] : ENEMY_TYPES[enemy.typeId];
        const speed = type ? type.speed : 2;

        if (nearestPlayer && nearestDist < chaseRange && nearestDist > attackRange) {
            const dx = nearestPlayer.position.x - enemy.position.x;
            const dy = nearestPlayer.position.y - enemy.position.y;
            const len = Math.sqrt(dx*dx + dy*dy);
            if (len > 0) {
                enemy.position.x += (dx/len) * speed;
                enemy.position.y += (dy/len) * speed;
            }
        }
    }

    // 3. Broadcast State
    const playersObj: any = {};
    players.forEach((p, id) => {
        playersObj[id] = {
            position: p.position,
            characterData: p.characterData
        };
    });

    io.emit('game_state', { 
        players: playersObj, 
        enemies: Array.from(enemies.values()) 
    });

}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
