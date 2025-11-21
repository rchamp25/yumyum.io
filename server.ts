
import express, { Request, Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { Vector2D, CharacterData, ServerEnemy, Party, TradeSession } from './game/types';
import { GAME_CONFIG, BOSS_TYPES, BOSS_ZONES, BOSS_CONFIG, ONLINE_BOSS_CONFIG } from './game/constants';
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
const parties = new Map<string, Party>();
const tradeSessions = new Map<string, TradeSession>();

let bossSpawnTimer = 0;
let globalBossCooldown = 0;

// --- Party Helpers ---
function broadcastPartyUpdate(partyId: string) {
    const party = parties.get(partyId);
    if (party) {
        party.members.forEach(m => {
            // Only send to online members
            if (m.isOnline) {
                // Update health info for online members before sending
                const p = players.get(m.id);
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
    const player = players.get(playerId);
    if (!player || !player.partyId) return;
    
    const partyId = player.partyId;
    const party = parties.get(partyId);
    
    if (party) {
        // Actually remove the member
        party.members = party.members.filter(m => m.id !== playerId);
        player.partyId = null;
        io.to(playerId).emit('party_update', null);

        if (party.members.length === 0) {
            parties.delete(partyId);
        } else {
            if (party.leaderId === playerId) {
                // Pass leadership to first online member, or first member if all offline
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
        const p1 = players.get(session.player1Id);
        const p2 = players.get(session.player2Id);
        
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
    const p1 = players.get(session.player1Id);
    const p2 = players.get(session.player2Id);
    
    if (!p1 || !p2) {
        endTrade(session.id, false);
        return;
    }

    // Verify gold
    if (p1.characterData.gold < session.player1Offer.gold || p2.characterData.gold < session.player2Offer.gold) {
        endTrade(session.id, false);
        return;
    }
    
    // Verify Items existence
    
    // Execute Swap
    // 1. Deduct Gold
    p1.characterData.gold -= session.player1Offer.gold;
    p2.characterData.gold -= session.player2Offer.gold;
    
    // 2. Remove Items (Set to null in inventory)
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
    
    // 3. Add Gold
    p1.characterData.gold += session.player2Offer.gold;
    p2.characterData.gold += session.player1Offer.gold;

    // 4. Add Items (Find empty slots)
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

    // Sync updates to clients
    io.to(p1.socketId).emit('update_character', p1.characterData);
    io.to(p2.socketId).emit('update_character', p2.characterData);
    
    endTrade(session.id, true);
}


function spawnEnemies() {
    // ONLINE MODE SPAWN LOGIC: BOSS RUSH
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
                    
                    // APPLY ONLINE BOSS BUFFS
                    const baseHealth = 20 * type.healthMultiplier * (1 + GAME_CONFIG.MAX_LEVEL * 0.2);
                    const health = baseHealth * ONLINE_BOSS_CONFIG.HEALTH_MULTIPLIER;
                    
                    const baseDamage = 0.75 * type.damageMultiplier * (1 + GAME_CONFIG.MAX_LEVEL * 0.15); // Base dmg formula from Enemy.ts
                    const damage = baseDamage * ONLINE_BOSS_CONFIG.DAMAGE_MULTIPLIER;
                    
                    const radius = type.radius * ONLINE_BOSS_CONFIG.SIZE_MULTIPLIER;

                    enemies.set(id, {
                        id,
                        position: { x: zone.x, y: zone.y },
                        spawnPosition: { x: zone.x, y: zone.y }, // TRACK SPAWN FOR LEASHING
                        health: health,
                        maxHealth: health,
                        level: GAME_CONFIG.MAX_LEVEL,
                        isBoss: true,
                        bossZoneId: zone.id,
                        typeId: zone.id,
                        radius: radius,
                        damage: damage
                    });
                    globalBossCooldown = Date.now() + BOSS_CONFIG.SPAWN_COOLDOWN;
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

    socket.on('join_game', (characterData: CharacterData) => {
        const startPosition = characterData.position || { 
            x: GAME_CONFIG.WORLD_WIDTH / 2, 
            y: GAME_CONFIG.WORLD_HEIGHT / 2 
        };

        const stats = calculateFinalStats(characterData.stats, characterData.equipment, undefined, true); 

        // Check if reconnecting to party
        let partyId: string | null = null;
        for (const [pid, party] of parties.entries()) {
            const member = party.members.find(m => m.characterId === characterData.id);
            if (member) {
                partyId = pid;
                member.id = socket.id; // Update socket ID
                member.isOnline = true;
                broadcastPartyUpdate(pid);
                break;
            }
        }

        players.set(socket.id, {
            id: socket.id,
            socketId: socket.id,
            characterData,
            position: startPosition,
            input: new Set<string>(),
            speed: stats.speed,
            radius: GAME_CONFIG.PLAYER_RADIUS,
            partyId: partyId,
            tradeSessionId: null
        });
        console.log(`Player ${characterData.name} (${socket.id}) joined.`);
        
        if (partyId) {
             io.to(socket.id).emit('party_update', parties.get(partyId));
        }
    });
    
    socket.on('update_character', (characterData: CharacterData) => {
        const player = players.get(socket.id);
        if (player) {
            player.characterData = characterData;
            const stats = calculateFinalStats(characterData.stats, characterData.equipment, player.position, true);
            player.speed = stats.speed;
            if (player.partyId) broadcastPartyUpdate(player.partyId);
        }
    });

    socket.on('player_input', (inputKeys: string[]) => {
        const player = players.get(socket.id);
        if (player) {
            const keys = Array.isArray(inputKeys) ? inputKeys : [];
            player.input = new Set(keys);
        }
    });

    // --- PARTY EVENTS ---
    socket.on('party_invite', (targetName: string) => {
        const sender = players.get(socket.id);
        if (!sender) return;

        const target = Array.from(players.values()).find(p => p.characterData.name.toLowerCase() === targetName.toLowerCase());
        
        if (target) {
            if (target.id === sender.id) return; 
            if (target.partyId) return; 
            
            io.to(target.socketId).emit('invite_received', {
                fromId: sender.id,
                fromName: sender.characterData.name,
                type: 'party'
            });
        }
    });

    socket.on('party_accept', (fromId: string) => {
        const acceptor = players.get(socket.id);
        const sender = players.get(fromId);
        
        if (!acceptor || !sender) return;
        if (acceptor.partyId) return;

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
        const sender = players.get(socket.id);
        const target = players.get(targetId);
        if (!sender || !target) return;
        
        if (sender.tradeSessionId || target.tradeSessionId) return; 
        if (sender.partyId !== target.partyId || !sender.partyId) return; 

        io.to(target.socketId).emit('invite_received', {
            fromId: sender.id,
            fromName: sender.characterData.name,
            type: 'trade'
        });
    });

    socket.on('trade_accept', (fromId: string) => {
        const p2 = players.get(socket.id); 
        const p1 = players.get(fromId); 
        
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
        const player = players.get(socket.id);
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

        io.to(players.get(session.player1Id)!.socketId).emit('trade_update', session);
        io.to(players.get(session.player2Id)!.socketId).emit('trade_update', session);
    });

    socket.on('trade_lock', (isLocked: boolean) => {
        const player = players.get(socket.id);
        if (!player || !player.tradeSessionId) return;
        
        const session = tradeSessions.get(player.tradeSessionId);
        if (!session) return;

        const isP1 = session.player1Id === player.id;
        if (isP1) session.player1Offer.isLocked = isLocked;
        else session.player2Offer.isLocked = isLocked;

        io.to(players.get(session.player1Id)!.socketId).emit('trade_update', session);
        io.to(players.get(session.player2Id)!.socketId).emit('trade_update', session);

        if (session.player1Offer.isLocked && session.player2Offer.isLocked) {
            processTrade(session);
        }
    });

    socket.on('trade_cancel', () => {
        const player = players.get(socket.id);
        if (player && player.tradeSessionId) {
            endTrade(player.tradeSessionId, false);
        }
    });

    socket.on('hit_enemy', (payload: { enemyId: string, damage: number }) => {
        const enemy = enemies.get(payload.enemyId);
        const attacker = players.get(socket.id);
        
        if (enemy && attacker) {
            enemy.health -= payload.damage;
            if (enemy.health <= 0) {
                enemies.delete(payload.enemyId);
                
                if (enemy.isBoss) {
                     globalBossCooldown = Date.now() + BOSS_CONFIG.SPAWN_COOLDOWN;
                }

                const recipients: ServerPlayer[] = [];
                if (attacker.partyId) {
                    const party = parties.get(attacker.partyId);
                    if (party) {
                        party.members.forEach(m => {
                            const p = players.get(m.id);
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
                    if (enemy.isBoss) xpValue *= 10;
                    const xpReward = Math.floor(xpValue * multiplier);
                    const goldReward = Math.floor((Math.random() * enemy.level + 1) * (enemy.isBoss ? 20 : 1) * multiplier);

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
                        true 
                    );

                    const drops = generateLoot(
                        enemy.level, 
                        enemy.position, 
                        enemy.isBoss, 
                        killerStats.itemFind || 0,
                        true 
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
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        // Mark as offline in party but do NOT leave
        const p = players.get(socket.id);
        if (p && p.partyId) {
            const party = parties.get(p.partyId);
            if (party) {
                const member = party.members.find(m => m.id === socket.id);
                if (member) {
                    member.isOnline = false;
                    broadcastPartyUpdate(p.partyId);
                }
            }
        }
        
        if (p && p.tradeSessionId) endTrade(p.tradeSessionId, false);
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
        // Leashing Logic
        let spawnPos = enemy.spawnPosition;
        if (!spawnPos) spawnPos = { x: 0, y: 0 }; 

        const distToSpawn = getDistance(enemy.position, spawnPos);
        const type = BOSS_TYPES[enemy.typeId];
        const speed = type ? type.speed : 2;

        // BOSS USES BOSS CONSTANTS
        // Mobs don't exist here in online mode, but if they did, they'd use ENEMY_ constants.
        const leashRange = enemy.isBoss ? GAME_CONFIG.BOSS_LEASH_RANGE : GAME_CONFIG.ENEMY_LEASH_RANGE;

        if (enemy.spawnPosition && distToSpawn > leashRange) { 
             const dx = spawnPos.x - enemy.position.x;
             const dy = spawnPos.y - enemy.position.y;
             const len = Math.sqrt(dx*dx + dy*dy);
             if (len > 0) {
                 enemy.position.x += (dx/len) * speed * 3;
                 enemy.position.y += (dy/len) * speed * 3;
             }
             enemy.health = Math.min(enemy.maxHealth, enemy.health + enemy.maxHealth * 0.01);
             if (len < 10) {
                 enemy.health = enemy.maxHealth;
             }
             continue;
        }

        let nearestDist = 99999;
        let nearestPlayer: ServerPlayer | null = null;
        
        for (const p of playerList) {
            const d = getDistance(enemy.position, p.position);
            if (d < nearestDist) {
                nearestDist = d;
                nearestPlayer = p;
            }
        }
        
        // Use BOSS CONSTANTS for bosses, regular constants for mobs
        const chaseRange = enemy.isBoss ? GAME_CONFIG.BOSS_AGGRO_RANGE : GAME_CONFIG.ENEMY_AGGRO_RANGE;
        const attackRange = type ? type.attackRange : 30; 
        
        const stopDistance = attackRange * 0.8;

        if (nearestPlayer && nearestDist < chaseRange && nearestDist > stopDistance) {
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
