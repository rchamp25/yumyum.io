
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CharacterData, GameStats, Item, ItemSlot, Recipe, Vector2D, WaypointData, ItemRarity, Difficulty, NPCType } from '../game/types';
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
import EnemyTooltip from './EnemyTooltip';
import VirtualJoystick from './VirtualJoystick';
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

const Game: React.FC<GameProps> = ({ characterData, onDeath, onReturnToSelect, userId, difficulty }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const localSpawnTimerRef = useRef(0);
  const localBossCooldownRef = useRef(0);
  const autoSaveTimerRef = useRef(0);
  
  const [player, setPlayer] = useState<Player | null>(null);
  const playerRef = useRef<Player | null>(null);
  useEffect(() => { playerRef.current = player; }, [player]);

  // Use refs for the logic-intensive parts to keep the loop stable
  const entitiesRef = useRef<{
      enemies: Enemy[];
      projectiles: Projectile[];
      floatingTexts: FloatingText[];
      visualEffects: VisualEffect[];
      groundEffects: GroundEffect[];
      droppedItems: DroppedItem[];
  }>({
      enemies: [],
      projectiles: [],
      floatingTexts: [],
      visualEffects: [],
      groundEffects: [],
      droppedItems: [],
  });

  // State is used primarily for rendering and reacting to entity changes
  const [renderEntities, setRenderEntities] = useState({
      enemies: [] as Enemy[],
      npcs: [] as NPC[],
      waypoints: [] as Waypoint[],
  });

  const [camera, setCamera] = useState({ x: 0, y: 0 });
  
  const [isInventoryOpen, setInventoryOpen] = useState(false);
  const [interactingNPC, setInteractingNPC] = useState<NPC | null>(null);
  const [interactingWaypoint, setInteractingWaypoint] = useState<Waypoint | null>(null);
  const [hoveredEnemy, setHoveredEnemy] = useState<Enemy | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{x: number, y: number}>({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const joystickVectorRef = useRef<Vector2D>({ x: 0, y: 0 });
  const pressedKeys = useKeyboardInput();

  const addProjectile = useCallback((p: Projectile) => entitiesRef.current.projectiles.push(p), []);
  const addFloatingText = useCallback((ft: FloatingText) => entitiesRef.current.floatingTexts.push(ft), []);
  const addVisualEffect = useCallback((ve: VisualEffect) => entitiesRef.current.visualEffects.push(ve), []);
  const addGroundEffect = useCallback((ge: GroundEffect) => entitiesRef.current.groundEffects.push(ge), []);

  const playSound = useCallback((type: 'attack' | 'damage' | 'hit' | 'level_up' | 'boss_spawn') => {
    // Basic oscillator sounds placeholder
  }, []);

  const isVisible = (pos: Vector2D, radius: number = 0, buffer: number = 250) => {
      const cvsWidth = window.innerWidth;
      const cvsHeight = window.innerHeight;
      return pos.x + radius + buffer > camera.x &&
             pos.x - radius - buffer < camera.x + cvsWidth &&
             pos.y + radius + buffer > camera.y &&
             pos.y - radius - buffer < camera.y + cvsHeight;
  };

  const generateEnemyPack = useCallback((worldId: string): Enemy[] => {
        let attempts = 0;
        let packCenter = { x: 0, y: 0 };
        let validPosition = false;

        while(!validPosition && attempts < 15) {
            attempts++;
            const randX = Math.random() * (GAME_CONFIG.WORLD_WIDTH - 200) + 100;
            const randY = Math.random() * (GAME_CONFIG.WORLD_HEIGHT - 200) + 100;
            const testPos = { x: randX, y: randY };
            
            // Check Safe Zone
            if (getDistance(testPos, {x: GAME_CONFIG.WORLD_WIDTH/2, y: GAME_CONFIG.WORLD_HEIGHT/2}) < GAME_CONFIG.SAFE_ZONE_RADIUS + 100) continue;
            
            // Check Boss Zones
            let inBossZone = false;
            for (const zone of BOSS_ZONES) {
                if (getDistance(testPos, {x: zone.x, y: zone.y}) < BOSS_CONFIG.ZONE_RADIUS) {
                    inBossZone = true;
                    break;
                }
            }
            if (!inBossZone) { packCenter = testPos; validPosition = true; }
        }
        if (!validPosition) return [];

        let level = 1;
        const distFromCenter = getDistance(packCenter, { x: GAME_CONFIG.WORLD_WIDTH/2, y: GAME_CONFIG.WORLD_HEIGHT/2 });
        const safeZone = GAME_CONFIG.SAFE_ZONE_RADIUS;
        const maxDist = Math.max(GAME_CONFIG.WORLD_WIDTH/2, GAME_CONFIG.WORLD_HEIGHT/2) - 100;
        const progress = Math.max(0, (distFromCenter - safeZone) / (maxDist - safeZone));
        level = Math.floor(1 + progress * (GAME_CONFIG.MAX_LEVEL - 1));
        level = Math.min(GAME_CONFIG.MAX_LEVEL, Math.max(1, level));

        const typeKeys = worldId === WORLD_IDS.WORLD_2 ? Object.keys(GROVE_ENEMIES) : Object.keys(ENEMY_TYPES);
        const typeId = typeKeys[Math.floor(Math.random() * typeKeys.length)];
        const pack: Enemy[] = [];
        const packSize = Math.floor(Math.random() * 3) + 3;
        for(let i=0; i<packSize; i++) {
            const offset = { x: (Math.random()-0.5)*120, y: (Math.random()-0.5)*120 };
            pack.push(new Enemy({ x: packCenter.x + offset.x, y: packCenter.y + offset.y }, level, undefined, `local_${Date.now()}_${Math.random()}`, typeId));
        }
        return pack;
  }, []);

  const triggerCloudSave = useCallback(async () => {
    if (!playerRef.current || isSaving) return;
    setIsSaving(true);
    try {
        await storageService.saveCharacter(userId, playerRef.current.toCharacterData());
        setTimeout(() => setIsSaving(false), 2000);
    } catch (e) {
        console.error("Save failed", e);
        setIsSaving(false);
    }
  }, [userId, isSaving]);

  const initializeGame = useCallback((updatedCharData: CharacterData) => {
      const newPlayer = new Player(updatedCharData);
      newPlayer.setInvulnerable(3000);
      setPlayer(newPlayer);
      setCamera({ x: newPlayer.position.x, y: newPlayer.position.y });
      
      const cx = GAME_CONFIG.WORLD_WIDTH / 2;
      const cy = GAME_CONFIG.WORLD_HEIGHT / 2;
      
      setRenderEntities({
          enemies: [],
          npcs: [
            new NPC({ x: cx + 150, y: cy }, 'Thomas', NPCType.Crafter),
            new NPC({ x: cx - 150, y: cy }, 'Trevor', NPCType.Vendor),
            new NPC({ x: cx, y: cy - 150 }, 'Jackson', NPCType.Seller),
            new NPC({ x: cx, y: cy + 150 }, 'Rory', NPCType.WorldTraveler),
            new NPC({ x: cx - 150, y: cy + 150 }, 'Vault Master', NPCType.Banker),
          ],
          waypoints: WAYPOINTS.map(data => new Waypoint(data)),
      });
      
      entitiesRef.current = {
          enemies: [],
          projectiles: [],
          floatingTexts: [],
          visualEffects: [],
          groundEffects: [],
          droppedItems: [],
      };
  }, []);

  useEffect(() => { initializeGame(characterData); }, [characterData, initializeGame]);

  const gameLoop = useCallback(() => {
    const curPlayer = playerRef.current;
    if (!curPlayer || curPlayer.isDead) return;
    
    const eRef = entitiesRef.current;

    // Spawning logic
    localSpawnTimerRef.current++;
    if (localSpawnTimerRef.current > 60) {
         if (eRef.enemies.length < GAME_CONFIG.MAX_ENEMIES) {
             const newPack = generateEnemyPack(curPlayer.currentWorldId);
             eRef.enemies.push(...newPack);
         }
         localSpawnTimerRef.current = 0;
    }

    // Auto-save logic
    autoSaveTimerRef.current++;
    if (autoSaveTimerRef.current > 1800) {
        triggerCloudSave();
        autoSaveTimerRef.current = 0;
    }

    const gameContext = { 
        player: curPlayer, 
        enemies: eRef.enemies, 
        addProjectile, 
        addFloatingText, 
        addVisualEffect, 
        addGroundEffect, 
        playSound, 
        isOnlineMode: false 
    };

    curPlayer.update(pressedKeys, gameContext, joystickVectorRef.current);
    
    // Waypoint unlocking
    renderEntities.waypoints.forEach(wp => {
        if (getDistance(curPlayer.position, wp.data.position) < wp.unlockRadius) {
            if (curPlayer.discoverWaypoint(wp.data.id)) {
                 addFloatingText(new FloatingText("Waypoint Unlocked!", { x: curPlayer.position.x, y: curPlayer.position.y - 50 }, '#22d3ee'));
                 triggerCloudSave();
            }
        }
    });

    // Update Entities
    eRef.enemies.forEach(e => e.update(gameContext));
    eRef.projectiles.forEach(p => p.update());
    eRef.floatingTexts.forEach(ft => ft.update());
    eRef.visualEffects.forEach(ve => ve.update());
    eRef.groundEffects.forEach(ge => ge.update(eRef.enemies, gameContext));
    eRef.droppedItems.forEach(di => di.update(curPlayer));

    // Projectile Collisions
    eRef.projectiles.forEach(p => {
        if (p.ownerId === curPlayer.id) { 
            for (const enemy of eRef.enemies) {
                if (!enemy.isDead && getDistance(p.position, enemy.position) < p.radius + enemy.radius) {
                    p.onHit(enemy, gameContext);
                    if (!p.piercing && p.bounces <= 0) p.expire();
                }
            }
        }
    });

    // Handle Death and Loot
    eRef.enemies.forEach(enemy => {
        if (enemy.health <= 0 && !enemy.isDead) {
            enemy.isDead = true;
            if (!enemy.xpGiven) {
                enemy.xpGiven = true;
                curPlayer.gainXP(enemy.xpValue, addFloatingText, enemy.level);
                curPlayer.gainGold(enemy.goldValue, addFloatingText);
                curPlayer.kills++;
                const drops = enemy.dropLoot(curPlayer);
                eRef.droppedItems.push(...drops);
            }
        }
    });

    // Item Pickup
    eRef.droppedItems = eRef.droppedItems.filter(di => {
        if(getDistance(di.position, curPlayer.position) < curPlayer.radius) {
            if (curPlayer.pickupItem(di.item)) {
                addFloatingText(new FloatingText(`+ ${di.item.name}`, curPlayer.position, '#ffd700'));
                return false;
            }
        }
        return true;
    });

    // Filter Expired
    eRef.enemies = eRef.enemies.filter(e => !e.isDead || (Date.now() - e.hitFlashTimer < 100));
    eRef.projectiles = eRef.projectiles.filter(p => !p.isExpired());
    eRef.floatingTexts = eRef.floatingTexts.filter(ft => !ft.isExpired());
    eRef.visualEffects = eRef.visualEffects.filter(ve => !ve.isExpired());
    eRef.groundEffects = eRef.groundEffects.filter(ge => !ge.isExpired());

    // Death Check
    if (curPlayer.health <= 0) {
        onDeath({
            killerName: curPlayer.lastDamagedBy || 'Wild Monster',
            level: curPlayer.level,
            kills: curPlayer.kills,
            gold: curPlayer.gold,
            totalDamageTaken: curPlayer.totalDamageTaken,
            deathLog: curPlayer.deathLog,
        }, curPlayer.toCharacterData());
        return;
    }

    // Sync state for rendering
    setRenderEntities(prev => ({
        ...prev,
        enemies: [...eRef.enemies]
    }));

    const canvas = canvasRef.current;
    if (canvas) {
        const targetX = curPlayer.position.x - canvas.width / 2;
        const targetY = curPlayer.position.y - canvas.height / 2;
        setCamera(prev => ({ 
            x: prev.x + (targetX - prev.x) * 0.1, 
            y: prev.y + (targetY - prev.y) * 0.1 
        }));
    }
  }, [addFloatingText, addProjectile, addVisualEffect, addGroundEffect, generateEnemyPack, onDeath, playSound, triggerCloudSave, pressedKeys, renderEntities.waypoints]);

  useGameLoop(gameLoop);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const worldX = (e.clientX - rect.left) + camera.x;
    const worldY = (e.clientY - rect.top) + camera.y;
    const target = renderEntities.enemies.find(enemy => !enemy.isDead && getDistance({ x: worldX, y: worldY }, enemy.position) <= enemy.radius + 15);
    setHoveredEnemy(target || null);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const saveAndTravel = async (worldId: string) => {
      const curPlayer = playerRef.current;
      if (!curPlayer) return;
      const data = curPlayer.toCharacterData();
      data.currentWorldId = worldId;
      data.position = { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 };
      await storageService.saveCharacter(userId, data);
      window.location.reload(); 
  };

  const handleInteraction = useCallback(() => {
    const curPlayer = playerRef.current;
    if (!curPlayer) return;
    const nearbyNPC = renderEntities.npcs.find(n => getDistance(curPlayer.position, n.position) < n.interactionRadius);
    const nearbyWP = renderEntities.waypoints.find(w => getDistance(curPlayer.position, w.data.position) < w.interactionRadius && curPlayer.discoveredWaypoints?.includes(w.data.id));
    if (nearbyNPC) setInteractingNPC(nearbyNPC);
    else if (nearbyWP) setInteractingWaypoint(nearbyWP);
  }, [renderEntities.npcs, renderEntities.waypoints]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const curPlayer = playerRef.current;
        const key = e.key.toLowerCase();
        if (key === 'escape') { setInventoryOpen(false); setInteractingNPC(null); setInteractingWaypoint(null); }
        if (key === 'i' || key === 'c') setInventoryOpen(p => !p);
        if (key === 'e') handleInteraction();
        if (['1', '2', '3', '4', '5'].includes(key) && curPlayer) {
            const gameContext = { 
                player: curPlayer, 
                enemies: entitiesRef.current.enemies, 
                addProjectile, addFloatingText, addVisualEffect, addGroundEffect, 
                playSound, isOnlineMode: false 
            };
            curPlayer.useSkill(parseInt(key) - 1, gameContext);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInteraction, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const curPlayer = playerRef.current;
    if (!ctx || !canvas || !curPlayer) return;

    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;
    
    const world = WORLD_CONFIGS[curPlayer.currentWorldId as keyof typeof WORLD_CONFIGS] || WORLD_CONFIGS[WORLD_IDS.WORLD_1];
    
    ctx.fillStyle = world.bgColor; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save(); 
    ctx.translate(-camera.x, -camera.y);
    
    // Draw grid
    ctx.strokeStyle = world.gridColor; 
    ctx.lineWidth = 1;
    for(let x = 0; x <= GAME_CONFIG.WORLD_WIDTH; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GAME_CONFIG.WORLD_HEIGHT); ctx.stroke(); }
    for(let y = 0; y <= GAME_CONFIG.WORLD_HEIGHT; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_CONFIG.WORLD_WIDTH, y); ctx.stroke(); }

    // DRAW SAFE ZONE RING
    const cx = GAME_CONFIG.WORLD_WIDTH / 2;
    const cy = GAME_CONFIG.WORLD_HEIGHT / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, GAME_CONFIG.SAFE_ZONE_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(20, 184, 166, 0.4)';
    ctx.lineWidth = 6;
    ctx.setLineDash([15, 10]); // Dashed line for magic feel
    ctx.stroke();
    ctx.setLineDash([]); // Reset
    
    ctx.fillStyle = 'rgba(20, 184, 166, 0.05)';
    ctx.fill();

    // Draw entities
    const eRef = entitiesRef.current;
    eRef.groundEffects.forEach(ge => ge.draw(ctx));
    renderEntities.waypoints.forEach(wp => wp.draw(ctx, curPlayer.discoveredWaypoints?.includes(wp.data.id) || false));
    eRef.droppedItems.forEach(di => isVisible(di.position) && di.draw(ctx));
    renderEntities.npcs.forEach(npc => npc.draw(ctx));
    renderEntities.enemies.forEach(e => isVisible(e.position, e.radius) && e.draw(ctx));
    
    curPlayer.draw(ctx);
    
    eRef.projectiles.forEach(p => isVisible(p.position) && p.draw(ctx));
    eRef.visualEffects.forEach(ve => isVisible(ve.position) && ve.draw(ctx));
    eRef.floatingTexts.forEach(ft => ft.draw(ctx));
    
    ctx.restore();
  }, [camera, renderEntities]);

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-gray-950">
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" onMouseMove={handleMouseMove} />
      <VirtualJoystick onMove={(v) => joystickVectorRef.current = v} />
      <HUD 
        player={player} 
        enemies={renderEntities.enemies} 
        npcs={renderEntities.npcs} 
        waypoints={renderEntities.waypoints} 
        toggleInventory={() => setInventoryOpen(p => !p)} 
        isInventoryOpen={isInventoryOpen} 
        otherPlayers={[]} 
        isSaving={isSaving} 
        onUseSkill={(i) => {
            if (player) {
                const gameContext = { 
                    player, enemies: entitiesRef.current.enemies, 
                    addProjectile, addFloatingText, addVisualEffect, addGroundEffect, 
                    playSound, isOnlineMode: false 
                };
                player.useSkill(i, gameContext);
            }
        }} 
      />
      {hoveredEnemy && <EnemyTooltip enemy={hoveredEnemy} position={tooltipPos} />}
      {isInventoryOpen && player && <Inventory characterData={player.toCharacterData()} onItemEquip={(i) => { player.equipItem(i); triggerCloudSave(); }} onItemUnequip={(s) => { player.unequipItem(s); triggerCloudSave(); }} toggleInventory={() => setInventoryOpen(false)} onInventoryMove={(f,t) => player.moveItem(f,t)} onToggleLock={(i) => player.toggleItemLock(i)} />}
      {interactingNPC && player && <NPCInteraction 
        npc={interactingNPC} 
        characterData={player.toCharacterData()} 
        recipes={CRAFTING_RECIPES} 
        onClose={() => setInteractingNPC(null)} 
        onCraft={(r) => { player.craftItem(r); triggerCloudSave(); }} 
        onSell={(_item, idx, stack) => { player.sellItem(idx, stack); triggerCloudSave(); }} 
        onBuy={(item, cost) => { player.buyItem(item, cost); triggerCloudSave(); }} 
        onSellByRarity={(rarity) => { player.sellUnlockedItemsByRarity(rarity); triggerCloudSave(); }}
        onTravelToWorld={saveAndTravel} 
        bankItems={player.bank} 
        onDeposit={(i) => { player.moveItemToBank(i); triggerCloudSave(); }} 
        onWithdraw={(i) => { player.moveItemFromBank(i); triggerCloudSave(); }} 
        onDepositGold={(a) => { player.depositGold(a); triggerCloudSave(); }}
        onWithdrawGold={(a) => { player.withdrawGold(a); triggerCloudSave(); }}
      />}
    </div>
  );
};

export default Game;
