
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CharacterData, GameStats, Item, ItemSlot, Recipe, Vector2D, WaypointData, ItemRarity, Party, TradeSession } from '../game/types';
import { Player } from '../game/entities/Player';
import { Enemy } from '../game/entities/Enemy';
import { Projectile } from '../game/entities/Projectile';
import { FloatingText } from '../game/entities/FloatingText';
import { VisualEffect } from '../game/entities/VisualEffect';
import { GroundEffect } from '../game/entities/GroundEffect';
import { DroppedItem } from '../game/entities/DroppedItem';
import { NPC } from '../game/entities/NPC';
import { Waypoint } from '../game/entities/Waypoint';
import { NPCType } from '../game/types';
import useGameLoop from '../hooks/useGameLoop';
import useKeyboardInput from '../hooks/useKeyboardInput';
import { GAME_CONFIG, WAYPOINTS, BOSS_ZONES, BOSS_CONFIG } from '../game/constants';
import { getDistance } from '../game/math';
import { CRAFTING_RECIPES } from '../game/items';
import HUD from './HUD';
import Inventory from './Inventory';
import NPCInteraction from './NPCInteraction';
import FastTravelUI from './FastTravelUI';
import PartyUI from './PartyUI';
import TradeUI from './TradeUI';
import { socketService } from '../services/socketService';

interface GameProps {
  characterData: CharacterData;
  onDeath: (stats: GameStats, finalCharacterData: CharacterData) => void;
  onReturnToSelect: (finalCharacterData: CharacterData) => void;
  isOnlineMode: boolean;
  isDevMode: boolean;
}

const Game: React.FC<GameProps> = ({ characterData, onDeath, onReturnToSelect, isOnlineMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameTimeRef = useRef(0);
  const bossSpawnTimerRef = useRef(0);
  const globalBossSpawnTimeRef = useRef(0);
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [visualEffects, setVisualEffects] = useState<VisualEffect[]>([]);
  const [groundEffects, setGroundEffects] = useState<GroundEffect[]>([]);
  const [droppedItems, setDroppedItems] = useState<DroppedItem[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [otherPlayers, setOtherPlayers] = useState<any[]>([]);
  
  const [isInventoryOpen, setInventoryOpen] = useState(false);
  const [interactingNPC, setInteractingNPC] = useState<NPC | null>(null);
  const [interactingWaypoint, setInteractingWaypoint] = useState<Waypoint | null>(null);
  
  // Multiplayer State
  const [party, setParty] = useState<Party | null>(null);
  const [isPartyUIOpen, setPartyUIOpen] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<{type: 'party'|'trade', fromId: string, fromName: string}[]>([]);
  const [activeTradeSession, setActiveTradeSession] = useState<TradeSession | null>(null);

  const pressedKeys = useKeyboardInput();
  const playerIdRef = useRef<string>('');

  const addProjectile = useCallback((p: Projectile) => setProjectiles(prev => [...prev, p]), []);
  const addFloatingText = useCallback((ft: FloatingText) => setFloatingTexts(prev => [...prev, ft]), []);
  const addVisualEffect = useCallback((ve: VisualEffect) => setVisualEffects(prev => [...prev, ve]), []);
  const addGroundEffect = useCallback((ge: GroundEffect) => setGroundEffects(prev => [...prev, ge]), []);
  const addDroppedItem = useCallback((di: DroppedItem) => setDroppedItems(prev => [...prev, di]), []);

  const playSound = useCallback((type: 'attack' | 'damage' | 'hit' | 'level_up' | 'boss_spawn') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        const t = ctx.currentTime;

        if (type === 'boss_spawn') {
            masterGain.gain.setValueAtTime(0.4, t);
            masterGain.gain.exponentialRampToValueAtTime(0.01, t + 3);
            const osc1 = ctx.createOscillator();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(100, t);
            osc1.frequency.linearRampToValueAtTime(30, t + 2.5);
            osc1.connect(masterGain);
            osc1.start();
            osc1.stop(t + 3);
        } 
        else if (type === 'attack') {
             const bufferSize = ctx.sampleRate * 0.2;
             const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
             const data = buffer.getChannelData(0);
             for (let i = 0; i < bufferSize; i++) {
                 data[i] = Math.random() * 2 - 1;
             }
             const noise = ctx.createBufferSource();
             noise.buffer = buffer;
             const gain = ctx.createGain();
             gain.gain.setValueAtTime(0.1, t);
             gain.gain.linearRampToValueAtTime(0.001, t + 0.15);
             noise.connect(gain);
             gain.connect(masterGain);
             noise.start();
        } 
        else if (type === 'damage') {
             const osc = ctx.createOscillator();
             osc.type = 'sine';
             osc.frequency.setValueAtTime(150, t);
             osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
             const gain = ctx.createGain();
             gain.gain.setValueAtTime(0.2, t);
             gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
             osc.connect(gain);
             gain.connect(masterGain);
             osc.start();
             osc.stop(t + 0.25);
        } 
        else if (type === 'hit') {
            const bufferSize = ctx.sampleRate * 0.05;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
            noise.connect(gain);
            gain.connect(masterGain);
            noise.start();
        }
        else if (type === 'level_up') {
             const notes = [440, 554.37, 659.25, 880];
             notes.forEach((freq, i) => {
                 const o = ctx.createOscillator();
                 o.type = 'sine';
                 o.frequency.value = freq;
                 const g = ctx.createGain();
                 g.gain.setValueAtTime(0, t);
                 g.gain.linearRampToValueAtTime(0.1, t + 0.1 + (i * 0.05));
                 g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
                 o.connect(g);
                 g.connect(masterGain);
                 o.start(t + (i * 0.05));
                 o.stop(t + 2);
             });
        }
    } catch (e) {
        console.error("Audio playback failed", e);
    }
  }, []);

  const isVisible = (pos: Vector2D, radius: number = 0, buffer: number = 250) => {
      const cvsWidth = window.innerWidth;
      const cvsHeight = window.innerHeight;
      return pos.x + radius + buffer > camera.x &&
             pos.x - radius - buffer < camera.x + cvsWidth &&
             pos.y + radius + buffer > camera.y &&
             pos.y - radius - buffer < camera.y + cvsHeight;
  };

  const updateServerCharacter = useCallback((p: Player) => {
      if (isOnlineMode) {
          socketService.updateCharacter(p.toCharacterData());
      }
  }, [isOnlineMode]);

  // Initialize game
  useEffect(() => {
    const newPlayer = new Player(characterData);
    setPlayer(newPlayer);
    setCamera({ x: newPlayer.position.x, y: newPlayer.position.y });

    if (isOnlineMode) {
        socketService.connect((id) => {
            playerIdRef.current = id;
            console.log("Connected to game server!", id);
            socketService.joinGame(newPlayer.toCharacterData());
        });

        socketService.onGameState((payload) => {
            const others: any[] = [];
            Object.entries(payload.players).forEach(([id, data]) => {
                if (id !== playerIdRef.current) {
                    others.push(data);
                }
            });
            setOtherPlayers(others);
            
            if (payload.enemies) {
                setEnemies(prevEnemies => {
                    const newEnemyList = [...prevEnemies];
                    const serverIds = new Set(payload.enemies.map(e => e.id));
                    
                    payload.enemies.forEach(serverEnemy => {
                        const existing = newEnemyList.find(e => e.id === serverEnemy.id);
                        if (existing) {
                            existing.sync(serverEnemy);
                        } else {
                            const newEnemy = new Enemy(serverEnemy.position, serverEnemy.level, serverEnemy.bossZoneId, serverEnemy.id);
                            newEnemy.sync(serverEnemy);
                            newEnemyList.push(newEnemy);
                        }
                    });
                    return newEnemyList.filter(e => serverIds.has(e.id as string));
                });
            }
        });

        socketService.onLootDropped((drops) => {
            drops.forEach(drop => {
                addDroppedItem(new DroppedItem(drop.position, drop.item));
            });
        });

        socketService.onEnemyKilled((data) => {
            setPlayer(prev => {
                if (!prev) return null;
                const updatedPlayer = new Player(prev.toCharacterData());
                const oldLevel = updatedPlayer.level;
                
                updatedPlayer.gainXP(data.xp, addFloatingText, data.enemyLevel);
                if (updatedPlayer.level > oldLevel) {
                    playSound('level_up');
                    socketService.updateCharacter(updatedPlayer.toCharacterData());
                }
                
                updatedPlayer.gainGold(data.gold, addFloatingText);
                updatedPlayer.kills++;
                
                return updatedPlayer;
            });
        });
        
        socketService.onPartyUpdate((p) => {
            setParty(p);
        });

        socketService.onInviteReceived((invite) => {
            setPendingInvites(prev => [...prev, { type: invite.type, fromId: invite.fromId, fromName: invite.fromName }]);
        });
        
        socketService.onTradeUpdate((session) => {
            setActiveTradeSession(session);
            // If trade completed successfully (session becomes null but we need feedback), handled by separate event
        });
        
        socketService.onTradeCompleted((success) => {
            if (success) {
                addFloatingText(new FloatingText("Trade Successful!", player!.position, '#4ade80', 24));
                // Force update player data as trade modified inventory/gold directly on server
                // Ideally server sends update_character right before this, which we handle
            } else {
                addFloatingText(new FloatingText("Trade Failed", player!.position, '#ef4444', 24));
            }
            setActiveTradeSession(null);
        });
    }

    const cx = GAME_CONFIG.WORLD_WIDTH / 2;
    const cy = GAME_CONFIG.WORLD_HEIGHT / 2;
    const dist = 150;
    setNpcs([
        new NPC({ x: cx + dist, y: cy }, 'Thomas', NPCType.Crafter),
        new NPC({ x: cx - dist, y: cy }, 'Trevor', NPCType.Vendor),
        new NPC({ x: cx, y: cy - dist }, 'Jackson', NPCType.Seller),
        new NPC({ x: cx, y: cy + dist }, 'Rory', NPCType.WorldTraveler),
    ]);
    setWaypoints(WAYPOINTS.map(data => new Waypoint(data)));

    if (!isOnlineMode) {
        const initialEnemies: Enemy[] = [];
        const targetInitialPopulation = Math.floor(GAME_CONFIG.MAX_ENEMIES * 0.8);
        const worldCenter = { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 };
        
        const initialBossZone = BOSS_ZONES[Math.floor(Math.random() * BOSS_ZONES.length)];
        const initialBoss = new Enemy({ x: initialBossZone.x, y: initialBossZone.y }, GAME_CONFIG.MAX_LEVEL, initialBossZone.id);
        initialEnemies.push(initialBoss);
        globalBossSpawnTimeRef.current = Date.now() + BOSS_CONFIG.SPAWN_COOLDOWN;

        let attempts = 0;
        while (initialEnemies.length < targetInitialPopulation && attempts < 2000) {
            attempts++;
            const angle = Math.random() * Math.PI * 2;
            const radius = GAME_CONFIG.SAFE_ZONE_RADIUS + Math.random() * (3000 - GAME_CONFIG.SAFE_ZONE_RADIUS);
            const ex = worldCenter.x + Math.cos(angle) * radius;
            const ey = worldCenter.y + Math.sin(angle) * radius;

            if (ex > 100 && ex < GAME_CONFIG.WORLD_WIDTH - 100 && ey > 100 && ey < GAME_CONFIG.WORLD_HEIGHT - 100) {
                initialEnemies.push(new Enemy({ x: ex, y: ey }, Math.floor(Math.random() * GAME_CONFIG.MAX_LEVEL) + 1));
            }
        }
        setEnemies(initialEnemies);
    }

    return () => {
        if (isOnlineMode) {
            socketService.disconnect();
            socketService.offGameState();
        }
    };

  }, [characterData, playSound, isOnlineMode, addDroppedItem, addFloatingText]);
  
  const gameLoop = useCallback(() => {
    gameTimeRef.current++;
    
    if (!player || player.isDead) return;

    if (isOnlineMode) {
        socketService.sendInput(Array.from(pressedKeys));
    }

    const playerDistFromCenter = getDistance(player.position, {x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2});
    player.isInSafeZone = playerDistFromCenter <= GAME_CONFIG.SAFE_ZONE_RADIUS;
    
    const gameContext = { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode };
    
    player.update(pressedKeys, gameContext);

    waypoints.forEach(wp => {
        if (getDistance(player.position, wp.data.position) < wp.unlockRadius) {
            if (player.discoverWaypoint(wp.data.id)) {
                 addFloatingText(new FloatingText("Waypoint Discovered!", { x: player.position.x, y: player.position.y - 50 }, '#22d3ee', 20));
                 addVisualEffect(new VisualEffect(wp.data.position, 'buff_aura', 2000, { color: '#22d3ee', radius: 60 }));
                 updateServerCharacter(player);
            }
        }
    });

    const updatedEnemies = [...enemies]; 
    if (!isOnlineMode) {
        updatedEnemies.forEach(e => e.update(gameContext));
        bossSpawnTimerRef.current++;
    }

    projectiles.forEach(p => p.update());
    floatingTexts.forEach(ft => ft.update());
    visualEffects.forEach(ve => ve.update());
    groundEffects.forEach(ge => ge.update(updatedEnemies, gameContext));
    droppedItems.forEach(di => di.update(player));
    
    // Collisions
    projectiles.forEach(p => {
        if (p.ownerId === player.id || !p.isHostile) { 
            for (const enemy of updatedEnemies) {
                if (enemy.isDead) continue;
                if (getDistance(p.position, enemy.position) < p.radius + enemy.radius) {
                    if (isOnlineMode) {
                        // Optimistic visual feedback
                        const ft = new FloatingText(Math.round(p.damage).toString(), { x: enemy.position.x, y: enemy.position.y - enemy.radius }, '#fff');
                        addFloatingText(ft);
                        playSound('hit');
                        socketService.damageEnemy(enemy.id as string, p.damage);
                    } else {
                        p.onHit(enemy, gameContext);
                    }
                    if (!p.piercing && p.bounces <= 0) p.expire();
                }
            }
        } else if (p.isHostile) {
             if (getDistance(p.position, player.position) < p.radius + player.radius) {
                 p.onHit(player, gameContext);
                 if (!p.piercing) p.expire();
             }
        }
    });

    const remainingItems: DroppedItem[] = [];
    droppedItems.forEach(di => {
        if(getDistance(di.position, player.position) < player.radius) {
            if (player.pickupItem(di.item)) {
                 addFloatingText(new FloatingText(`+ ${di.item.name}`, player.position, '#ffd700'));
                 updateServerCharacter(player);
            } else {
                 addFloatingText(new FloatingText(`Inventory Full!`, player.position, '#ff4d4d'));
                 remainingItems.push(di);
            }
        } else {
            remainingItems.push(di);
        }
    });
    setDroppedItems(remainingItems);

    if (player.health <= 0) {
        const stats: GameStats = {
            killerName: player.lastDamagedBy || 'themselves',
            level: player.level,
            kills: player.kills,
            gold: player.gold,
            totalDamageTaken: player.totalDamageTaken,
            deathLog: player.deathLog,
        };
        onDeath(stats, player.toCharacterData());
        return;
    }
    
    if (!isOnlineMode) {
        setEnemies(updatedEnemies.map(e => {
            if (e.isDead && !e.lootDropped) {
                e.dropLoot(player).forEach(addDroppedItem);
                const oldLevel = player.level;
                player.gainXP(e.xpValue, addFloatingText, e.level);
                if (player.level > oldLevel) playSound('level_up');
                player.gainGold(e.goldValue, addFloatingText);
                player.kills++;
            }
            return e;
        }).filter(e => !e.isDead));
    }

    setProjectiles(prev => prev.filter(p => !p.isExpired()));
    setFloatingTexts(prev => prev.filter(ft => !ft.isExpired()));
    setVisualEffects(prev => prev.filter(ve => !ve.isExpired()));
    setGroundEffects(prev => prev.filter(ge => !ge.isExpired()));
    
    const canvas = canvasRef.current;
    if (canvas) {
        const targetX = player.position.x - canvas.width / 2;
        const targetY = player.position.y - canvas.height / 2;
        setCamera(prev => ({
            x: prev.x + (targetX - prev.x) * 0.1,
            y: prev.y + (targetY - prev.y) * 0.1,
        }));
    }

  }, [player, enemies, projectiles, floatingTexts, visualEffects, groundEffects, droppedItems, npcs, camera, waypoints, otherPlayers]);

  useGameLoop(gameLoop);
  
  // Invite Handlers
  const handleAcceptInvite = (invite: {type: 'party'|'trade', fromId: string}) => {
      if (invite.type === 'party') {
          socketService.acceptPartyInvite(invite.fromId);
      } else {
          socketService.acceptTradeRequest(invite.fromId);
      }
      setPendingInvites(prev => prev.filter(i => i.fromId !== invite.fromId));
  };
  
  const handleDeclineInvite = (fromId: string) => {
       setPendingInvites(prev => prev.filter(i => i.fromId !== fromId));
  };

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !player) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1;
    const gridStep = 50;
    const startX = Math.max(0, Math.floor(camera.x / gridStep) * gridStep);
    const endX = Math.min(GAME_CONFIG.WORLD_WIDTH, camera.x + canvas.width);
    const startY = Math.max(0, Math.floor(camera.y / gridStep) * gridStep);
    const endY = Math.min(GAME_CONFIG.WORLD_HEIGHT, camera.y + canvas.height);

    for(let x = startX; x <= endX; x += gridStep) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GAME_CONFIG.WORLD_HEIGHT); ctx.stroke();
    }
    for(let y = startY; y <= endY; y += gridStep) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_CONFIG.WORLD_WIDTH, y); ctx.stroke();
    }

    if (isVisible({ x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 }, GAME_CONFIG.SAFE_ZONE_RADIUS)) {
        ctx.beginPath();
        ctx.arc(GAME_CONFIG.WORLD_WIDTH / 2, GAME_CONFIG.WORLD_HEIGHT / 2, GAME_CONFIG.SAFE_ZONE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 150, 0.05)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 255, 150, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    BOSS_ZONES.forEach(zone => {
        if (isVisible({x: zone.x, y: zone.y}, BOSS_CONFIG.ZONE_RADIUS)) {
             ctx.beginPath();
             ctx.arc(zone.x, zone.y, BOSS_CONFIG.ZONE_RADIUS, 0, Math.PI * 2);
             ctx.fillStyle = 'rgba(147, 51, 234, 0.05)';
             ctx.fill();
             ctx.strokeStyle = 'rgba(147, 51, 234, 0.3)';
             ctx.lineWidth = 4;
             ctx.setLineDash([20, 10]);
             ctx.stroke();
             ctx.setLineDash([]);
        }
    });
    
    groundEffects.forEach(ge => { if(isVisible(ge.position, ge.radius)) ge.draw(ctx); });
    waypoints.forEach(wp => { if(isVisible(wp.data.position, wp.radius)) wp.draw(ctx, player.discoveredWaypoints.includes(wp.data.id)); });
    droppedItems.forEach(di => { if(isVisible(di.position, 20)) di.draw(ctx); });
    npcs.forEach(npc => { if(isVisible(npc.position, npc.radius)) npc.draw(ctx); });
    enemies.forEach(e => { if(isVisible(e.position, e.radius)) e.draw(ctx); });

    // Draw Other Players
    otherPlayers.forEach(op => {
        if (!isVisible(op.position, GAME_CONFIG.PLAYER_RADIUS)) return;
        ctx.save();
        ctx.translate(op.position.x, op.position.y);
        ctx.beginPath();
        ctx.ellipse(0, GAME_CONFIG.PLAYER_RADIUS, GAME_CONFIG.PLAYER_RADIUS, GAME_CONFIG.PLAYER_RADIUS / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, GAME_CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
        const colors = ['#ef4444', '#3b82f6', '#22c55e']; 
        ctx.fillStyle = colors[op.characterData.characterClass] || '#ffffff';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px sans-serif';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.fillText(op.characterData.name, 0, GAME_CONFIG.PLAYER_RADIUS + 22);
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`Lv. ${op.characterData.level}`, 0, -GAME_CONFIG.PLAYER_RADIUS - 8);
        ctx.restore();
    });
    
    player.draw(ctx);
    projectiles.forEach(p => { if(isVisible(p.position, p.radius)) p.draw(ctx); });
    visualEffects.forEach(ve => { if(isVisible(ve.position, 100)) ve.draw(ctx); });
    floatingTexts.forEach(ft => { if(isVisible(ft.position, 50)) ft.draw(ctx); });

    ctx.restore();
  }, [player, enemies, projectiles, floatingTexts, visualEffects, groundEffects, droppedItems, npcs, camera, waypoints, otherPlayers]);

  const toggleInventory = useCallback(() => {
    if (interactingNPC || interactingWaypoint || activeTradeSession) return;
    setInventoryOpen(prev => !prev);
  }, [interactingNPC, interactingWaypoint, activeTradeSession]);

  const handleUseSkill = (index: number) => {
      if(!player) return;
      playSound('attack');
      player.useSkill(index, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode });
  };

  const handleUseSkillRef = useRef(handleUseSkill);
  useEffect(() => { handleUseSkillRef.current = handleUseSkill; });

  const nearbyNPC = player ? (npcs.find(npc => getDistance(player.position, npc.position) < npc.interactionRadius) || null) : null;
  const nearbyWaypoint = player ? (waypoints.find(wp => getDistance(player.position, wp.data.position) < wp.interactionRadius && player.discoveredWaypoints.includes(wp.data.id)) || null) : null;
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (key === 'escape') {
            setInventoryOpen(false);
            setPartyUIOpen(false);
            setInteractingNPC(null);
            setInteractingWaypoint(null);
            if (activeTradeSession) socketService.cancelTrade();
            return;
        }
        
        if (key === 'i' || key === 'c') toggleInventory();
        
        if (key === 'e') {
            if (nearbyNPC) {
                setInteractingNPC(nearbyNPC);
                setInventoryOpen(false);
                setInteractingWaypoint(null);
            } else if (nearbyWaypoint) {
                setInteractingWaypoint(nearbyWaypoint);
                setInventoryOpen(false);
                setInteractingNPC(null);
            }
        }
        if (['1', '2', '3', '4', '5'].includes(key)) handleUseSkillRef.current(parseInt(key) - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleInventory, nearbyNPC, nearbyWaypoint, activeTradeSession]);
  
  // ... inventory handlers ...
  const handleItemEquip = (itemIndex: number) => {
      if (player) {
          player.equipItem(itemIndex);
          const dropped = player.flushOverflowItems();
          dropped.forEach(item => addDroppedItem(new DroppedItem(player.position, item)));
          const updatedPlayer = new Player(player.toCharacterData());
          setPlayer(updatedPlayer);
          updateServerCharacter(updatedPlayer);
      }
  };
  const handleItemUnequip = (itemSlot: ItemSlot) => {
      if (player) {
          player.unequipItem(itemSlot);
          const dropped = player.flushOverflowItems();
          dropped.forEach(item => addDroppedItem(new DroppedItem(player.position, item)));
          const updatedPlayer = new Player(player.toCharacterData());
          setPlayer(updatedPlayer);
          updateServerCharacter(updatedPlayer);
      }
  };
  
  const handleToggleItemLock = (itemIndex: number) => {
      if (player) {
          player.toggleItemLock(itemIndex);
          const updatedPlayer = new Player(player.toCharacterData());
          setPlayer(updatedPlayer);
          updateServerCharacter(updatedPlayer);
      }
  }

  const handleInventoryMove = (fromIndex: number, toIndex: number) => {
    if (player) {
        player.moveItem(fromIndex, toIndex);
        const updatedPlayer = new Player(player.toCharacterData());
        setPlayer(updatedPlayer);
        updateServerCharacter(updatedPlayer);
    }
  };
  
  const handleCraft = (recipe: Recipe) => {
      if (player?.craftItem(recipe)) {
          const updatedPlayer = new Player(player.toCharacterData());
          setPlayer(updatedPlayer);
          updateServerCharacter(updatedPlayer);
      }
  };
  
  const handleSell = (_item: Item, inventoryIndex: number, sellFullStack: boolean) => {
       if (player?.sellItem(inventoryIndex, sellFullStack)) {
           const updatedPlayer = new Player(player.toCharacterData());
           setPlayer(updatedPlayer);
           updateServerCharacter(updatedPlayer);
       }
  };
  
  const handleSellByRarity = (rarity: ItemRarity) => {
      if (player) {
          player.sellUnlockedItemsByRarity(rarity);
          const updatedPlayer = new Player(player.toCharacterData());
          setPlayer(updatedPlayer);
          updateServerCharacter(updatedPlayer);
      }
  }
  
  const handleBuyItem = (item: Item, cost: number) => {
      if (player?.buyItem(item, cost)) {
          const updatedPlayer = new Player(player.toCharacterData());
          setPlayer(updatedPlayer);
          updateServerCharacter(updatedPlayer);
      }
  };

  const handleFastTravel = (destination: WaypointData) => {
      if (player) {
          player.position = { ...destination.position };
          setCamera({ x: player.position.x, y: player.position.y });
          addVisualEffect(new VisualEffect(destination.position, 'teleport_in', 1000, { radius: 40, endPos: destination.position }));
          addFloatingText(new FloatingText("Fast Travelled", destination.position, '#22d3ee'));
          setInteractingWaypoint(null);
          updateServerCharacter(player); // Update position
      }
  };

  return (
    <div className="w-screen h-screen relative">
      <canvas ref={canvasRef} className="w-full h-full" />
      <HUD 
        player={player} 
        enemies={enemies} 
        npcs={npcs}
        waypoints={waypoints}
        nearbyNPC={!interactingNPC && !interactingWaypoint ? nearbyNPC : null}
        onUseSkill={handleUseSkill}
        toggleInventory={toggleInventory}
        isInventoryOpen={isInventoryOpen}
        party={party}
        onOpenParty={() => setPartyUIOpen(true)}
        onRequestTrade={(targetId) => socketService.requestTrade(targetId)}
        otherPlayers={otherPlayers} // Pass other players to HUD
      />
      
      {/* Invites */}
      {pendingInvites.length > 0 && (
           <div className="absolute top-20 center-x flex flex-col space-y-2 items-center z-50 w-full pointer-events-none">
                {pendingInvites.map((invite, i) => (
                    <div key={i} className="bg-gray-900/90 border border-teal-500 p-4 rounded-lg shadow-xl pointer-events-auto flex items-center space-x-4">
                        <div className="text-white">
                            <span className="font-bold text-teal-400">{invite.fromName}</span> invited you to {invite.type === 'party' ? 'a party' : 'trade'}.
                        </div>
                        <button onClick={() => handleAcceptInvite(invite)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded font-bold text-sm">Accept</button>
                        <button onClick={() => handleDeclineInvite(invite.fromId)} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded font-bold text-sm">Decline</button>
                    </div>
                ))}
           </div>
      )}

      {!interactingNPC && !interactingWaypoint && nearbyWaypoint && (
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-24 bg-cyan-900/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-cyan-500">
            <p className="font-bold text-lg text-cyan-100">Press [E] to Fast Travel ({nearbyWaypoint.data.name})</p>
        </div>
      )}
      
      {isInventoryOpen && player && (
        <Inventory 
            characterData={player.toCharacterData()}
            onItemEquip={handleItemEquip}
            onItemUnequip={handleItemUnequip}
            toggleInventory={toggleInventory}
            onInventoryMove={handleInventoryMove}
            onToggleLock={handleToggleItemLock}
        />
      )}
      
      {isPartyUIOpen && player && (
          <PartyUI 
            party={party}
            onClose={() => setPartyUIOpen(false)}
            onInvite={(name) => socketService.inviteToParty(name)}
            onLeave={() => socketService.leaveParty()}
          />
      )}
      
      {activeTradeSession && player && (
          <TradeUI 
             session={activeTradeSession}
             currentUserId={player.id as string}
             inventory={player.inventory}
             onUpdateOffer={(gold, items) => socketService.updateTradeOffer(gold, items)}
             onLockOffer={(locked) => socketService.lockTrade(locked)}
             onCancel={() => socketService.cancelTrade()}
          />
      )}

      {interactingNPC && player && (
        <NPCInteraction 
            npc={interactingNPC}
            characterData={player.toCharacterData()}
            recipes={CRAFTING_RECIPES}
            onClose={() => setInteractingNPC(null)}
            onCraft={handleCraft}
            onSell={handleSell}
            onBuy={handleBuyItem}
            onSellByRarity={handleSellByRarity}
        />
      )}
      {interactingWaypoint && player && (
          <FastTravelUI 
            discoveredWaypointIds={player.discoveredWaypoints}
            currentWaypointId={interactingWaypoint.data.id}
            onTravel={handleFastTravel}
            onClose={() => setInteractingWaypoint(null)}
          />
      )}
      <button 
        onClick={() => onReturnToSelect(player!.toCharacterData())}
        className="absolute top-4 right-[220px] bg-gray-800/80 p-2 rounded-lg pointer-events-auto hover:bg-gray-700/80 text-white"
      >
        Return to Menu
      </button>
      <div id="tooltip-root" className="absolute" />
    </div>
  );
};

export default Game;
