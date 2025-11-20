
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CharacterData, GameStats, Item, ItemSlot, Recipe, Vector2D, WaypointData, ItemRarity } from '../game/types';
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
import { getDistance } from '../game/utils';
import { CRAFTING_RECIPES } from '../game/items';
import HUD from './HUD';
import Inventory from './Inventory';
import NPCInteraction from './NPCInteraction';
import FastTravelUI from './FastTravelUI';
import { socketService } from '../services/socketService';

interface GameProps {
  characterData: CharacterData;
  onDeath: (stats: GameStats, finalCharacterData: CharacterData) => void;
  onReturnToSelect: (finalCharacterData: CharacterData) => void;
  isDevMode: boolean;
  isOnlineMode: boolean;
}

const Game: React.FC<GameProps> = ({ characterData, onDeath, onReturnToSelect, isDevMode, isOnlineMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameTimeRef = useRef(0);
  const bossSpawnTimerRef = useRef(0);
  // Universal Boss Cooldown Timer
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
  
  const [isInventoryOpen, setInventoryOpen] = useState(false);
  const [interactingNPC, setInteractingNPC] = useState<NPC | null>(null);
  const [interactingWaypoint, setInteractingWaypoint] = useState<Waypoint | null>(null);

  const pressedKeys = useKeyboardInput();

  const addProjectile = useCallback((p: Projectile) => setProjectiles(prev => [...prev, p]), []);
  const addFloatingText = useCallback((ft: FloatingText) => setFloatingTexts(prev => [...prev, ft]), []);
  const addVisualEffect = useCallback((ve: VisualEffect) => setVisualEffects(prev => [...prev, ve]), []);
  const addGroundEffect = useCallback((ge: GroundEffect) => setGroundEffects(prev => [...prev, ge]), []);
  const addDroppedItem = useCallback((di: DroppedItem) => setDroppedItems(prev => [...prev, di]), []);

  // Unified Audio synthesis
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

            // Oscillator 1 (Low Sawtooth - The growl)
            const osc1 = ctx.createOscillator();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(100, t);
            osc1.frequency.linearRampToValueAtTime(30, t + 2.5);
            osc1.connect(masterGain);

            // Oscillator 2 (Square - The distortion/texture)
            const osc2 = ctx.createOscillator();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(90, t);
            osc2.frequency.linearRampToValueAtTime(20, t + 2.5);
            
            // Detune osc2 slightly for dissonance
            osc2.detune.setValueAtTime(15, t);
            osc2.connect(masterGain);

            // Lowpass Filter
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, t);
            filter.frequency.linearRampToValueAtTime(200, t + 2.5);
            
            osc1.disconnect();
            osc2.disconnect();
            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(masterGain);

            osc1.start();
            osc2.start();
            osc1.stop(t + 3);
            osc2.stop(t + 3);
        } 
        else if (type === 'attack') {
             // Soft "Swoosh" / Breath for swinging weapon or casting
             // White noise buffer
             const bufferSize = ctx.sampleRate * 0.2;
             const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
             const data = buffer.getChannelData(0);
             for (let i = 0; i < bufferSize; i++) {
                 data[i] = Math.random() * 2 - 1;
             }
             const noise = ctx.createBufferSource();
             noise.buffer = buffer;
             
             const filter = ctx.createBiquadFilter();
             filter.type = 'bandpass';
             filter.frequency.setValueAtTime(800, t);
             filter.frequency.linearRampToValueAtTime(200, t + 0.15);
             filter.Q.value = 1;

             const gain = ctx.createGain();
             gain.gain.setValueAtTime(0.1, t);
             gain.gain.linearRampToValueAtTime(0.001, t + 0.15);

             noise.connect(filter);
             filter.connect(gain);
             gain.connect(masterGain);
             noise.start();
        } 
        else if (type === 'damage') {
             // Taking Damage: Soft "Thud" (Player hurt)
             const osc = ctx.createOscillator();
             osc.type = 'sine'; // Sine is softer than square/sawtooth
             osc.frequency.setValueAtTime(150, t);
             osc.frequency.exponentialRampToValueAtTime(50, t + 0.2); // Pitch drop

             const gain = ctx.createGain();
             gain.gain.setValueAtTime(0.2, t); // Moderate volume
             gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

             osc.connect(gain);
             gain.connect(masterGain);
             osc.start();
             osc.stop(t + 0.25);
        } 
        else if (type === 'hit') {
            // Dealing Damage: Crisp "Snap" / "Thwack" (Hitting enemy)
            // High pass noise burst
            const bufferSize = ctx.sampleRate * 0.05; // Very short
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 1500; // High frequency snap

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            noise.start();
        }
        else if (type === 'level_up') {
             // Major Chord Arpeggio
             const notes = [440, 554.37, 659.25, 880]; // A Major
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

  // Culling Helper for Game Loop
  const isVisible = (pos: Vector2D, radius: number = 0, buffer: number = 250) => {
      const cvsWidth = window.innerWidth;
      const cvsHeight = window.innerHeight;
      
      return pos.x + radius + buffer > camera.x &&
             pos.x - radius - buffer < camera.x + cvsWidth &&
             pos.y + radius + buffer > camera.y &&
             pos.y - radius - buffer < camera.y + cvsHeight;
  };

  // Initialize game
  useEffect(() => {
    const newPlayer = new Player(characterData);
    setPlayer(newPlayer);
    setCamera({ x: newPlayer.position.x, y: newPlayer.position.y });

    // Socket Connection for Online Mode
    if (isOnlineMode) {
        socketService.connect(() => {
            console.log("Connected to game server!");
            socketService.joinGame(characterData);
        });
    }

    // Spawn initial NPCs
    const cx = GAME_CONFIG.WORLD_WIDTH / 2;
    const cy = GAME_CONFIG.WORLD_HEIGHT / 2;
    const dist = 150;

    setNpcs([
        new NPC({ x: cx + dist, y: cy }, 'Thomas', NPCType.Crafter), // Right
        new NPC({ x: cx - dist, y: cy }, 'Trevor', NPCType.Vendor), // Left
        new NPC({ x: cx, y: cy - dist }, 'Jackson', NPCType.Seller), // Top (Renamed Type)
        new NPC({ x: cx, y: cy + dist }, 'Rory', NPCType.WorldTraveler), // Bottom
    ]);

    // Initialize Waypoints
    setWaypoints(WAYPOINTS.map(data => new Waypoint(data)));

    // --- PRE-SPAWN ENEMIES ---
    const initialEnemies: Enemy[] = [];
    const targetInitialPopulation = Math.floor(GAME_CONFIG.MAX_ENEMIES * 0.8);
    const worldCenter = { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 };
    const maxDistFromCenter = Math.max(GAME_CONFIG.WORLD_WIDTH / 2, GAME_CONFIG.WORLD_HEIGHT / 2);
    
    // --- BOSS SPAWN ---
    const initialBossZone = BOSS_ZONES[Math.floor(Math.random() * BOSS_ZONES.length)];
    const initialBoss = new Enemy({ x: initialBossZone.x, y: initialBossZone.y }, GAME_CONFIG.MAX_LEVEL, initialBossZone.id);
    initialEnemies.push(initialBoss);
    
    globalBossSpawnTimeRef.current = Date.now() + BOSS_CONFIG.SPAWN_COOLDOWN;

    // Normal Mob Spawning
    let attempts = 0;
    while (initialEnemies.length < targetInitialPopulation && attempts < 2000) {
        attempts++;
        const angle = Math.random() * Math.PI * 2;
        const radius = GAME_CONFIG.SAFE_ZONE_RADIUS + Math.random() * (maxDistFromCenter - GAME_CONFIG.SAFE_ZONE_RADIUS);

        const packCenterX = worldCenter.x + Math.cos(angle) * radius;
        const packCenterY = worldCenter.y + Math.sin(angle) * radius;

        if (packCenterX < 100 || packCenterX > GAME_CONFIG.WORLD_WIDTH - 100 || 
            packCenterY < 100 || packCenterY > GAME_CONFIG.WORLD_HEIGHT - 100) {
            continue;
        }

        if (getDistance({x: packCenterX, y: packCenterY}, newPlayer.position) < 800) {
            continue;
        }
        
        let inBossZone = false;
        for (const zone of BOSS_ZONES) {
             if (getDistance({x: packCenterX, y: packCenterY}, {x: zone.x, y: zone.y}) < BOSS_CONFIG.ZONE_RADIUS) {
                 inBossZone = true;
                 break;
             }
        }
        if (inBossZone) continue;

        const effectiveDist = Math.max(0, radius - GAME_CONFIG.SAFE_ZONE_RADIUS);
        const availableRange = maxDistFromCenter - GAME_CONFIG.SAFE_ZONE_RADIUS;
        const distFactor = effectiveDist / availableRange;
        
        let zoneLevel = 1 + Math.floor(distFactor * (GAME_CONFIG.MAX_LEVEL - 1));
        zoneLevel = Math.max(1, Math.min(GAME_CONFIG.MAX_LEVEL, zoneLevel - 2 + Math.floor(Math.random() * 5)));

        const packSize = Math.floor(Math.random() * (GAME_CONFIG.ENEMY_PACK_SIZE_MAX - GAME_CONFIG.ENEMY_PACK_SIZE_MIN + 1)) + GAME_CONFIG.ENEMY_PACK_SIZE_MIN;

        for (let i = 0; i < packSize; i++) {
            const offsetAngle = Math.random() * Math.PI * 2;
            const offsetRadius = Math.random() * GAME_CONFIG.ENEMY_PACK_RADIUS;
            const ex = packCenterX + Math.cos(offsetAngle) * offsetRadius;
            const ey = packCenterY + Math.sin(offsetAngle) * offsetRadius;
            
            if (ex > 0 && ex < GAME_CONFIG.WORLD_WIDTH && ey > 0 && ey < GAME_CONFIG.WORLD_HEIGHT) {
                initialEnemies.push(new Enemy({ x: ex, y: ey }, zoneLevel));
            }
        }
    }
    setEnemies(initialEnemies);
    playSound('boss_spawn');

    return () => {
        if (isOnlineMode) {
            socketService.disconnect();
        }
    };

  }, [characterData, playSound, isOnlineMode]);
  
  // Game loop
  const gameLoop = useCallback(() => {
    gameTimeRef.current++;
    bossSpawnTimerRef.current++;

    if (!player || player.isDead) return;

    // Update player safe zone status
    const playerDistFromCenter = getDistance(player.position, {x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2});
    player.isInSafeZone = playerDistFromCenter <= GAME_CONFIG.SAFE_ZONE_RADIUS;
    
    const gameContext = { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound };
    
    // Update player
    player.update(pressedKeys, gameContext);

    // Waypoint Discovery Logic
    waypoints.forEach(wp => {
        if (getDistance(player.position, wp.data.position) < wp.unlockRadius) {
            if (player.discoverWaypoint(wp.data.id)) {
                 addFloatingText(new FloatingText("Waypoint Discovered!", { x: player.position.x, y: player.position.y - 50 }, '#22d3ee', 20));
                 addVisualEffect(new VisualEffect(wp.data.position, 'buff_aura', 2000, { color: '#22d3ee', radius: 60 }));
            }
        }
    });

    // Update enemies
    const updatedEnemies = [...enemies]; 
    updatedEnemies.forEach(e => e.update(gameContext));

    // Update projectiles
    projectiles.forEach(p => {
        p.update();
    });

    // Update effects
    floatingTexts.forEach(ft => ft.update());
    visualEffects.forEach(ve => ve.update());
    groundEffects.forEach(ge => ge.update(updatedEnemies, gameContext));
    droppedItems.forEach(di => di.update(player));

    // --- SPAWN BOSS ZONE EFFECTS ---
    BOSS_ZONES.forEach(zone => {
        if (isVisible({ x: zone.x, y: zone.y }, BOSS_CONFIG.ZONE_RADIUS)) {
            if (Math.random() < 0.4) { // 40% chance per frame
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * BOSS_CONFIG.ZONE_RADIUS;
                const pos = {
                    x: zone.x + Math.cos(angle) * dist,
                    y: zone.y + Math.sin(angle) * dist
                };
                
                if (zone.id === 'boss_nw') {
                    addVisualEffect(new VisualEffect(pos, 'snow', 3000, { radius: Math.random() * 2 + 2 }));
                } else if (zone.id === 'boss_ne') {
                    addVisualEffect(new VisualEffect(pos, 'ember', 2000, { color: '#ef4444' }));
                } else if (zone.id === 'boss_sw') {
                    addVisualEffect(new VisualEffect(pos, 'spore', 4000, { radius: Math.random() * 3 + 1, color: '#84cc16' }));
                } else if (zone.id === 'boss_se') {
                    addVisualEffect(new VisualEffect(pos, 'shimmer', 1500, { radius: Math.random() * 5 + 3, color: '#d8b4fe' }));
                }
            }
        }
    });

    // --- SPAWN BOSSES ---
    if (bossSpawnTimerRef.current >= 60) {
        bossSpawnTimerRef.current = 0;
        
        const currentBossCount = updatedEnemies.filter(e => e.isBoss && !e.isDead).length;
        const isUniversalCooldownReady = Date.now() > globalBossSpawnTimeRef.current;

        if (currentBossCount < BOSS_CONFIG.MAX_ACTIVE_BOSSES && isUniversalCooldownReady) {
            const occupiedZoneIds = updatedEnemies
                .filter(e => e.isBoss && !e.isDead && e.bossZoneId)
                .map(e => e.bossZoneId);
                
            const availableZones = BOSS_ZONES.filter(z => !occupiedZoneIds.includes(z.id));

            if (availableZones.length > 0) {
                const zone = availableZones[Math.floor(Math.random() * availableZones.length)];
                const boss = new Enemy({ x: zone.x, y: zone.y }, GAME_CONFIG.MAX_LEVEL, zone.id);
                updatedEnemies.push(boss);
                addFloatingText(new FloatingText(`⚠️ ${boss.name} has appeared!`, {x: zone.x, y: zone.y - 100}, '#ef4444', 30));
                playSound('boss_spawn');

                globalBossSpawnTimeRef.current = Date.now() + BOSS_CONFIG.SPAWN_COOLDOWN;
            }
        }
    }

    // --- SPAWN NORMAL ENEMIES ---
    if (gameTimeRef.current > 200 && gameTimeRef.current % 300 === 0 && updatedEnemies.filter(e => !e.isDead).length < GAME_CONFIG.MAX_ENEMIES) {
        const packSize = Math.floor(Math.random() * (GAME_CONFIG.ENEMY_PACK_SIZE_MAX - GAME_CONFIG.ENEMY_PACK_SIZE_MIN + 1)) + GAME_CONFIG.ENEMY_PACK_SIZE_MIN;
        let packCenterX = 0;
        let packCenterY = 0;
        let validSpawn = false;
        let attempts = 0;
        const minSpawnDistance = 800;
        const worldCenter = { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 };
        const maxDistFromCenter = Math.max(GAME_CONFIG.WORLD_WIDTH / 2, GAME_CONFIG.WORLD_HEIGHT / 2);

        while (!validSpawn && attempts < 10) {
            const angle = Math.random() * Math.PI * 2;
            const radius = GAME_CONFIG.SAFE_ZONE_RADIUS + GAME_CONFIG.ENEMY_SPAWN_BUFFER + Math.random() * (GAME_CONFIG.WORLD_WIDTH / 2 - GAME_CONFIG.SAFE_ZONE_RADIUS - GAME_CONFIG.ENEMY_SPAWN_BUFFER);
            packCenterX = worldCenter.x + Math.cos(angle) * radius;
            packCenterY = worldCenter.y + Math.sin(angle) * radius;

            if (getDistance({x: packCenterX, y: packCenterY}, player.position) > minSpawnDistance) {
                let inBossZone = false;
                for (const zone of BOSS_ZONES) {
                     if (getDistance({x: packCenterX, y: packCenterY}, {x: zone.x, y: zone.y}) < BOSS_CONFIG.ZONE_RADIUS) {
                         inBossZone = true;
                         break;
                     }
                }
                if (!inBossZone) validSpawn = true;
            }
            attempts++;
        }
        
        if (validSpawn) {
            const distFromCenter = getDistance({ x: packCenterX, y: packCenterY }, worldCenter);
            const effectiveDist = Math.max(0, distFromCenter - GAME_CONFIG.SAFE_ZONE_RADIUS);
            const availableRange = maxDistFromCenter - GAME_CONFIG.SAFE_ZONE_RADIUS;
            const distFactor = effectiveDist / availableRange;
            let zoneLevel = 1 + Math.floor(distFactor * (GAME_CONFIG.MAX_LEVEL - 1));
            zoneLevel = Math.max(1, Math.min(GAME_CONFIG.MAX_LEVEL, zoneLevel - 2 + Math.floor(Math.random() * 5)));

            for (let i = 0; i < packSize; i++) {
                const offsetAngle = Math.random() * Math.PI * 2;
                const offsetRadius = Math.random() * GAME_CONFIG.ENEMY_PACK_RADIUS;
                const x = packCenterX + Math.cos(offsetAngle) * offsetRadius;
                const y = packCenterY + Math.sin(offsetAngle) * offsetRadius;
                
                if (getDistance({x, y}, worldCenter) > GAME_CONFIG.SAFE_ZONE_RADIUS) {
                    updatedEnemies.push(new Enemy({ x, y }, zoneLevel));
                }
            }
        }
    }
    
    // Collisions
    projectiles.forEach(p => {
        if (p.ownerId === player.id) {
            for (const enemy of updatedEnemies) {
                if (enemy.isDead) continue;
                if (getDistance(p.position, enemy.position) < p.radius + enemy.radius) {
                    p.onHit(enemy, gameContext);
                    if (!p.piercing && p.bounces <= 0) p.expire();
                }
            }
        } else {
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
            } else {
                 addFloatingText(new FloatingText(`Inventory Full!`, player.position, '#ff4d4d'));
                 remainingItems.push(di);
            }
        } else {
            remainingItems.push(di);
        }
    });
    setDroppedItems(remainingItems);

    // Check player death
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
    
    // Update state
    setEnemies(updatedEnemies.map(e => {
        if (e.isDead && !e.lootDropped) {
            e.dropLoot(player).forEach(addDroppedItem);
            
            // Level Up Sound Check
            const oldLevel = player.level;
            player.gainXP(e.xpValue, addFloatingText, e.level);
            if (player.level > oldLevel) {
                playSound('level_up');
            }

            player.gainGold(e.goldValue, addFloatingText);
            player.kills++;

            if (e.isBoss) {
                globalBossSpawnTimeRef.current = Date.now() + BOSS_CONFIG.SPAWN_COOLDOWN;
                addFloatingText(new FloatingText(`${e.name} Defeated!`, e.position, '#a855f7', 40));
            }
        }
        return e;
    }).filter(e => !e.isDead));
    setProjectiles(prev => prev.filter(p => !p.isExpired()));
    setFloatingTexts(prev => prev.filter(ft => !ft.isExpired()));
    setVisualEffects(prev => prev.filter(ve => !ve.isExpired()));
    setGroundEffects(prev => prev.filter(ge => !ge.isExpired()));
    
    // Update camera
    const canvas = canvasRef.current;
    if (canvas) {
        const targetX = player.position.x - canvas.width / 2;
        const targetY = player.position.y - canvas.height / 2;
        setCamera(prev => ({
            x: prev.x + (targetX - prev.x) * 0.1,
            y: prev.y + (targetY - prev.y) * 0.1,
        }));
    }

  }, [player, enemies, projectiles, floatingTexts, visualEffects, groundEffects, droppedItems, pressedKeys, onDeath, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, addDroppedItem, waypoints, camera, playSound]);

  useGameLoop(gameLoop);

  // Drawing
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

    // Draw world bounds/grid
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1;
    
    const gridStep = 50;
    const startX = Math.max(0, Math.floor(camera.x / gridStep) * gridStep);
    const endX = Math.min(GAME_CONFIG.WORLD_WIDTH, camera.x + canvas.width);
    const startY = Math.max(0, Math.floor(camera.y / gridStep) * gridStep);
    const endY = Math.min(GAME_CONFIG.WORLD_HEIGHT, camera.y + canvas.height);

    for(let x = startX; x <= endX; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, GAME_CONFIG.WORLD_HEIGHT);
        ctx.stroke();
    }
    for(let y = startY; y <= endY; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(GAME_CONFIG.WORLD_WIDTH, y);
        ctx.stroke();
    }

    // Draw Safe Zone
    if (isVisible({ x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 }, GAME_CONFIG.SAFE_ZONE_RADIUS)) {
        ctx.beginPath();
        ctx.arc(GAME_CONFIG.WORLD_WIDTH / 2, GAME_CONFIG.WORLD_HEIGHT / 2, GAME_CONFIG.SAFE_ZONE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 150, 0.05)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 255, 150, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Draw Boss Zones
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
             
             ctx.fillStyle = 'rgba(147, 51, 234, 0.2)';
             ctx.font = '40px sans-serif';
             ctx.textAlign = 'center';
             ctx.fillText('☠️', zone.x, zone.y);
             ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
             ctx.font = 'bold 20px sans-serif';
             ctx.fillText(zone.name, zone.x, zone.y + 30);
        }
    });
    
    // Draw entities
    groundEffects.forEach(ge => {
        if(isVisible(ge.position, ge.radius)) ge.draw(ctx);
    });
    
    waypoints.forEach(wp => {
        if(isVisible(wp.data.position, wp.radius)) {
            const isDiscovered = player.discoveredWaypoints.includes(wp.data.id);
            wp.draw(ctx, isDiscovered);
        }
    });

    droppedItems.forEach(di => {
        if(isVisible(di.position, 20)) di.draw(ctx);
    });
    
    npcs.forEach(npc => {
        if(isVisible(npc.position, npc.radius)) npc.draw(ctx);
    });

    enemies.forEach(e => {
        if(isVisible(e.position, e.radius)) e.draw(ctx);
    });
    
    player.draw(ctx);
    
    projectiles.forEach(p => {
        if(isVisible(p.position, p.radius)) p.draw(ctx);
    });
    
    visualEffects.forEach(ve => {
         if(isVisible(ve.position, 100)) ve.draw(ctx);
    });
    
    floatingTexts.forEach(ft => {
        if(isVisible(ft.position, 50)) ft.draw(ctx);
    });

    ctx.restore();
  }, [player, enemies, projectiles, floatingTexts, visualEffects, groundEffects, droppedItems, npcs, camera, waypoints]);

  const toggleInventory = useCallback(() => {
    if (interactingNPC || interactingWaypoint) return;
    setInventoryOpen(prev => !prev);
  }, [interactingNPC, interactingWaypoint]);

  const handleUseSkill = (index: number) => {
      if(!player) return;
      playSound('attack');
      player.useSkill(index, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound });
  };

  const handleUseSkillRef = useRef(handleUseSkill);
  useEffect(() => {
      handleUseSkillRef.current = handleUseSkill;
  });

  const nearbyNPC = player ? npcs.find(npc => getDistance(player.position, npc.position) < npc.interactionRadius) : null;
  const nearbyWaypoint = player ? waypoints.find(wp => getDistance(player.position, wp.data.position) < wp.interactionRadius && player.discoveredWaypoints.includes(wp.data.id)) : null;
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if(key === 'i' || key === 'c') {
            toggleInventory();
        }
        if(key === 'e') {
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
        if (['1', '2', '3', '4', '5'].includes(key)) {
            handleUseSkillRef.current(parseInt(key) - 1);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleInventory, nearbyNPC, nearbyWaypoint]);
  
  const handleItemEquip = (itemIndex: number) => {
      if (player) {
          player.equipItem(itemIndex);
          const dropped = player.flushOverflowItems();
          dropped.forEach(item => addDroppedItem(new DroppedItem(player.position, item)));
          setPlayer(new Player(player.toCharacterData()));
      }
  };
  const handleItemUnequip = (itemSlot: ItemSlot) => {
      if (player) {
          player.unequipItem(itemSlot);
          const dropped = player.flushOverflowItems();
          dropped.forEach(item => addDroppedItem(new DroppedItem(player.position, item)));
          setPlayer(new Player(player.toCharacterData()));
      }
  };
  
  const handleToggleItemLock = (itemIndex: number) => {
      if (player) {
          player.toggleItemLock(itemIndex);
          setPlayer(new Player(player.toCharacterData()));
      }
  }

  const handleInventoryMove = (fromIndex: number, toIndex: number) => {
    if (player) {
        player.moveItem(fromIndex, toIndex);
        setPlayer(new Player(player.toCharacterData()));
    }
  };
  
  const handleCraft = (recipe: Recipe) => {
      if (player?.craftItem(recipe)) {
          setPlayer(new Player(player.toCharacterData()));
      }
  };
  
  const handleSell = (item: Item, inventoryIndex: number, sellFullStack: boolean) => {
       if (player?.sellItem(inventoryIndex, sellFullStack)) {
            setPlayer(new Player(player.toCharacterData()));
       }
  };
  
  const handleSellByRarity = (rarity: ItemRarity) => {
      if (player) {
          player.sellUnlockedItemsByRarity(rarity);
          setPlayer(new Player(player.toCharacterData()));
      }
  }
  
  const handleBuyItem = (item: Item, cost: number) => {
      if (player?.buyItem(item, cost)) {
          setPlayer(new Player(player.toCharacterData()));
      }
  };

  const handleFastTravel = (destination: WaypointData) => {
      if (player) {
          player.position = { ...destination.position };
          setCamera({ x: player.position.x, y: player.position.y });
          addVisualEffect(new VisualEffect(destination.position, 'teleport_in', 1000, { radius: 40, endPos: destination.position }));
          addFloatingText(new FloatingText("Fast Travelled", destination.position, '#22d3ee'));
          setInteractingWaypoint(null);
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
      />
      
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
        className="absolute top-4 right-[220px] bg-gray-800/80 p-2 rounded-lg pointer-events-auto hover:bg-gray-700/80"
      >
        Return to Menu
      </button>
      <div id="tooltip-root" className="absolute" />
    </div>
  );
};

export default Game;
