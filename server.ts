
import express, { Request, Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { Vector2D, CharacterData, ServerEnemy, Party, TradeSession, Difficulty, EnemyType } from './game/types';
import { GAME_CONFIG, BOSS_TYPES, BOSS_ZONES, BOSS_CONFIG, ONLINE_BOSS_CONFIG, WORLD_IDS, GROVE_ENEMIES, GROVE_BOSSES, ENEMY_TYPES } from './game/constants';
import { calculateFinalStats } from './game/stats';
import { generateLoot } from './game/lootUtils';
import { getDistance } from './game/math';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ServerPlayer {
    id: string;
    socketId: string;
    position: Vector2D;
    characterData: CharacterData;
    input: Set<string>;
    speed: number;
    radius: number;
    partyId: string | null;
    tradeSessionId: string | null;
    difficulty: Difficulty;
    worldId: string;
}

// Extend ServerEnemy interface locally to include server-only state
interface ExtendedServerEnemy extends ServerEnemy {
    isReturning: boolean;
}

interface RoomState {
    players: Map<string, ServerPlayer>;
    enemies: Map<string, ExtendedServerEnemy>;
    bossSpawnTimer: number;
    globalBossCooldown: number;
    difficulty: Difficulty;
    worldId: string;
    mobSpawnTimer: number;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
    }
});

// GLOBAL SERVER STATE
let isWorldLocked = true;

// GAME ROOMS: Key is `${worldId}_${difficulty}`
const GAME_ROOMS: Record<string, RoomState> = {};

// Initialize rooms
Object.values(WORLD_IDS).forEach(worldId => {
    Object.values(Difficulty).forEach(diff => {
        const key = `${worldId}_${diff}`;
        GAME_ROOMS[key] = {
            players: new Map(),
            enemies: new Map(),
            bossSpawnTimer: 0,
            globalBossCooldown: 0,
            difficulty: diff as Difficulty,
            worldId: worldId,
            mobSpawnTimer: 0
        };
    });
});

const parties = new Map<string, Party>();
const tradeSessions = new Map<string, TradeSession>();

// Helper: Get all players across all rooms
function getAllPlayers(): ServerPlayer[] {
    let all: ServerPlayer[] = [];
    Object.values(GAME_ROOMS).forEach(room => {
        all = all.concat(Array.from(room.players.values()));
    });
    return all;
}

function getPlayer(id: string): ServerPlayer | undefined {
    for (const room of Object.values(GAME_ROOMS)) {
        if (room.players.has(id)) return room.players.get(id);
    }
    return undefined;
}

function getRoomKey(worldId: string, difficulty: Difficulty) {
    return `${worldId}_${difficulty}`;
}

// --- Party Helpers ---
function broadcastPartyUpdate(partyId: string) {
    const party = parties.get(partyId);
    if (party) {
        party.members.forEach(m => {
            if (m.isOnline) {
                const p = getPlayer(m.id);
                if (p) {
                    m.health = p.characterData.stats.health;
                    m.maxHealth = p.characterData.stats.maxHealth;
                    m.level = p.characterData.level;
                }
                io.to(m.id).emit('party_update', party);
            }
        });
    }
}

function leaveParty(playerId: string) {
    const player = getPlayer(playerId);
    if (!player || !player.partyId) return;
    
    const partyId = player.partyId;
    const party = parties.get(partyId);
    
    if (party) {
        party.members = party.members.filter(m => m.id !== playerId);
        player.partyId = null;
        io.to(playerId).emit('party_update', null);

        if (party.members.length === 0) {
            parties.delete(partyId);
        } else {
            if (party.leaderId === playerId) {
                const nextLeader = party.members.find(m => m.isOnline) || party.members[0];
                if (nextLeader) party.leaderId = nextLeader.id;
            }
            broadcastPartyUpdate(partyId);
        }
    }
}

// --- Trade Helpers ---
function endTrade(sessionId: string, completed: boolean) {
    const session = tradeSessions.get(sessionId);
    if (session) {
        const p1 = getPlayer(session.player1Id);
        const p2 = getPlayer(session.player2Id);
        
        if (p1) {
            p1.tradeSessionId = null;
            io.to(p1.socketId).emit('trade_update', null);
            if (completed) io.to(p1.socketId).emit('trade_completed', true);
        }
        if (p2) {
            p2.tradeSessionId = null;
            io.to(p2.socketId).emit('trade_update', null);
            if (completed) io.to(p2.socketId).emit('trade_completed', true);
        }
        tradeSessions.delete(sessionId);
    }
}

function processTrade(session: TradeSession) {
    const p1 = getPlayer(session.player1Id);
    const p2 = getPlayer(session.player2Id);
    
    if (!p1 || !p2) {
        endTrade(session.id, false);
        return;
    }

    if (p1.characterData.gold < session.player1Offer.gold || p2.characterData.gold < session.player2Offer.gold) {
        endTrade(session.id, false);
        return;
    }
    
    p1.characterData.gold -= session.player1Offer.gold;
    p2.characterData.gold -= session.player2Offer.gold;
    
    session.player1Offer.items.forEach(i => {
        if (p1.characterData.inventory[i.inventoryIndex]) {
            p1.characterData.inventory[i.inventoryIndex] = null;
        }
    });
    session.player2Offer.items.forEach(i => {
        if (p2.characterData.inventory[i.inventoryIndex]) {
            p2.characterData.inventory[i.inventoryIndex] = null;
        }
    });
    
    p1.characterData.gold += session.player2Offer.gold;
    p2.characterData.gold += session.player1Offer.gold;

    const addItem = (player: ServerPlayer, item: any) => {
        const emptyIdx = player.characterData.inventory.findIndex(s => s === null);
        if (emptyIdx !== -1) {
            player.characterData.inventory[emptyIdx] = item;
        } else {
            player.characterData.inventory.push(item);
        }
    };
    
    session.player1Offer.items.forEach(i => addItem(p2, i.item));
    session.player2Offer.items.forEach(i => addItem(p1, i.item));

    io.to(p1.socketId).emit('update_character', p1.characterData);
    io.to(p2.socketId).emit('update_character', p2.characterData);
    
    endTrade(session.id, true);
}

function getDifficultyMultipliers(difficulty: Difficulty) {
    switch(difficulty) {
        case Difficulty.Hard:
            return { health: 1.5, damage: 1.5, loot: 1.5 };
        case Difficulty.Insane:
            return { health: 3.0, damage: 3.0, loot: 2.0 };
        case Difficulty.Normal:
        default:
            return { health: 1.0, damage: 1.0, loot: 1.0 };
    }
}

function getRandomPositionOutsideSafeZone(): Vector2D {
    const angle = Math.random() * Math.PI * 2;
    // Spawn between safe zone edge and map edge (minus buffer)
    const minR = GAME_CONFIG.SAFE_ZONE_RADIUS + 100;
    const maxR = Math.min(GAME_CONFIG.WORLD_WIDTH/2, GAME_CONFIG.WORLD_HEIGHT/2) - 100;
    const dist = minR + Math.random() * (maxR - minR);
    
    return {
        x: GAME_CONFIG.WORLD_WIDTH/2 + Math.cos(angle) * dist,
        y: GAME_CONFIG.WORLD_HEIGHT/2 + Math.sin(angle) * dist
    };
}

function spawnEnemy(room: RoomState, type: EnemyType, position: Vector2D, level: number) {
    const id = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const multipliers = getDifficultyMultipliers(room.difficulty);

    const health = Math.floor(20 * type.healthMultiplier * (1 + level * 0.2) * multipliers.health);
    const damage = Math.floor(0.75 * type.damageMultiplier * (1 + level * 0.15) * multipliers.damage);

    room.enemies.set(id, {
        id,
        position: { ...position },
        spawnPosition: { ...position },
        health: health,
        maxHealth: health,
        level: level,
        isBoss: false,
        typeId: Object.keys(room.worldId === WORLD_IDS.WORLD_2 ? GROVE_ENEMIES : ENEMY_TYPES).find(key => (room.worldId === WORLD_IDS.WORLD_2 ? GROVE_ENEMIES[key] : ENEMY_TYPES[key]) === type) || 'unknown',
        radius: type.radius,
        damage: damage,
        damageTakenMap: {},
        isReturning: false
    });
}

function spawnMobPacks(room: RoomState) {
    // Cap check
    if (room.enemies.size >= GAME_CONFIG.MAX_ENEMIES) return;
    
    // Throttle spawning (1 pack per tick check if under cap)
    room.mobSpawnTimer++;
    if (room.mobSpawnTimer < 10) return; 
    room.mobSpawnTimer = 0;

    const packCenter = getRandomPositionOutsideSafeZone();
    const level = room.worldId === WORLD_IDS.WORLD_2 ? GAME_CONFIG.MAX_LEVEL : Math.floor(Math.random() * 15) + 1;
    
    if (room.worldId === WORLD_IDS.WORLD_2) {
        // --- THE GROVE (World 2) SPAWN LOGIC ---
        const packRoll = Math.random();
        
        if (packRoll < 0.4) {
            // 40% Chance: Wolf Pack (3-5 Fast Wolves)
            const packSize = Math.floor(Math.random() * 3) + 3;
            for(let i=0; i<packSize; i++) {
                const offset = { x: (Math.random()-0.5)*100, y: (Math.random()-0.5)*100 };
                spawnEnemy(room, GROVE_ENEMIES['wolf'], { x: packCenter.x + offset.x, y: packCenter.y + offset.y }, level);
            }
        } else if (packRoll < 0.7) {
            // 30% Chance: Forest Guardians (1 Treant + 2 Dryads)
            spawnEnemy(room, GROVE_ENEMIES['treant'], packCenter, level);
            spawnEnemy(room, GROVE_ENEMIES['dryad'], { x: packCenter.x + 50, y: packCenter.y + 50 }, level);
            spawnEnemy(room, GROVE_ENEMIES['dryad'], { x: packCenter.x - 50, y: packCenter.y - 50 }, level);
        } else {
            // 30% Chance: Bear Ambush (1-2 Bears)
             const count = Math.random() > 0.5 ? 2 : 1;
             for(let i=0; i<count; i++) {
                const offset = { x: (Math.random()-0.5)*80, y: (Math.random()-0.5)*80 };
                spawnEnemy(room, GROVE_ENEMIES['bear'], { x: packCenter.x + offset.x, y: packCenter.y + offset.y }, level);
            }
        }

    } else {
        // --- THE RAT (World 1) SPAWN LOGIC ---
        // Random assortment
        const types = Object.values(ENEMY_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];
        const packSize = Math.floor(Math.random() * 3) + 1;
        
        for(let i=0; i<packSize; i++) {
            const offset = { x: (Math.random()-0.5)*80, y: (Math.random()-0.5)*80 };
            spawnEnemy(room, type, { x: packCenter.x + offset.x, y: packCenter.y + offset.y }, level);
        }
    }
}

function spawnBosses(room: RoomState) {
    room.bossSpawnTimer++;
    if (room.bossSpawnTimer >= 60) { 
        room.bossSpawnTimer = 0;
        const activeBosses = Array.from(room.enemies.values()).filter(e => e.isBoss);
        const isCooldownReady = Date.now() > room.globalBossCooldown;

        if (activeBosses.length < BOSS_CONFIG.MAX_ACTIVE_BOSSES && isCooldownReady) {
            const occupiedZoneIds = activeBosses.map(e => e.bossZoneId);
            const availableZones = BOSS_ZONES.filter(z => !occupiedZoneIds.includes(z.id));

            if (availableZones.length > 0) {
                const zone = availableZones[Math.floor(Math.random() * availableZones.length)];
                
                let type = BOSS_TYPES[zone.id];
                
                // WORLD 2 BOSS OVERRIDE
                if (room.worldId === WORLD_IDS.WORLD_2) {
                    type = GROVE_BOSSES[zone.id];
                }

                if (type) {
                    const id = `boss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const multipliers = getDifficultyMultipliers(room.difficulty);

                    // APPLY ONLINE BOSS BUFFS * DIFFICULTY
                    const baseHealth = 20 * type.healthMultiplier * (1 + GAME_CONFIG.MAX_LEVEL * 0.2);
                    const health = baseHealth * ONLINE_BOSS_CONFIG.HEALTH_MULTIPLIER * multipliers.health;
                    
                    const baseDamage = 0.75 * type.damageMultiplier * (1 + GAME_CONFIG.MAX_LEVEL * 0.15); 
                    const damage = baseDamage * ONLINE_BOSS_CONFIG.DAMAGE_MULTIPLIER * multipliers.damage;
                    
                    const radius = type.radius * ONLINE_BOSS_CONFIG.SIZE_MULTIPLIER;

                    room.enemies.set(id, {
                        id,
                        position: { x: zone.x, y: zone.y },
                        spawnPosition: { x: zone.x, y: zone.y },
                        health: health,
                        maxHealth: health,
                        level: GAME_CONFIG.MAX_LEVEL,
                        isBoss: true,
                        bossZoneId: zone.id,
                        typeId: zone.id,
                        radius: radius,
                        damage: damage,
                        damageTakenMap: {}, 
                        isReturning: false 
                    });
                    room.globalBossCooldown = Date.now() + BOSS_CONFIG.SPAWN_COOLDOWN;
                }
            }
        }
    }
}

app.use('/', express.static(__dirname) as any);

app.get('*', (_req: Request, res: Response) => {
    (res as any).sendFile(path.resolve(__dirname, 'index.html'));
});

io.on('connection', (socket: Socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('check_status', () => {
        socket.emit('status_response', isWorldLocked);
    });

    socket.on('admin_toggle_lock', (locked: boolean) => {
        isWorldLocked = locked;
        console.log(`Server Online Mode Locked: ${isWorldLocked}`);
        io.emit('status_response', isWorldLocked); 
    });

    socket.on('join_game', ({ characterData, difficulty, isDev }: { characterData: CharacterData, difficulty?: Difficulty, isDev?: boolean }) => {
        
        if (isWorldLocked && !isDev) {
            console.log(`Rejected join for ${characterData.name} (Server Locked)`);
            socket.emit('join_error', 'Online world is currently unavailable.');
            return;
        }
        
        const selectedDifficulty = difficulty || Difficulty.Normal;
        const currentWorldId = characterData.currentWorldId || WORLD_IDS.WORLD_1;
        const roomKey = getRoomKey(currentWorldId, selectedDifficulty);
        
        const startPosition = characterData.position || { 
            x: GAME_CONFIG.WORLD_WIDTH / 2, 
            y: GAME_CONFIG.WORLD_HEIGHT / 2 
        };

        const stats = calculateFinalStats(characterData.stats, characterData.equipment, undefined, true, currentWorldId); 

        // Handle Party Logic (Reconnect)
        let partyId: string | null = null;
        for (const [pid, party] of parties.entries()) {
            const member = party.members.find(m => m.characterId === characterData.id);
            if (member) {
                partyId = pid;
                member.id = socket.id;
                member.isOnline = true;
                broadcastPartyUpdate(pid);
                break;
            }
        }
        
        socket.join(roomKey); 
        const room = GAME_ROOMS[roomKey];

        if (!room) {
            // Should not happen if rooms initialized
             console.error("Invalid room key:", roomKey);
             return;
        }

        room.players.set(socket.id, {
            id: socket.id,
            socketId: socket.id,
            characterData,
            position: startPosition,
            input: new Set<string>(),
            speed: stats.speed,
            radius: GAME_CONFIG.PLAYER_RADIUS,
            partyId: partyId,
            tradeSessionId: null,
            difficulty: selectedDifficulty,
            worldId: currentWorldId
        });
        
        console.log(`Player ${characterData.name} (${socket.id}) joined [${roomKey}].`);
        
        if (partyId) {
             io.to(socket.id).emit('party_update', parties.get(partyId));
        }
    });
    
    socket.on('update_character', (characterData: CharacterData) => {
        const player = getPlayer(socket.id);
        if (player) {
            player.characterData = characterData;
            if (characterData.position) {
                player.position = characterData.position;
            }
            const stats = calculateFinalStats(characterData.stats, characterData.equipment, player.position, true, player.worldId);
            
            player.speed = stats.speed;
            if (player.partyId) broadcastPartyUpdate(player.partyId);
        }
    });

    socket.on('player_input', (inputKeys: string[]) => {
        const player = getPlayer(socket.id);
        if (player) {
            const keys = Array.isArray(inputKeys) ? inputKeys : [];
            player.input = new Set(keys);
        }
    });

    // --- PARTY EVENTS ---
    socket.on('party_invite', (targetName: string) => {
        const sender = getPlayer(socket.id);
        if (!sender) return;

        const target = getAllPlayers().find(p => p.characterData.name.toLowerCase() === targetName.toLowerCase());
        
        if (target) {
            if (target.id === sender.id) return; 
            if (target.partyId) return; 
            if (target.difficulty !== sender.difficulty) return; // Must be in same difficulty
            if (target.worldId !== sender.worldId) return; // Must be in same world

            io.to(target.socketId).emit('invite_received', {
                fromId: sender.id,
                fromName: sender.characterData.name,
                type: 'party'
            });
        }
    });

    socket.on('party_accept', (fromId: string) => {
        const acceptor = getPlayer(socket.id);
        const sender = getPlayer(fromId);
        
        if (!acceptor || !sender) return;
        if (acceptor.partyId) return;
        if (acceptor.difficulty !== sender.difficulty) return;
        if (acceptor.worldId !== sender.worldId) return;

        let partyId = sender.partyId;
        if (!partyId) {
            partyId = `party_${Date.now()}_${Math.random()}`;
            const newParty: Party = {
                id: partyId,
                leaderId: sender.id,
                members: []
            };
            parties.set(partyId, newParty);
            
            sender.partyId = partyId;
            newParty.members.push({
                id: sender.id,
                characterId: sender.characterData.id,
                name: sender.characterData.name,
                level: sender.characterData.level,
                characterClass: sender.characterData.characterClass,
                health: sender.characterData.stats.health,
                maxHealth: sender.characterData.stats.maxHealth,
                isOnline: true
            });
        }
        
        const party = parties.get(partyId);
        if (party) {
            acceptor.partyId = partyId;
            party.members.push({
                id: acceptor.id,
                characterId: acceptor.characterData.id,
                name: acceptor.characterData.name,
                level: acceptor.characterData.level,
                characterClass: acceptor.characterData.characterClass,
                health: acceptor.characterData.stats.health,
                maxHealth: acceptor.characterData.stats.maxHealth,
                isOnline: true
            });
            broadcastPartyUpdate(partyId);
        }
    });

    socket.on('party_leave', () => {
        leaveParty(socket.id);
    });

    // --- TRADE EVENTS ---
    socket.on('trade_request', (targetId: string) => {
        const sender = getPlayer(socket.id);
        const target = getPlayer(targetId);
        if (!sender || !target) return;
        
        if (sender.tradeSessionId || target.tradeSessionId) return; 
        if (sender.partyId !== target.partyId || !sender.partyId) return; 
        if (sender.difficulty !== target.difficulty) return;
        if (sender.worldId !== target.worldId) return;

        io.to(target.socketId).emit('invite_received', {
            fromId: sender.id,
            fromName: sender.characterData.name,
            type: 'trade'
        });
    });

    socket.on('trade_accept', (fromId: string) => {
        const p2 = getPlayer(socket.id); 
        const p1 = getPlayer(fromId); 
        
        if (!p1 || !p2) return;
        if (p1.tradeSessionId || p2.tradeSessionId) return;

        const sessionId = `trade_${Date.now()}`;
        const session: TradeSession = {
            id: sessionId,
            player1Id: p1.id,
            player2Id: p2.id,
            player1Name: p1.characterData.name,
            player2Name: p2.characterData.name,
            player1Offer: { gold: 0, items: [], isLocked: false },
            player2Offer: { gold: 0, items: [], isLocked: false },
        };

        tradeSessions.set(sessionId, session);
        p1.tradeSessionId = sessionId;
        p2.tradeSessionId = sessionId;

        io.to(p1.socketId).emit('trade_update', session);
        io.to(p2.socketId).emit('trade_update', session);
    });

    socket.on('trade_update', (payload: { gold: number, items: any[] }) => {
        const player = getPlayer(socket.id);
        if (!player || !player.tradeSessionId) return;
        
        const session = tradeSessions.get(player.tradeSessionId);
        if (!session) return;

        const isP1 = session.player1Id === player.id;
        const offer = isP1 ? session.player1Offer : session.player2Offer;
        
        if (offer.isLocked) return; 

        offer.gold = payload.gold;
        offer.items = payload.items;
        
        session.player1Offer.isLocked = false;
        session.player2Offer.isLocked = false;

        const p1 = getPlayer(session.player1Id);
        const p2 = getPlayer(session.player2Id);
        if (p1) io.to(p1.socketId).emit('trade_update', session);
        if (p2) io.to(p2.socketId).emit('trade_update', session);
    });

    socket.on('trade_lock', (isLocked: boolean) => {
        const player = getPlayer(socket.id);
        if (!player || !player.tradeSessionId) return;
        
        const session = tradeSessions.get(player.tradeSessionId);
        if (!session) return;

        const isP1 = session.player1Id === player.id;
        if (isP1) session.player1Offer.isLocked = isLocked;
        else session.player2Offer.isLocked = isLocked;

        const p1 = getPlayer(session.player1Id);
        const p2 = getPlayer(session.player2Id);
        if (p1) io.to(p1.socketId).emit('trade_update', session);
        if (p2) io.to(p2.socketId).emit('trade_update', session);

        if (session.player1Offer.isLocked && session.player2Offer.isLocked) {
            processTrade(session);
        }
    });

    socket.on('trade_cancel', () => {
        const player = getPlayer(socket.id);
        if (player && player.tradeSessionId) {
            endTrade(player.tradeSessionId, false);
        }
    });

    socket.on('hit_enemy', (payload: { enemyId: string, damage: number }) => {
        const attacker = getPlayer(socket.id);
        if (!attacker) return;

        const roomKey = getRoomKey(attacker.worldId, attacker.difficulty);
        const room = GAME_ROOMS[roomKey];
        if (!room) return;

        const enemy = room.enemies.get(payload.enemyId);
        
        if (enemy) {
            if (enemy.isReturning) return;

            enemy.health -= payload.damage;
            
            if (!enemy.damageTakenMap) enemy.damageTakenMap = {};
            if (!enemy.damageTakenMap[socket.id]) enemy.damageTakenMap[socket.id] = 0;
            enemy.damageTakenMap[socket.id] += payload.damage;

            if (enemy.health <= 0) {
                room.enemies.delete(payload.enemyId);
                
                if (enemy.isBoss) {
                     room.globalBossCooldown = Date.now() + BOSS_CONFIG.SPAWN_COOLDOWN;
                }

                const multipliers = getDifficultyMultipliers(attacker.difficulty);

                if (enemy.isBoss && enemy.damageTakenMap) {
                    const totalDamage = Object.values(enemy.damageTakenMap).reduce((a, b) => a + b, 0);
                    
                    Object.entries(enemy.damageTakenMap).forEach(([pid, dmg]) => {
                        const recipient = room.players.get(pid);
                        if (!recipient) return;

                        const contribution = Math.min(1.0, Math.max(0.0, dmg / totalDamage));
                        
                        let xpValue = 15 * enemy.level + Math.pow(enemy.level, 2.1);
                        if (enemy.isBoss) xpValue *= 10;
                        const goldReward = Math.floor((Math.random() * enemy.level + 1) * (enemy.isBoss ? 20 : 1));
                        
                        io.to(recipient.socketId).emit('enemy_killed', {
                            enemyId: payload.enemyId,
                            xp: Math.floor(xpValue), 
                            gold: Math.floor(goldReward),
                            enemyLevel: enemy.level
                        });

                        const killerStats = calculateFinalStats(
                            recipient.characterData.stats, 
                            recipient.characterData.equipment, 
                            recipient.position,
                            true,
                            recipient.worldId
                        );

                        const drops = generateLoot(
                            enemy.level, 
                            enemy.position, 
                            enemy.isBoss, 
                            killerStats.itemFind || 0,
                            true,
                            contribution * multipliers.loot 
                        );

                        if (drops.length > 0) {
                            io.to(recipient.socketId).emit('loot_dropped', drops.map(item => ({
                                item,
                                position: enemy.position
                            })));
                        }
                    });

                } else {
                    // MOB LOGIC
                    const recipients: ServerPlayer[] = [];
                    if (attacker.partyId) {
                        const party = parties.get(attacker.partyId);
                        if (party) {
                            party.members.forEach(m => {
                                const p = room.players.get(m.id);
                                if (p && getDistance(p.position, enemy.position) < 1500) {
                                    recipients.push(p);
                                }
                            });
                        } else {
                            recipients.push(attacker);
                        }
                    } else {
                        recipients.push(attacker);
                    }

                    const isPartyKill = recipients.length > 1;
                    const multiplier = isPartyKill ? 0.8 : 1.0;

                    recipients.forEach(recipient => {
                        let xpValue = 15 * enemy.level + Math.pow(enemy.level, 2.1);
                        const xpReward = Math.floor(xpValue * multiplier);
                        const goldReward = Math.floor((Math.random() * enemy.level + 1) * multiplier);

                        io.to(recipient.socketId).emit('enemy_killed', {
                            enemyId: payload.enemyId,
                            xp: xpReward,
                            gold: goldReward,
                            enemyLevel: enemy.level
                        });

                        const killerStats = calculateFinalStats(
                            recipient.characterData.stats, 
                            recipient.characterData.equipment, 
                            recipient.position,
                            true,
                            recipient.worldId
                        );

                        const drops = generateLoot(
                            enemy.level, 
                            enemy.position, 
                            enemy.isBoss, 
                            killerStats.itemFind || 0,
                            true,
                            1.0 * multipliers.loot 
                        );

                        const finalDrops = isPartyKill 
                            ? drops.filter(() => Math.random() < 0.8) 
                            : drops;

                        if (finalDrops.length > 0) {
                            io.to(recipient.socketId).emit('loot_dropped', finalDrops.map(item => ({
                                item,
                                position: enemy.position
                            })));
                        }
                    });
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        const p = getPlayer(socket.id);
        
        if (p) {
            // Remove from room
            const roomKey = getRoomKey(p.worldId, p.difficulty);
            const room = GAME_ROOMS[roomKey];
            if (room) room.players.delete(socket.id);

            // Mark offline in party
            if (p.partyId) {
                const party = parties.get(p.partyId);
                if (party) {
                    const member = party.members.find(m => m.id === socket.id);
                    if (member) {
                        member.isOnline = false;
                        broadcastPartyUpdate(p.partyId);
                    }
                }
            }
            if (p.tradeSessionId) endTrade(p.tradeSessionId, false);
        }
    });
});

setInterval(() => {
    // Loop through ALL rooms
    Object.entries(GAME_ROOMS).forEach(([roomKey, room]) => {
        
        // 1. Update Players
        for (const player of room.players.values()) {
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
        
        // 2. Update Enemies for this room
        spawnBosses(room);
        spawnMobPacks(room);
        
        const playerList = Array.from(room.players.values());
        for (const enemy of room.enemies.values()) {
            // --- LEASH LOGIC ---
            if (enemy.isReturning) {
                const dx = enemy.spawnPosition!.x - enemy.position.x;
                const dy = enemy.spawnPosition!.y - enemy.position.y;
                const distToSpawn = Math.sqrt(dx*dx + dy*dy);
                
                const type = BOSS_TYPES[enemy.typeId] || GROVE_BOSSES[enemy.typeId];
                const speed = (type ? type.speed : 2) * 2; 

                if (distToSpawn > 5) {
                    enemy.position.x += (dx / distToSpawn) * speed;
                    enemy.position.y += (dy / distToSpawn) * speed;
                    enemy.health = Math.min(enemy.maxHealth, enemy.health + enemy.maxHealth * 0.02); 
                } else {
                    enemy.isReturning = false;
                    enemy.health = enemy.maxHealth;
                    enemy.damageTakenMap = {};
                }
                continue;
            }

            const leashRange = enemy.isBoss ? GAME_CONFIG.BOSS_LEASH_RANGE : GAME_CONFIG.ENEMY_LEASH_RANGE;
            const distFromSpawn = getDistance(enemy.position, enemy.spawnPosition || {x:0,y:0});
            
            if (distFromSpawn > leashRange) {
                enemy.isReturning = true;
                enemy.damageTakenMap = {}; 
                continue;
            }

            // --- AGGRO LOGIC ---
            let type = BOSS_TYPES[enemy.typeId];
            if (room.worldId === WORLD_IDS.WORLD_2) type = GROVE_BOSSES[enemy.typeId]; // Use Grove stats
            if (!type) {
                // Fallback for normal mobs
                const mobType = ENEMY_TYPES[enemy.typeId] || GROVE_ENEMIES[enemy.typeId];
                type = mobType;
            }

            const speed = type ? type.speed : 2;
            const attackRange = type ? type.attackRange : 30;
            const stopDistance = attackRange * 0.8;

            let nearestDist = 99999;
            let nearestPlayer: ServerPlayer | null = null;
            
            // If boss, check if it has been damaged (aggroed)
            if (enemy.isBoss) {
                 const hasAggro = enemy.damageTakenMap && Object.keys(enemy.damageTakenMap).length > 0;
                 if (!hasAggro) continue; 
            }

            for (const p of playerList) {
                const d = getDistance(enemy.position, p.position);
                if (d < nearestDist) {
                    nearestDist = d;
                    nearestPlayer = p;
                }
            }
            
            let canChase = false;
            if (enemy.isBoss) {
                canChase = true; 
            } else {
                canChase = nearestDist < GAME_CONFIG.ENEMY_AGGRO_RANGE;
            }

            if (nearestPlayer && canChase && nearestDist > stopDistance) {
                const dx = nearestPlayer.position.x - enemy.position.x;
                const dy = nearestPlayer.position.y - enemy.position.y;
                const len = Math.sqrt(dx*dx + dy*dy);
                if (len > 0) {
                    enemy.position.x += (dx/len) * speed;
                    enemy.position.y += (dy/len) * speed;
                }
            }
        }

        // 3. Broadcast State to Room (Unique key)
        const playersObj: any = {};
        room.players.forEach((p, id) => {
            playersObj[id] = {
                position: p.position,
                characterData: p.characterData
            };
        });

        const safeEnemies = Array.from(room.enemies.values()).map(({ damageTakenMap, ...e }) => e);

        io.to(roomKey).emit('game_state', { 
            players: playersObj, 
            enemies: safeEnemies
        });
    });

}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
