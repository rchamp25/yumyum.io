import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CharacterData, GameStats, NPCType, GameContext, Vector2D, WaypointData } from '../game/types';
import { Player } from '../game/entities/Player';
import { Enemy } from '../game/entities/Enemy';
import { Projectile } from '../game/entities/Projectile';
import { FloatingText } from '../game/entities/FloatingText';
import { VisualEffect } from '../game/entities/VisualEffect';
import { GroundEffect } from '../game/entities/GroundEffect';
import { DroppedItem } from '../game/entities/DroppedItem';
import { NPC } from '../game/entities/NPC';
import { Waypoint } from '../game/entities/Waypoint';
import {
  GAME_CONFIG, WORLD_CENTER, WAYPOINTS, BOSS_ZONES, BOSS_CONFIG,
  WORLD_IDS, WORLD_CONFIGS, INTEREST_ZONES,
} from '../game/constants';
import { CRAFTING_RECIPES } from '../game/items';
import { getDistance } from '../game/math';
import { createEnemyPack, createBoss } from '../game/spawning';
import HUD from './HUD';
import Inventory from './Inventory';
import NPCInteraction from './NPCInteraction';
import FastTravelUI from './FastTravelUI';
import EnemyTooltip from './EnemyTooltip';
import VirtualJoystick from './VirtualJoystick';
import { storageService } from '../services/storage';

// The simulation advances in fixed 60Hz steps regardless of the display's refresh rate,
// so movement and frame-counted timers behave the same on 60Hz, 120Hz and 144Hz screens.
const STEP_MS = 1000 / 60;
const MAX_STEPS_PER_FRAME = 5;
const AUTOSAVE_INTERVAL_STEPS = 60 * 60; // ~1 minute
const SPAWN_CHECK_INTERVAL_STEPS = 20;
const INITIAL_ENEMY_PACKS = 80;
const UI_REFRESH_MS = 100;
// Idle enemies further than this from the player are not simulated until the player gets closer
const ENEMY_UPDATE_RADIUS = 2500;
// Extra space around the viewport that is still drawn, so large entities don't pop in at the edges
const CULL_MARGIN = 250;
const GRID_SIZE = 150;
const PICKUP_RANGE = 30;
const INTERACT_RANGE_BONUS = 20;
const INTERACTION_CLOSE_DISTANCE = 150;
const INVENTORY_FULL_NOTICE_MS = 2000;

// Movement uses physical key positions so WASD works on any keyboard layout; arrow keys work too
const MOVEMENT_KEYS: Record<string, string> = {
  KeyW: 'w', ArrowUp: 'w',
  KeyA: 'a', ArrowLeft: 'a',
  KeyS: 's', ArrowDown: 's',
  KeyD: 'd', ArrowRight: 'd',
};

const SKILL_KEYS: Record<string, number> = {
  Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4,
  Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4,
};

const isTextInput = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);

interface Entities {
  enemies: Enemy[];
  projectiles: Projectile[];
  floatingTexts: FloatingText[];
  visualEffects: VisualEffect[];
  groundEffects: GroundEffect[];
  droppedItems: DroppedItem[];
  npcs: NPC[];
  waypoints: Waypoint[];
}

const createEmptyEntities = (): Entities => ({
  enemies: [], projectiles: [], floatingTexts: [], visualEffects: [],
  groundEffects: [], droppedItems: [], npcs: [], waypoints: [],
});

const createTownNPCs = (): NPC[] => {
  const { x: cx, y: cy } = WORLD_CENTER;
  return [
    new NPC({ x: cx + 150, y: cy }, 'Thomas', NPCType.Crafter),
    new NPC({ x: cx - 150, y: cy }, 'Trevor', NPCType.Vendor),
    new NPC({ x: cx, y: cy - 150 }, 'Jackson', NPCType.Seller),
    new NPC({ x: cx, y: cy + 150 }, 'Rory', NPCType.WorldTraveler),
    new NPC({ x: cx - 150, y: cy + 150 }, 'Vault Master', NPCType.Banker),
  ];
};

const centerCameraOn = (position: Vector2D) => ({
  x: position.x - window.innerWidth / 2,
  y: position.y - window.innerHeight / 2,
});

interface GameProps {
  characterData: CharacterData;
  userId: string;
  onDeath: (stats: GameStats, finalCharacterData: CharacterData) => void;
  onLeave: (finalCharacterData: CharacterData) => void;
  onTravelToWorld: (characterData: CharacterData) => void;
}

const Game: React.FC<GameProps> = ({ characterData, userId, onDeath, onLeave, onTravelToWorld }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // The player lives for the whole session; App remounts this component to switch worlds.
  const [player] = useState(() => {
    const p = new Player(characterData);
    p.setInvulnerable(3000);
    return p;
  });

  const entitiesRef = useRef<Entities>(createEmptyEntities());
  const cameraRef = useRef(centerCameraOn(player.position));
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const joystickVectorRef = useRef<Vector2D>({ x: 0, y: 0 });

  // Shared by the game loop, skills and entities. `enemies` is a getter because the loop
  // replaces the array every step when it removes dead enemies.
  const [gameContext] = useState<GameContext>(() => ({
    player,
    get enemies() { return entitiesRef.current.enemies; },
    addProjectile: (proj) => { entitiesRef.current.projectiles.push(proj); },
    addFloatingText: (ft) => { entitiesRef.current.floatingTexts.push(ft); },
    addVisualEffect: (ve) => { entitiesRef.current.visualEffects.push(ve); },
    addGroundEffect: (ge) => { entitiesRef.current.groundEffects.push(ge); },
    playSound: () => {}, // Sound effects are not implemented yet
  }));

  // --- React UI state ---
  const [isInventoryOpen, setInventoryOpen] = useState(false);
  // The stats panel starts open only where there's room for it next to the minimap
  const [isStatsOpen, setStatsOpen] = useState(() => window.innerWidth >= 768 && window.innerHeight > 500);
  const [interactingNPC, setInteractingNPC] = useState<NPC | null>(null);
  const [interactingWaypoint, setInteractingWaypoint] = useState<Waypoint | null>(null);
  const [hoveredEnemy, setHoveredEnemy] = useState<Enemy | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [, setUiTick] = useState(0);
  const refreshUi = useCallback(() => setUiTick(t => t + 1), []);

  // Mirrors of state and props that the long-running game loop needs to read
  const interactingNPCRef = useRef(interactingNPC);
  const interactingWaypointRef = useRef(interactingWaypoint);
  const callbacksRef = useRef({ onDeath, onLeave, onTravelToWorld });
  useEffect(() => {
    interactingNPCRef.current = interactingNPC;
    interactingWaypointRef.current = interactingWaypoint;
    callbacksRef.current = { onDeath, onLeave, onTravelToWorld };
  });

  // --- Saving ---
  // Saves never overlap: a save requested while one is in flight runs once the first finishes.
  const saveStateRef = useRef({ inFlight: false, pending: false });
  const savePromiseRef = useRef<Promise<void>>(Promise.resolve());
  // Set once the character has been handed back to App (leave, death or world travel).
  // From then on App owns saving, and the game loop stops.
  const hasExitedRef = useRef(false);

  const saveProgress = useCallback(() => {
    const state = saveStateRef.current;
    if (hasExitedRef.current) return;
    if (state.inFlight) {
      state.pending = true;
      return;
    }
    state.inFlight = true;
    setIsSaving(true);
    savePromiseRef.current = (async () => {
      try {
        do {
          state.pending = false;
          await storageService.saveCharacter(userId, player.toCharacterData());
        } while (state.pending && !hasExitedRef.current);
      } finally {
        state.inFlight = false;
        setIsSaving(false);
      }
    })();
  }, [userId, player]);

  // Waits for any in-flight save so it can't land after (and overwrite) the save App makes on exit
  const exitGame = useCallback((handOff: () => void) => {
    if (hasExitedRef.current) return;
    hasExitedRef.current = true;
    void savePromiseRef.current.then(handOff);
  }, []);

  // Best-effort save when the tab is hidden or closed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveProgress();
    };
    const handlePageHide = () => saveProgress();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [saveProgress]);

  // --- Main game loop ---
  useEffect(() => {
    const worldId = player.currentWorldId;
    const e = createEmptyEntities();
    e.npcs = createTownNPCs();
    e.waypoints = WAYPOINTS.map(data => new Waypoint(data));
    for (let i = 0; i < INITIAL_ENEMY_PACKS; i++) {
      e.enemies.push(...createEnemyPack(worldId));
    }
    let nextBossSpawnAt = 0;
    const firstBoss = createBoss(worldId, e.enemies);
    if (firstBoss) {
      e.enemies.push(firstBoss);
      nextBossSpawnAt = Date.now() + BOSS_CONFIG.SPAWN_COOLDOWN;
    }
    entitiesRef.current = e;

    let spawnTimer = 0;
    let saveTimer = 0;
    let lastInventoryFullNotice = 0;

    const notifyInventoryFull = () => {
      const now = Date.now();
      if (now - lastInventoryFullNotice < INVENTORY_FULL_NOTICE_MS) return;
      lastInventoryFullNotice = now;
      gameContext.addFloatingText(new FloatingText('Inventory Full!', { x: player.position.x, y: player.position.y - 40 }, '#ff4d4d'));
    };

    const spawnAmbientParticle = () => {
      const zone = INTEREST_ZONES.find(z => getDistance(player.position, z) < z.radius);
      if (!zone) return;
      const spawnChance = zone.particleType === 'fog' ? 0.05 : 0.3; // Fog lasts longer
      if (Math.random() >= spawnChance) return;

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 600;
      const pos = { x: player.position.x + Math.cos(angle) * dist, y: player.position.y + Math.sin(angle) * dist };

      let duration = 2000;
      let radius = 2;
      let color = 'white';
      switch (zone.particleType) {
        case 'snow': duration = 3000; radius = 3; break;
        case 'ember': duration = 1500; break;
        case 'spore': duration = 4000; break;
        case 'ash': duration = 3000; radius = 3; break;
        case 'fog': duration = 6000; radius = 150; color = 'rgba(200,200,200,0.1)'; break;
      }
      gameContext.addVisualEffect(new VisualEffect(pos, zone.particleType, duration, { radius, color }));
    };

    const discoverNearbyWaypoints = () => {
      for (const wp of entitiesRef.current.waypoints) {
        if (getDistance(player.position, wp.data.position) < wp.unlockRadius && player.discoverWaypoint(wp.data.id)) {
          gameContext.addFloatingText(new FloatingText('Waypoint Discovered!', { x: player.position.x, y: player.position.y - 50 }, '#22d3ee', 20));
          gameContext.addVisualEffect(new VisualEffect(wp.data.position, 'buff_aura', 2000, { color: '#22d3ee', radius: 60 }));
          saveProgress();
        }
      }
    };

    /** Advances the simulation by one fixed step. Returns false once the game should stop. */
    const step = (): boolean => {
      const p = player;
      const ctx = gameContext;
      const ents = entitiesRef.current;

      // 1. Spawning and autosave
      if (++spawnTimer >= SPAWN_CHECK_INTERVAL_STEPS) {
        spawnTimer = 0;
        if (ents.enemies.length < GAME_CONFIG.MAX_ENEMIES) {
          ents.enemies.push(...createEnemyPack(p.currentWorldId));
        }
        const now = Date.now();
        if (now >= nextBossSpawnAt) {
          const boss = createBoss(p.currentWorldId, ents.enemies);
          if (boss) {
            ents.enemies.push(boss);
            nextBossSpawnAt = now + BOSS_CONFIG.SPAWN_COOLDOWN;
          }
        }
        spawnAmbientParticle();
      }
      if (++saveTimer >= AUTOSAVE_INTERVAL_STEPS) {
        saveTimer = 0;
        saveProgress();
      }

      // 2. Movement and AI
      p.isInSafeZone = getDistance(p.position, WORLD_CENTER) <= GAME_CONFIG.SAFE_ZONE_RADIUS;
      p.update(pressedKeysRef.current, ctx, joystickVectorRef.current);
      discoverNearbyWaypoints();

      const activeEnemies: Enemy[] = [];
      const updateRadiusSq = ENEMY_UPDATE_RADIUS * ENEMY_UPDATE_RADIUS;
      for (const mob of ents.enemies) {
        const dx = mob.position.x - p.position.x;
        const dy = mob.position.y - p.position.y;
        if (!mob.isIdle || dx * dx + dy * dy < updateRadiusSq) {
          mob.update(ctx);
          activeEnemies.push(mob);
        }
      }
      ents.projectiles.forEach(proj => proj.update());
      ents.droppedItems.forEach(item => item.update(p));
      ents.floatingTexts.forEach(ft => ft.update());
      ents.visualEffects.forEach(ve => ve.update());
      ents.groundEffects.forEach(ge => ge.update(ents.enemies, ctx));

      // 3. Projectile collisions
      for (const proj of ents.projectiles) {
        if (proj.isExpired()) continue;
        if (proj.isHostile) {
          if (getDistance(proj.position, p.position) < proj.radius + p.radius) {
            proj.onHit(p, ctx);
            if (!proj.piercing) proj.expire();
          }
          continue;
        }
        for (const mob of activeEnemies) {
          if (mob.isDead || proj.hitIds.includes(mob.id)) continue;
          if (getDistance(proj.position, mob.position) >= proj.radius + mob.radius) continue;
          // onHit consumes a bounce and redirects the projectile; only expire it if it had none left
          const canBounce = proj.bounces > 0;
          proj.onHit(mob, ctx);
          if (!proj.piercing && !canBounce) proj.expire();
          if (proj.isExpired()) break;
        }
      }

      // 4. Kills and loot
      for (const mob of ents.enemies) {
        if (mob.health > 0 || mob.xpGiven) continue;
        mob.isDead = true;
        mob.xpGiven = true;
        p.gainXP(mob.xpValue, ctx.addFloatingText, mob.level);
        p.gainGold(mob.goldValue, ctx.addFloatingText);
        p.kills++;
        ents.droppedItems.push(...mob.dropLoot(p));
      }

      const pickupDistance = p.radius + PICKUP_RANGE;
      ents.droppedItems = ents.droppedItems.filter(drop => {
        if (getDistance(drop.position, p.position) >= pickupDistance) return true;
        if (p.pickupItem(drop.item)) {
          ctx.addFloatingText(new FloatingText(`+ ${drop.item.name}`, p.position, '#ffd700'));
          return false;
        }
        notifyInventoryFull();
        return true;
      });

      // 5. Cleanup
      ents.enemies = ents.enemies.filter(mob => !mob.isDead);
      ents.projectiles = ents.projectiles.filter(proj => !proj.isExpired());
      ents.floatingTexts = ents.floatingTexts.filter(ft => !ft.isExpired());
      ents.visualEffects = ents.visualEffects.filter(ve => !ve.isExpired());
      ents.groundEffects = ents.groundEffects.filter(ge => !ge.isExpired());

      // 6. Death
      if (p.health <= 0) {
        const stats: GameStats = {
          killerName: p.lastDamagedBy || 'Monster',
          level: p.level,
          kills: p.kills,
          gold: p.gold,
          totalDamageTaken: Math.round(p.totalDamageTaken),
          deathLog: p.deathLog,
        };
        exitGame(() => callbacksRef.current.onDeath(stats, p.toCharacterData()));
        return false;
      }

      // 7. Camera follows the player smoothly
      const target = centerCameraOn(p.position);
      cameraRef.current.x += (target.x - cameraRef.current.x) * 0.1;
      cameraRef.current.y += (target.y - cameraRef.current.y) * 0.1;
      return true;
    };

    const render = () => {
      const canvas = canvasRef.current;
      const g = canvas?.getContext('2d');
      if (!canvas || !g) return;

      const width = window.innerWidth;
      const height = window.innerHeight;
      // Resizing clears the canvas and reallocates its buffer, so only do it when the size changes
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const p = player;
      const ents = entitiesRef.current;
      const cam = cameraRef.current;
      const view = {
        left: cam.x - CULL_MARGIN,
        top: cam.y - CULL_MARGIN,
        right: cam.x + width + CULL_MARGIN,
        bottom: cam.y + height + CULL_MARGIN,
      };
      const isVisible = (pos: Vector2D, radius = 0) =>
        pos.x + radius > view.left && pos.x - radius < view.right &&
        pos.y + radius > view.top && pos.y - radius < view.bottom;

      const world = WORLD_CONFIGS[p.currentWorldId] || WORLD_CONFIGS[WORLD_IDS.WORLD_1];
      g.fillStyle = world.bgColor;
      g.fillRect(0, 0, width, height);

      g.save();
      g.translate(-cam.x, -cam.y);

      // Interest zones (ground tint)
      for (const zone of INTEREST_ZONES) {
        if (!isVisible(zone, zone.radius)) continue;
        const grad = g.createRadialGradient(zone.x, zone.y, zone.radius * 0.2, zone.x, zone.y, zone.radius);
        grad.addColorStop(0, zone.color);
        grad.addColorStop(0.7, zone.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.beginPath();
        g.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
        g.fill();
      }

      // Grid (visible part only, drawn as a single path)
      const gridLeft = Math.max(0, Math.floor(view.left / GRID_SIZE) * GRID_SIZE);
      const gridRight = Math.min(GAME_CONFIG.WORLD_WIDTH, view.right);
      const gridTop = Math.max(0, Math.floor(view.top / GRID_SIZE) * GRID_SIZE);
      const gridBottom = Math.min(GAME_CONFIG.WORLD_HEIGHT, view.bottom);
      g.beginPath();
      for (let x = gridLeft; x <= gridRight; x += GRID_SIZE) {
        g.moveTo(x, Math.max(0, view.top));
        g.lineTo(x, gridBottom);
      }
      for (let y = gridTop; y <= gridBottom; y += GRID_SIZE) {
        g.moveTo(Math.max(0, view.left), y);
        g.lineTo(gridRight, y);
      }
      g.strokeStyle = world.gridColor;
      g.lineWidth = 1;
      g.stroke();

      if (p.currentWorldId === WORLD_IDS.WORLD_2 && isVisible(WORLD_CENTER, 700)) {
        g.save();
        g.font = 'bold 200px sans-serif';
        g.fillStyle = 'rgba(20, 83, 45, 0.2)';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('THE GROVE', WORLD_CENTER.x, WORLD_CENTER.y);
        g.restore();
      }

      // Safe zone ring
      if (isVisible(WORLD_CENTER, GAME_CONFIG.SAFE_ZONE_RADIUS)) {
        g.beginPath();
        g.arc(WORLD_CENTER.x, WORLD_CENTER.y, GAME_CONFIG.SAFE_ZONE_RADIUS, 0, Math.PI * 2);
        g.strokeStyle = 'rgba(20, 184, 166, 0.4)';
        g.lineWidth = 6;
        g.setLineDash([15, 10]);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = 'rgba(20, 184, 166, 0.05)';
        g.fill();
      }

      // Boss zones
      for (const zone of BOSS_ZONES) {
        if (!isVisible(zone, BOSS_CONFIG.ZONE_RADIUS)) continue;
        g.beginPath();
        g.arc(zone.x, zone.y, BOSS_CONFIG.ZONE_RADIUS, 0, Math.PI * 2);
        g.fillStyle = 'rgba(147, 51, 234, 0.05)';
        g.fill();
        g.strokeStyle = 'rgba(147, 51, 234, 0.3)';
        g.lineWidth = 4;
        g.setLineDash([20, 10]);
        g.stroke();
        g.setLineDash([]);
      }

      // Entities
      ents.groundEffects.forEach(ge => { if (isVisible(ge.position, ge.radius)) ge.draw(g); });
      ents.waypoints.forEach(wp => {
        if (isVisible(wp.data.position, wp.radius + 80)) wp.draw(g, p.discoveredWaypoints.includes(wp.data.id));
      });
      ents.droppedItems.forEach(di => { if (isVisible(di.position, 30)) di.draw(g); });
      ents.npcs.forEach(npc => {
        if (!isVisible(npc.position, npc.radius + 40)) return;
        const canInteract = getDistance(p.position, npc.position) < npc.interactionRadius + INTERACT_RANGE_BONUS;
        npc.draw(g, canInteract);
      });
      ents.enemies.forEach(mob => { if (isVisible(mob.position, mob.radius + 40)) mob.draw(g); });
      p.draw(g);
      ents.projectiles.forEach(proj => { if (isVisible(proj.position, proj.radius)) proj.draw(g); });
      ents.visualEffects.forEach(ve => { if (isVisible(ve.position, 300)) ve.draw(g); });
      ents.floatingTexts.forEach(ft => { if (isVisible(ft.position, 100)) ft.draw(g); });

      g.restore();
    };

    let rafId = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    let lastUiRefresh = 0;

    const frame = (now: number) => {
      if (hasExitedRef.current) return;

      // Clamp long gaps (e.g. a backgrounded tab) so we don't fast-forward the world
      accumulator += Math.min(now - lastTime, 250);
      lastTime = now;
      let steps = 0;
      while (accumulator >= STEP_MS) {
        if (!step()) return;
        accumulator -= STEP_MS;
        if (++steps >= MAX_STEPS_PER_FRAME) {
          accumulator = 0;
          break;
        }
      }
      render();

      if (now - lastUiRefresh >= UI_REFRESH_MS) {
        lastUiRefresh = now;
        // Close shop/travel windows once the player walks away
        const npc = interactingNPCRef.current;
        if (npc && getDistance(player.position, npc.position) > INTERACTION_CLOSE_DISTANCE) setInteractingNPC(null);
        const wp = interactingWaypointRef.current;
        if (wp && getDistance(player.position, wp.data.position) > INTERACTION_CLOSE_DISTANCE) setInteractingWaypoint(null);
        setUiTick(t => t + 1);
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [player, gameContext, saveProgress, exitGame]);

  // --- Interaction ---
  const findInteractable = useCallback((): { npc: NPC } | { waypoint: Waypoint } | null => {
    const { npcs, waypoints } = entitiesRef.current;
    const npc = npcs.find(n => getDistance(player.position, n.position) < n.interactionRadius + INTERACT_RANGE_BONUS);
    if (npc) return { npc };
    const waypoint = waypoints.find(wp =>
      player.discoveredWaypoints.includes(wp.data.id) &&
      getDistance(player.position, wp.data.position) < wp.interactionRadius);
    return waypoint ? { waypoint } : null;
  }, [player]);

  const handleInteraction = useCallback(() => {
    const target = findInteractable();
    if (!target) return;
    setInventoryOpen(false);
    setHoveredEnemy(null);
    if ('npc' in target) {
      setInteractingNPC(target.npc);
      setInteractingWaypoint(null);
    } else {
      setInteractingWaypoint(target.waypoint);
      setInteractingNPC(null);
    }
  }, [findInteractable]);

  // --- Keyboard ---
  useEffect(() => {
    const pressedKeys = pressedKeysRef.current;
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (isTextInput(ev.target) || ev.ctrlKey || ev.metaKey || ev.altKey) return;

      const movementKey = MOVEMENT_KEYS[ev.code];
      if (movementKey) {
        pressedKeys.add(movementKey);
        return;
      }
      if (ev.repeat) return; // Holding a toggle key shouldn't flicker its window

      const skillIndex = SKILL_KEYS[ev.code];
      if (skillIndex !== undefined) {
        player.useSkill(skillIndex, gameContext);
        return;
      }

      switch (ev.key.toLowerCase()) {
        case 'escape':
          setInventoryOpen(false);
          setInteractingNPC(null);
          setInteractingWaypoint(null);
          break;
        case 'i': setInventoryOpen(prev => !prev); break;
        case 'c': setStatsOpen(prev => !prev); break;
        case 'e': handleInteraction(); break;
      }
    };
    const handleKeyUp = (ev: KeyboardEvent) => {
      const movementKey = MOVEMENT_KEYS[ev.code];
      if (movementKey) pressedKeys.delete(movementKey);
    };
    // Releasing a key while the window is unfocused never fires keyup, which would leave the player walking
    const handleBlur = () => pressedKeys.clear();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [player, gameContext, handleInteraction]);

  // --- Actions ---
  const handleMouseMove = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const worldPos = {
      x: ev.clientX - rect.left + cameraRef.current.x,
      y: ev.clientY - rect.top + cameraRef.current.y,
    };
    const target = entitiesRef.current.enemies.find(mob => !mob.isDead && getDistance(worldPos, mob.position) <= mob.radius + 15) ?? null;
    setHoveredEnemy(target);
    if (target) setTooltipPos({ x: ev.clientX, y: ev.clientY });
  };

  // Equipping or removing a bag can shrink the inventory; anything that no longer fits is dropped
  const afterInventoryChange = () => {
    player.flushOverflowItems().forEach(item => {
      entitiesRef.current.droppedItems.push(new DroppedItem(player.position, item));
    });
    saveProgress();
    refreshUi();
  };

  const handleFastTravel = (destination: WaypointData) => {
    player.position = { ...destination.position };
    cameraRef.current = centerCameraOn(player.position);
    gameContext.addVisualEffect(new VisualEffect(destination.position, 'teleport_in', 1000, { radius: 40, endPos: destination.position }));
    gameContext.addFloatingText(new FloatingText('Fast Travelled', destination.position, '#22d3ee'));
    setInteractingWaypoint(null);
    saveProgress();
  };

  const handleTravelToWorld = (worldId: string) => {
    exitGame(() => {
      const data = player.toCharacterData();
      data.currentWorldId = worldId;
      data.position = { ...WORLD_CENTER };
      callbacksRef.current.onTravelToWorld(data);
    });
  };

  const handleLeave = () => {
    exitGame(() => callbacksRef.current.onLeave(player.toCharacterData()));
  };

  const interactable = findInteractable();
  const isAnyWindowOpen = isInventoryOpen || interactingNPC !== null || interactingWaypoint !== null;

  return (
    <div className="w-full h-full relative overflow-hidden bg-gray-950">
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredEnemy(null)}
      />
      <VirtualJoystick onMove={(v) => { joystickVectorRef.current = v; }} />

      <HUD
        player={player}
        enemies={entitiesRef.current.enemies}
        npcs={entitiesRef.current.npcs}
        waypoints={entitiesRef.current.waypoints}
        isSaving={isSaving}
        isStatsOpen={isStatsOpen}
        onUseSkill={(index) => player.useSkill(index, gameContext)}
        toggleInventory={() => setInventoryOpen(prev => !prev)}
        toggleStats={() => setStatsOpen(prev => !prev)}
        onLeave={handleLeave}
      />

      {hoveredEnemy && !hoveredEnemy.isDead && !isAnyWindowOpen && (
        <EnemyTooltip enemy={hoveredEnemy} position={tooltipPos} />
      )}

      {interactable && !isAnyWindowOpen && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[-140px] z-40 pointer-events-auto">
          <button
            onClick={handleInteraction}
            className="animate-bounce-subtle flex items-center gap-3 bg-gray-900/80 backdrop-blur-md border-2 border-cyan-500 rounded-2xl px-4 py-3 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:bg-cyan-500 hover:border-white transition-colors active:scale-95"
          >
            <span className="text-2xl">{'npc' in interactable ? '👋' : '⚡'}</span>
            <span className="text-left">
              <span className="block text-white font-black text-sm uppercase tracking-tight leading-none">
                {'npc' in interactable ? `Talk to ${interactable.npc.name}` : `Fast travel from ${interactable.waypoint.data.name}`}
              </span>
              <span className="block text-cyan-400 font-bold text-[11px] uppercase tracking-widest mt-1">
                <span className="hidden md:inline">Press [E] or </span>Tap to interact
              </span>
            </span>
          </button>
        </div>
      )}

      {isInventoryOpen && (
        <Inventory
          characterData={player.toCharacterData()}
          onItemEquip={(idx) => { player.equipItem(idx); afterInventoryChange(); }}
          onItemUnequip={(slot) => { player.unequipItem(slot); afterInventoryChange(); }}
          toggleInventory={() => setInventoryOpen(false)}
          onInventoryMove={(from, to) => { player.moveItem(from, to); saveProgress(); refreshUi(); }}
          onToggleLock={(idx) => { player.toggleItemLock(idx); saveProgress(); refreshUi(); }}
        />
      )}

      {interactingNPC && (
        <NPCInteraction
          npc={interactingNPC}
          characterData={player.toCharacterData()}
          recipes={CRAFTING_RECIPES}
          onClose={() => setInteractingNPC(null)}
          onCraft={(recipe) => { player.craftItem(recipe); saveProgress(); refreshUi(); }}
          onSell={(_item, idx, fullStack) => { player.sellItem(idx, fullStack); saveProgress(); refreshUi(); }}
          onBuy={(item, cost) => { player.buyItem(item, cost); saveProgress(); refreshUi(); }}
          onSellByRarity={(rarity) => { player.sellUnlockedItemsByRarity(rarity); saveProgress(); refreshUi(); }}
          onTravelToWorld={handleTravelToWorld}
          bankItems={player.bank}
          onDeposit={(idx) => { player.moveItemToBank(idx); saveProgress(); refreshUi(); }}
          onWithdraw={(idx) => { player.moveItemFromBank(idx); saveProgress(); refreshUi(); }}
          onDepositGold={(amount) => { player.depositGold(amount); saveProgress(); refreshUi(); }}
          onWithdrawGold={(amount) => { player.withdrawGold(amount); saveProgress(); refreshUi(); }}
        />
      )}

      {interactingWaypoint && (
        <FastTravelUI
          discoveredWaypointIds={player.discoveredWaypoints}
          currentWaypointId={interactingWaypoint.data.id}
          onTravel={handleFastTravel}
          onClose={() => setInteractingWaypoint(null)}
        />
      )}
    </div>
  );
};

export default Game;
