
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CharacterData, GameStats, Item, ItemSlot, Recipe, Vector2D, WaypointData, ItemRarity, Party, TradeSession, Difficulty, NPCType } from '../game/types';
import { Player } from '../game/entities/Player';
import { Enemy } from '../game/entities/Enemy';
import { Projectile } from '../game/entities/Projectile';
import { FloatingText } from '../game/entities/FloatingText';
import { VisualEffect } from '../game/entities/VisualEffect';
import { GroundEffect } from '../game/entities/GroundEffect';
import { DroppedItem } from '../game/entities/DroppedItem';
import { NPC } from '../game/entities/NPC';
import { Waypoint } from '../game/entities/Waypoint';
import useGameLoop from '../hooks/useGameLoop';
import useKeyboardInput from '../hooks/useKeyboardInput';
import { GAME_CONFIG, WAYPOINTS, BOSS_ZONES, BOSS_CONFIG, WORLD_IDS, WORLD_CONFIGS, ENEMY_TYPES, GROVE_ENEMIES } from '../game/constants';
import { CRAFTING_RECIPES } from '../game/items';
import { getDistance } from '../game/math';
import HUD from './HUD';
import Inventory from './Inventory';
import NPCInteraction from './NPCInteraction';
import FastTravelUI from './FastTravelUI';
import PartyUI from './PartyUI';
import TradeUI from './TradeUI';
import EnemyTooltip from './EnemyTooltip';
import VirtualJoystick from './VirtualJoystick';
import { socketService } from '../services/socketService';
import { storageService } from '../services/storage';

interface GameProps {
  characterData: CharacterData;
  onDeath: (stats: GameStats, finalCharacterData: CharacterData) => void;
  onReturnToSelect: (finalCharacterData: CharacterData) => void;
  isOnlineMode: boolean;
  isDevMode: boolean;
  userId: string;
  difficulty: Difficulty;
}

const Game: React.FC<GameProps> = ({ characterData, onDeath, onReturnToSelect, isOnlineMode, userId, difficulty, isDevMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameTimeRef = useRef(0);
  const localSpawnTimerRef = useRef(0);
  const localBossCooldownRef = useRef(0);
  
  const [player, setPlayer] = useState<Player | null>(null);
  const playerRef = useRef<Player | null>(null);

  // Sync playerRef with state
  useEffect(() => {
      playerRef.current = player;
  }, [player]);

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
  
  // Tooltip State
  const [hoveredEnemy, setHoveredEnemy] = useState<Enemy | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{x: number, y: number}>({ x: 0, y: 0 });

  // Multiplayer State
  const [party, setParty] = useState<Party | null>(null);
  const [isPartyUIOpen, setPartyUIOpen] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<{type: 'party'|'trade', fromId: string, fromName: string}[]>([]);
  const [activeTradeSession, setActiveTradeSession] = useState<TradeSession | null>(null);

  // Mobile Controls
  const joystickVectorRef = useRef<Vector2D>({ x: 0, y: 0 });

  const pressedKeys = useKeyboardInput();
  const playerIdRef = useRef<string>('');
  const prevHealthRef = useRef<number>(0);

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

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        
        if (type === 'attack') {
             osc.type = 'triangle';
             osc.frequency.setValueAtTime(150, t);
             osc.frequency.exponentialRampToValueAtTime(0.001, t + 0.1);
             gain.gain.setValueAtTime(0.1, t);
             osc.start(); osc.stop(t + 0.1);
        } else if (type === 'level_up') {
             osc.type = 'sine';
             osc.frequency.setValueAtTime(440, t);
             gain.gain.setValueAtTime(0.1, t);
             osc.start(); osc.stop(t + 0.5);
        }
    } catch (e) {}
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

  const generateEnemyPack = useCallback((worldId: string): Enemy[] => {
        let attempts = 0;
        let packCenter = { x: 0, y: 0 };
        let validPosition = false;

        while(!validPosition && attempts < 15) {
            attempts++;
            const randX = Math.random() * (GAME_CONFIG.WORLD_WIDTH - 200) + 100;
            const randY = Math.random() * (GAME_CONFIG.WORLD_HEIGHT - 200) + 100;
            const testPos = { x: randX, y: randY };
            if (getDistance(testPos, {x: GAME_CONFIG.WORLD_WIDTH/2, y: GAME_CONFIG.WORLD_HEIGHT/2}) < GAME_CONFIG.SAFE_ZONE_RADIUS + 100) continue;
            let inBossZone = false;
            for (const zone of BOSS_ZONES) {
                if (getDistance(testPos, {x: zone.x, y: zone.y}) < BOSS_CONFIG.ZONE_RADIUS) {
                    inBossZone = true;
                    break;
                }
            }
            if (!inBossZone) {
                packCenter = testPos;
                validPosition = true;
            }
        }
        if (!validPosition) return [];
        let level = 1;
        if (worldId === WORLD_IDS.WORLD_2) {
            level = GAME_CONFIG.MAX_LEVEL;
        } else {
            const safeZone = GAME_CONFIG.SAFE_ZONE_RADIUS;
            const maxDist = Math.max(GAME_CONFIG.WORLD_WIDTH/2, GAME_CONFIG.WORLD_HEIGHT/2) - 100;
            const distFromCenter = getDistance(packCenter, { x: GAME_CONFIG.WORLD_WIDTH/2, y: GAME_CONFIG.WORLD_HEIGHT/2 });
            const progress = Math.max(0, (distFromCenter - safeZone) / (maxDist - safeZone));
            level = Math.floor(1 + progress * (GAME_CONFIG.MAX_LEVEL - 1));
            level = Math.min(GAME_CONFIG.MAX_LEVEL, Math.max(1, level));
        }
        let typeId: string;
        const packSize = Math.floor(Math.random() * 3) + 3; 
        if (worldId === WORLD_IDS.WORLD_2) {
            const typeKeys = Object.keys(GROVE_ENEMIES);
            typeId = typeKeys[Math.floor(Math.random() * typeKeys.length)];
        } else {
            const typeKeys = Object.keys(ENEMY_TYPES);
            typeId = typeKeys[Math.floor(Math.random() * typeKeys.length)];
        }
        const pack: Enemy[] = [];
        for(let i=0; i<packSize; i++) {
            const offset = { x: (Math.random()-0.5)*120, y: (Math.random()-0.5)*120 };
            const pos = { x: packCenter.x + offset.x, y: packCenter.y + offset.y };
            pack.push(new Enemy(pos, level, undefined, `local_${Date.now()}_${Math.random()}`, typeId));
        }
        return pack;
  }, []);

  const spawnLocalEnemies = useCallback((worldId: string) => {
      setEnemies(prev => {
          if (prev.length >= GAME_CONFIG.MAX_ENEMIES) return prev; 
          const needed = GAME_CONFIG.MAX_ENEMIES - prev.length;
          const packsNeeded = Math.ceil(needed / 4); 
          const newEnemies: Enemy[] = [];
          const loops = Math.min(packsNeeded, 20); 
          for(let i=0; i<loops; i++) {
              const newPack = generateEnemyPack(worldId);
              newEnemies.push(...newPack);
          }
          return [...prev, ...newEnemies];
      });
  }, [generateEnemyPack]);

  const createLocalBoss = (worldId: string, existingEnemies: Enemy[]): Enemy | null => {
      const activeBosses = existingEnemies.filter(e => e.isBoss);
      if (activeBosses.length >= BOSS_CONFIG.MAX_ACTIVE_BOSSES) return null;
      const occupiedZones = activeBosses.map(e => e.bossZoneId);
      const availableZones = BOSS_ZONES.filter(z => !occupiedZones.includes(z.id));
      if (availableZones.length === 0) return null;
      const zone = availableZones[Math.floor(Math.random() * availableZones.length)];
      let typeId = zone.id; 
      if (worldId === WORLD_IDS.WORLD_2) typeId = `grove_${zone.id}`; 
      return new Enemy({ x: zone.x, y: zone.y }, GAME_CONFIG.MAX_LEVEL, zone.id, `boss_${Date.now()}`, typeId);
  };

  const spawnLocalBoss = useCallback((worldId: string) => {
      setEnemies(prev => {
          if (Date.now() < localBossCooldownRef.current) return prev;
          const boss = createLocalBoss(worldId, prev);
          if (boss) {
              localBossCooldownRef.current = Date.now() + BOSS_CONFIG.SPAWN_COOLDOWN;
              return [...prev, boss];
          }
          return prev;
      });
  }, []);

  const initializeGame = useCallback((updatedCharData: CharacterData) => {
      const newPlayer = new Player(updatedCharData);
      newPlayer.setInvulnerable(3000);
      if (isOnlineMode && difficulty === Difficulty.Insane) newPlayer.applyInsaneModeNerfs();
      setPlayer(newPlayer);
      prevHealthRef.current = newPlayer.health;
      setCamera({ x: newPlayer.position.x, y: newPlayer.position.y });
      const cx = GAME_CONFIG.WORLD_WIDTH / 2;
      const cy = GAME_CONFIG.WORLD_HEIGHT / 2;
      const dist = 150;
      setNpcs([
        new NPC({ x: cx + dist, y: cy }, 'Thomas', NPCType.Crafter),
        new NPC({ x: cx - dist, y: cy }, 'Trevor', NPCType.Vendor),
        new NPC({ x: cx, y: cy - dist }, 'Jackson', NPCType.Seller),
        new NPC({ x: cx, y: cy + dist }, 'Rory', NPCType.WorldTraveler),
        new NPC({ x: cx - dist, y: cy + dist }, 'Vault Master', NPCType.Banker),
      ]);
      setWaypoints(WAYPOINTS.map(data => new Waypoint(data)));
      if (isOnlineMode) {
          socketService.disconnect(); 
          socketService.connect((id) => {
              playerIdRef.current = id;
              socketService.joinGame(newPlayer.toCharacterData(), difficulty, isDevMode);
          });
          socketService.onJoinError((message) => {
              alert(message);
              onReturnToSelect(updatedCharData);
          });
          socketService.onGameState((payload) => {
            const others: any[] = [];
            Object.entries(payload.players).forEach(([id, data]) => {
                if (id !== playerIdRef.current) others.push(data);
                else {
                    if (playerRef.current) {
                        const serverPos = data.position;
                        const localPos = playerRef.current.position;
                        if (getDistance(localPos, serverPos) > 200) playerRef.current.position = { ...serverPos };
                    }
                }
            });
            setOtherPlayers(others);
            if (payload.enemies) {
                setEnemies(prevEnemies => {
                    const newEnemyList = [...prevEnemies];
                    const serverIds = new Set(payload.enemies.map(e => e.id));
                    payload.enemies.forEach(serverEnemy => {
                        const existing = newEnemyList.find(e => e.id === serverEnemy.id);
                        if (existing) existing.sync(serverEnemy);
                        else {
                            const newEnemy = new Enemy(serverEnemy.position, serverEnemy.level, serverEnemy.bossZoneId, serverEnemy.id);
                            newEnemy.sync(serverEnemy);
                            newEnemyList.push(newEnemy);
                        }
                    });
                    return newEnemyList.filter(e => serverIds.has(e.id as string));
                });
            }
        });
      } else {
          setEnemies([]); 
          setOtherPlayers([]);
          localBossCooldownRef.current = 0; 
          localSpawnTimerRef.current = 0;
          const currentWorldId = newPlayer.currentWorldId;
          const initialEnemies: Enemy[] = [];
          let attempts = 0;
          while (initialEnemies.length < 500 && attempts < 200) {
              attempts++;
              const pack = generateEnemyPack(currentWorldId);
              initialEnemies.push(...pack);
          }
          const boss = createLocalBoss(currentWorldId, initialEnemies);
          if (boss) {
              initialEnemies.push(boss);
              localBossCooldownRef.current = Date.now() + BOSS_CONFIG.SPAWN_COOLDOWN;
          }
          setEnemies(initialEnemies);
      }
  }, [difficulty, isDevMode, isOnlineMode, onReturnToSelect, generateEnemyPack]);

  useEffect(() => {
      initializeGame(characterData);
      if (isOnlineMode) {
           socketService.onLootDropped((drops) => drops.forEach(drop => addDroppedItem(new DroppedItem(drop.position, drop.item))));
           socketService.onEnemyKilled((data) => {
            setPlayer(prev => {
                if (!prev) return null;
                const updatedPlayer = new Player(prev.toCharacterData());
                if (difficulty === Difficulty.Insane) updatedPlayer.applyInsaneModeNerfs();
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
        socketService.onPartyUpdate((p) => setParty(p));
        socketService.onInviteReceived((invite) => setPendingInvites(prev => [...prev, { type: invite.type, fromId: invite.fromId, fromName: invite.fromName }]));
        socketService.onTradeUpdate((session) => setActiveTradeSession(session));
        socketService.onTradeCompleted((success) => {
            if (success) addFloatingText(new FloatingText("Trade Successful!", playerRef.current!.position, '#4ade80', 24));
            else addFloatingText(new FloatingText("Trade Failed", playerRef.current!.position, '#ef4444', 24));
            setActiveTradeSession(null);
        });
      }
      return () => { if (isOnlineMode) { socketService.disconnect(); socketService.offGameState(); } };
  }, []); 

  const gameLoop = useCallback(() => {
    gameTimeRef.current++;
    if (!player || player.isDead) return;
    if (interactingNPC) { if (getDistance(player.position, interactingNPC.position) > 100) setInteractingNPC(null); }
    if (!isOnlineMode) {
        localSpawnTimerRef.current++;
        if (localSpawnTimerRef.current > 30) { 
             spawnLocalEnemies(player.currentWorldId);
             spawnLocalBoss(player.currentWorldId);
             localSpawnTimerRef.current = 0;
        }
    }
    if (isOnlineMode) {
        socketService.sendInput(Array.from(pressedKeys));
        if (Math.abs(player.health - prevHealthRef.current) > 1) {
            updateServerCharacter(player);
            prevHealthRef.current = player.health;
        }
    }
    const playerDistFromCenter = getDistance(player.position, {x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2});
    player.isInSafeZone = playerDistFromCenter <= GAME_CONFIG.SAFE_ZONE_RADIUS;
    const gameContext = { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode };
    player.update(pressedKeys, gameContext, joystickVectorRef.current);
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
    updatedEnemies.forEach(e => e.update(gameContext));
    projectiles.forEach(p => p.update());
    floatingTexts.forEach(ft => ft.update());
    visualEffects.forEach(ve => ve.update());
    groundEffects.forEach(ge => ge.update(updatedEnemies, gameContext));
    droppedItems.forEach(di => di.update(player));
    projectiles.forEach(p => {
        if (p.ownerId === player.id || !p.isHostile) { 
            for (const enemy of updatedEnemies) {
                if (enemy.isDead) continue;
                if (getDistance(p.position, enemy.position) < p.radius + enemy.radius) {
                    if (isOnlineMode) {
                        const ft = new FloatingText(Math.round(p.damage).toString(), { x: enemy.position.x, y: enemy.position.y - enemy.radius }, '#fff');
                        addFloatingText(ft);
                        playSound('hit');
                        socketService.damageEnemy(enemy.id as string, p.damage);
                    } else p.onHit(enemy, gameContext);
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
    if (!isOnlineMode) {
        const frameDrops: DroppedItem[] = [];
        updatedEnemies.forEach(enemy => {
            if (enemy.health <= 0) {
                if (!enemy.isDead) enemy.isDead = true;
                if (!enemy.lootDropped) { const drops = enemy.dropLoot(player); if (drops.length > 0) frameDrops.push(...drops); }
                if (!enemy.xpGiven) {
                    enemy.xpGiven = true;
                    player.gainXP(enemy.xpValue, addFloatingText, enemy.level);
                    player.gainGold(enemy.goldValue, addFloatingText);
                    player.kills++;
                    playSound('level_up'); 
                }
            }
        });
        const aliveEnemies = updatedEnemies.filter(e => !e.isDead);
        if (aliveEnemies.length !== enemies.length) setEnemies(aliveEnemies);
        const remainingItems: DroppedItem[] = [];
        droppedItems.forEach(di => {
            if(getDistance(di.position, player.position) < player.radius) {
                if (player.pickupItem(di.item)) { addFloatingText(new FloatingText(`+ ${di.item.name}`, player.position, '#ffd700')); updateServerCharacter(player); }
                else { addFloatingText(new FloatingText(`Inventory Full!`, player.position, '#ff4d4d')); remainingItems.push(di); }
            } else remainingItems.push(di);
        });
        if (frameDrops.length > 0 || remainingItems.length !== droppedItems.length) setDroppedItems([...remainingItems, ...frameDrops]);
    } else {
        const remainingItems: DroppedItem[] = [];
        droppedItems.forEach(di => {
            if(getDistance(di.position, player.position) < player.radius) {
                if (player.pickupItem(di.item)) { addFloatingText(new FloatingText(`+ ${di.item.name}`, player.position, '#ffd700')); updateServerCharacter(player); }
                else { addFloatingText(new FloatingText(`Inventory Full!`, player.position, '#ff4d4d')); remainingItems.push(di); }
            } else remainingItems.push(di);
        });
        if (remainingItems.length !== droppedItems.length) setDroppedItems(remainingItems);
    }
    if (player.health <= 0) {
        onDeath({
            killerName: player.lastDamagedBy || 'themselves',
            level: player.level,
            kills: player.kills,
            gold: player.gold,
            totalDamageTaken: player.totalDamageTaken,
            deathLog: player.deathLog,
        }, player.toCharacterData());
        return;
    }
    setProjectiles(prev => prev.filter(p => !p.isExpired()));
    setFloatingTexts(prev => prev.filter(ft => !ft.isExpired()));
    setVisualEffects(prev => prev.filter(ve => !ve.isExpired()));
    setGroundEffects(prev => prev.filter(ge => !ge.isExpired()));
    const canvas = canvasRef.current;
    if (canvas) {
        const targetX = player.position.x - canvas.width / 2;
        const targetY = player.position.y - canvas.height / 2;
        setCamera(prev => ({ x: prev.x + (targetX - prev.x) * 0.1, y: prev.y + (targetY - prev.y) * 0.1 }));
    }
  }, [player, enemies, projectiles, floatingTexts, visualEffects, groundEffects, droppedItems, npcs, camera, waypoints, otherPlayers, interactingNPC, spawnLocalEnemies, spawnLocalBoss]);

  useGameLoop(gameLoop);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    if (interactingNPC) { if (hoveredEnemy) setHoveredEnemy(null); return; }
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = mouseX + camera.x;
    const worldY = mouseY + camera.y;
    const target = enemies.find(enemy => { if (enemy.isDead) return false; return getDistance({ x: worldX, y: worldY }, enemy.position) <= enemy.radius + 15; });
    setHoveredEnemy(target || null);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleTravelToWorld = (targetWorldId: string) => {
      if (!player) return;
      const newCharData = player.toCharacterData();
      newCharData.currentWorldId = targetWorldId;
      newCharData.position = { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 };
      storageService.saveCharacter(userId, newCharData);
      setInteractingNPC(null); setEnemies([]); setDroppedItems([]);
      initializeGame(newCharData);
  };

  const savePlayerState = useCallback((updatedPlayer: Player) => { setPlayer(updatedPlayer); updateServerCharacter(updatedPlayer); storageService.saveCharacter(userId, updatedPlayer.toCharacterData()); }, [userId, updateServerCharacter]);
  const toggleInventory = useCallback(() => { if (interactingNPC || interactingWaypoint || activeTradeSession) return; setInventoryOpen(prev => !prev); }, [interactingNPC, interactingWaypoint, activeTradeSession]);
  const handleUseSkill = (index: number) => { if(player) player.useSkill(index, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode }); };
  const handleUseSkillRef = useRef(handleUseSkill);
  useEffect(() => { handleUseSkillRef.current = handleUseSkill; });
  const handleItemEquip = (i: number) => { if(player) { player.equipItem(i); const dropped = player.flushOverflowItems(); dropped.forEach(item => addDroppedItem(new DroppedItem(player.position, item))); const u = new Player(player.toCharacterData()); if(difficulty === Difficulty.Insane) u.applyInsaneModeNerfs(); savePlayerState(u); }};
  const handleItemUnequip = (s: ItemSlot) => { if(player) { player.unequipItem(s); const dropped = player.flushOverflowItems(); dropped.forEach(item => addDroppedItem(new DroppedItem(player.position, item))); const u = new Player(player.toCharacterData()); if(difficulty === Difficulty.Insane) u.applyInsaneModeNerfs(); savePlayerState(u); }};
  const handleToggleItemLock = (i: number) => { if(player) { player.toggleItemLock(i); const u = new Player(player.toCharacterData()); if(difficulty === Difficulty.Insane) u.applyInsaneModeNerfs(); savePlayerState(u); }};
  const handleInventoryMove = (f: number, t: number) => { if(player) { player.moveItem(f, t); const u = new Player(player.toCharacterData()); if(difficulty === Difficulty.Insane) u.applyInsaneModeNerfs(); savePlayerState(u); }};
  const handleCraft = (r: Recipe) => { if(player?.craftItem(r)) { const u = new Player(player.toCharacterData()); if(difficulty === Difficulty.Insane) u.applyInsaneModeNerfs(); savePlayerState(u); }};
  const handleSell = (_: Item, idx: number, s: boolean) => { if(player?.sellItem(idx, s)) { const u = new Player(player.toCharacterData()); if(difficulty === Difficulty.Insane) u.applyInsaneModeNerfs(); savePlayerState(u); }};
  const handleSellByRarity = (r: ItemRarity) => { if(player) { player.sellUnlockedItemsByRarity(r); const u = new Player(player.toCharacterData()); if(difficulty === Difficulty.Insane) u.applyInsaneModeNerfs(); savePlayerState(u); }};
  const handleBuyItem = (i: Item, c: number) => { if(player?.buyItem(i, c)) { const u = new Player(player.toCharacterData()); if(difficulty === Difficulty.Insane) u.applyInsaneModeNerfs(); savePlayerState(u); }};
  const handleDeposit = (i: number) => { if(!player) return; const item = player.inventory[i]; if(!item) return; const empty = player.bank.findIndex(s=>s===null); if(empty !== -1) { player.inventory[i] = null; player.bank[empty] = item; const u = new Player(player.toCharacterData()); if(difficulty === Difficulty.Insane) u.applyInsaneModeNerfs(); savePlayerState(u); } else addFloatingText(new FloatingText("Bank Full!", player.position, '#ef4444')); };
  const handleWithdraw = (i: number) => { if(!player) return; const item = player.bank[i]; if(!item) return; const empty = player.inventory.findIndex(s=>s===null); if(empty !== -1) { player.bank[i] = null; player.inventory[empty] = item; const u = new Player(player.toCharacterData()); if(difficulty === Difficulty.Insane) u.applyInsaneModeNerfs(); savePlayerState(u); } else addFloatingText(new FloatingText("Inventory Full!", player.position, '#ef4444')); };
  const handleDepositGold = (a: number) => { if(!player) return; if(a<=0) return; if(player.gold>=a) { player.gold -= a; player.bankGold += a; const u = new Player(player.toCharacterData()); if(difficulty === Difficulty.Insane) u.applyInsaneModeNerfs(); savePlayerState(u); addFloatingText(new FloatingText(`- ${a} G`, player.position, '#facc15')); } else addFloatingText(new FloatingText("Not enough gold!", player.position, '#ef4444')); };
  const handleWithdrawGold = (a: number) => { if(!player) return; if(a<=0) return; if(player.bankGold>=a) { player.bankGold -= a; player.gold += a; const u = new Player(player.toCharacterData()); if(difficulty === Difficulty.Insane) u.applyInsaneModeNerfs(); savePlayerState(u); addFloatingText(new FloatingText(`+ ${a} G`, player.position, '#facc15')); } else addFloatingText(new FloatingText("Not enough in bank!", player.position, '#ef4444')); };
  const handleFastTravel = (d: WaypointData) => { if(player) { player.position = {...d.position}; setCamera({x: player.position.x, y: player.position.y}); addVisualEffect(new VisualEffect(d.position, 'teleport_in', 1000, { radius: 40, endPos: d.position })); addFloatingText(new FloatingText("Fast Travelled", d.position, '#22d3ee')); setInteractingWaypoint(null); updateServerCharacter(player); }};

  const nearbyNPC = player ? (npcs.find(npc => getDistance(player.position, npc.position) < npc.interactionRadius) || null) : null;
  const nearbyWaypoint = player ? (waypoints.find(wp => getDistance(player.position, wp.data.position) < wp.interactionRadius && player.discoveredWaypoints.includes(wp.data.id)) || null) : null;

  const handleInteraction = useCallback(() => {
    if (nearbyNPC) {
        setInteractingNPC(nearbyNPC);
        setInventoryOpen(false); setPartyUIOpen(false); setInteractingWaypoint(null); setHoveredEnemy(null);
    } else if (nearbyWaypoint) {
        setInteractingWaypoint(nearbyWaypoint);
        setInventoryOpen(false); setInteractingNPC(null);
    }
  }, [nearbyNPC, nearbyWaypoint]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (key === 'escape') { setInventoryOpen(false); setPartyUIOpen(false); setInteractingNPC(null); setInteractingWaypoint(null); if (activeTradeSession) socketService.cancelTrade(); return; }
        if (key === 'i' || key === 'c') toggleInventory();
        if (key === 'e') handleInteraction();
        if (['1', '2', '3', '4', '5'].includes(key)) handleUseSkillRef.current(parseInt(key) - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleInventory, handleInteraction, activeTradeSession]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !player) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const currentWorldConfig = WORLD_CONFIGS[player.currentWorldId] || WORLD_CONFIGS[WORLD_IDS.WORLD_1];
    ctx.fillStyle = currentWorldConfig.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    ctx.strokeStyle = currentWorldConfig.gridColor; ctx.lineWidth = 1;
    const gridStep = 50; 
    const startX = Math.max(0, Math.floor(camera.x / gridStep) * gridStep);
    const endX = Math.min(GAME_CONFIG.WORLD_WIDTH, camera.x + canvas.width);
    const startY = Math.max(0, Math.floor(camera.y / gridStep) * gridStep);
    const endY = Math.min(GAME_CONFIG.WORLD_HEIGHT, camera.y + canvas.height);
    for(let x = startX; x <= endX; x += gridStep) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GAME_CONFIG.WORLD_HEIGHT); ctx.stroke(); }
    for(let y = startY; y <= endY; y += gridStep) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_CONFIG.WORLD_WIDTH, y); ctx.stroke(); }
    if (player.currentWorldId === WORLD_IDS.WORLD_2) {
         ctx.save(); ctx.font = "bold 200px sans-serif"; ctx.fillStyle = "rgba(20, 83, 45, 0.2)"; 
         ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.translate(GAME_CONFIG.WORLD_WIDTH/2, GAME_CONFIG.WORLD_HEIGHT/2);
         ctx.fillText("THE GROVE", 0, 0); ctx.restore();
    }
    if (isVisible({ x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 }, GAME_CONFIG.SAFE_ZONE_RADIUS)) {
        ctx.beginPath(); ctx.arc(GAME_CONFIG.WORLD_WIDTH / 2, GAME_CONFIG.WORLD_HEIGHT / 2, GAME_CONFIG.SAFE_ZONE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 150, 0.05)'; ctx.fill(); ctx.strokeStyle = 'rgba(0, 255, 150, 0.2)'; ctx.lineWidth = 2; ctx.stroke();
    }
    BOSS_ZONES.forEach(zone => {
        if (isVisible({x: zone.x, y: zone.y}, BOSS_CONFIG.ZONE_RADIUS)) {
             ctx.beginPath(); ctx.arc(zone.x, zone.y, BOSS_CONFIG.ZONE_RADIUS, 0, Math.PI * 2);
             ctx.fillStyle = 'rgba(147, 51, 234, 0.05)'; ctx.fill(); ctx.strokeStyle = 'rgba(147, 51, 234, 0.3)'; ctx.lineWidth = 4; ctx.setLineDash([20, 10]); ctx.stroke(); ctx.setLineDash([]);
        }
    });
    groundEffects.forEach(ge => { if(isVisible(ge.position, ge.radius)) ge.draw(ctx); });
    waypoints.forEach(wp => { if(isVisible(wp.data.position, wp.radius)) wp.draw(ctx, player.discoveredWaypoints.includes(wp.data.id)); });
    droppedItems.forEach(di => { if(isVisible(di.position, 20)) di.draw(ctx); });
    npcs.forEach(npc => { if(isVisible(npc.position, npc.radius)) npc.draw(ctx); });
    enemies.forEach(e => { if(isVisible(e.position, e.radius)) e.draw(ctx); });
    otherPlayers.forEach(op => {
        if (!isVisible(op.position, GAME_CONFIG.PLAYER_RADIUS)) return;
        ctx.save(); ctx.translate(op.position.x, op.position.y); ctx.beginPath(); ctx.ellipse(0, GAME_CONFIG.PLAYER_RADIUS, GAME_CONFIG.PLAYER_RADIUS, GAME_CONFIG.PLAYER_RADIUS / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, GAME_CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
        const colors = ['#ef4444', '#3b82f6', '#22c55e']; ctx.fillStyle = colors[op.characterData.characterClass] || '#ffffff'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.font = 'bold 12px sans-serif'; ctx.shadowColor = 'black'; ctx.shadowBlur = 4; ctx.fillText(op.characterData.name, 0, GAME_CONFIG.PLAYER_RADIUS + 22);
        ctx.font = 'bold 10px sans-serif'; ctx.fillText(`Lv. ${op.characterData.level}`, 0, -GAME_CONFIG.PLAYER_RADIUS - 8); ctx.restore();
    });
    player.draw(ctx); projectiles.forEach(p => { if(isVisible(p.position, p.radius)) p.draw(ctx); }); visualEffects.forEach(ve => { if(isVisible(ve.position, 100)) ve.draw(ctx); }); floatingTexts.forEach(ft => { if(isVisible(ft.position, 50)) ft.draw(ctx); });
    if (isOnlineMode) {
        ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'right';
        if (difficulty === Difficulty.Hard) { ctx.fillStyle = '#fbbf24'; ctx.fillText('HARD MODE', canvas.width - 20, 30); }
        else if (difficulty === Difficulty.Insane) { ctx.fillStyle = '#ef4444'; ctx.fillText('INSANE MODE', canvas.width - 20, 30); }
    }
    ctx.restore();
  }, [player, enemies, projectiles, floatingTexts, visualEffects, groundEffects, droppedItems, npcs, camera, waypoints, otherPlayers, difficulty, isOnlineMode]);

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-gray-950">
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" onMouseMove={handleMouseMove} />
      
      <VirtualJoystick onMove={(vector) => joystickVectorRef.current = vector} />

      <HUD 
        player={player} 
        enemies={enemies} 
        npcs={npcs}
        waypoints={waypoints}
        onUseSkill={handleUseSkill}
        toggleInventory={toggleInventory}
        isInventoryOpen={isInventoryOpen}
        party={party}
        onOpenParty={() => setPartyUIOpen(true)}
        onRequestTrade={(targetId) => socketService.requestTrade(targetId)}
        otherPlayers={otherPlayers} 
      />
      
      {hoveredEnemy && !interactingNPC && (
          <EnemyTooltip enemy={hoveredEnemy} position={tooltipPos} />
      )}

      {/* Interaction Button for Mobile and Desktop Overlay */}
      {(!interactingNPC && !interactingWaypoint && (nearbyNPC || nearbyWaypoint)) && (
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[120px] md:-translate-y-[140px] z-50 pointer-events-auto flex flex-col items-center animate-bounce-subtle">
            <button
                onClick={handleInteraction}
                className="group relative flex flex-col items-center bg-gray-900/80 backdrop-blur-md border-2 border-cyan-500 rounded-2xl p-4 md:p-3 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:bg-cyan-500 hover:border-white transition-all duration-300 transform active:scale-95"
            >
                <div className="flex items-center gap-3">
                    <span className="text-3xl md:text-2xl filter drop-shadow-lg">👋</span>
                    <div className="text-left">
                        <div className="text-white font-black text-lg md:text-sm uppercase tracking-tighter leading-none">
                            Talk to {nearbyNPC ? nearbyNPC.name : nearbyWaypoint?.data.name}
                        </div>
                        <div className="text-cyan-400 font-bold text-[10px] md:text-[11px] uppercase tracking-widest mt-0.5 group-hover:text-white transition-colors">
                            <span className="hidden md:inline">Press [E] or </span>Tap to Interact
                        </div>
                    </div>
                </div>
            </button>
        </div>
      )}

      {/* Mobile-Specific Action Button (Bottom Right) */}
      {(!interactingNPC && !interactingWaypoint && (nearbyNPC || nearbyWaypoint)) && (
          <div className="absolute bottom-40 right-4 z-50 pointer-events-auto md:hidden animate-in fade-in zoom-in duration-300">
              <button
                  onClick={handleInteraction}
                  className="w-16 h-16 bg-cyan-600 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.6)] border-4 border-cyan-300 flex items-center justify-center text-3xl active:scale-90 transition-transform"
              >
                  ✋
              </button>
          </div>
      )}

      {pendingInvites.length > 0 && (
           <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col space-y-2 items-center z-50 w-auto pointer-events-none">
                {pendingInvites.map((invite, index) => (
                    <div key={index} className="bg-gray-900/95 border border-teal-500 p-4 rounded-lg shadow-xl pointer-events-auto flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
                        <div className="text-white text-center sm:text-left">
                            <span className="font-bold text-teal-400">{invite.fromName}</span> invited you to {invite.type === 'party' ? 'a party' : 'trade'}.
                        </div>
                        <div className="flex space-x-2">
                            <button 
                                onClick={() => {
                                    if (invite.type === 'party') socketService.acceptPartyInvite(invite.fromId);
                                    else socketService.acceptTradeRequest(invite.fromId);
                                    setPendingInvites(prev => prev.filter((_, idx) => idx !== index));
                                }}
                                className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-1 px-3 rounded text-sm transition-colors"
                            >
                                Accept
                            </button>
                            <button onClick={() => setPendingInvites(prev => prev.filter((_, idx) => idx !== index))} className="bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-3 rounded text-sm transition-colors">Decline</button>
                        </div>
                    </div>
                ))}
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
            bankItems={player.bank}
            onDeposit={handleDeposit}
            onWithdraw={handleWithdraw}
            onDepositGold={handleDepositGold}
            onWithdrawGold={handleWithdrawGold}
            isBankLoading={false}
            onTravelToWorld={handleTravelToWorld}
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
        className="absolute top-4 right-[220px] bg-gray-800/80 p-2 rounded-lg pointer-events-auto hover:bg-gray-700/80 text-white hidden md:block"
      >
        Return to Menu
      </button>
      <div id="tooltip-root" className="absolute" />

      <style>{`
          @keyframes bounce-subtle {
              0%, 100% { transform: translate(-50%, -120px); }
              50% { transform: translate(-50%, -130px); }
          }
          .animate-bounce-subtle {
              animation: bounce-subtle 2s infinite ease-in-out;
          }
      `}</style>
    </div>
  );
};

export default Game;
