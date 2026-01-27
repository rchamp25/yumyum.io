
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CharacterData, GameStats, Vector2D, NPCType, Difficulty } from '../game/types';
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
import EnemyTooltip from './EnemyTooltip';
import VirtualJoystick from './VirtualJoystick';
import { storageService } from '../services/storage';

interface GameProps {
  characterData: CharacterData;
  onDeath: (stats: GameStats, finalCharacterData: CharacterData) => void | Promise<void>;
  onReturnToSelect: (finalCharacterData: CharacterData) => void | Promise<void>;
  isOnlineMode: boolean;
  isDevMode: boolean;
  userId: string;
  difficulty: Difficulty;
}

const Game: React.FC<GameProps> = ({ 
  characterData, 
  onDeath, 
  onReturnToSelect, 
  isOnlineMode, 
  userId, 
  difficulty 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const localSpawnTimerRef = useRef(0);
  const autoSaveTimerRef = useRef(0);
  
  const [player, setPlayer] = useState<Player | null>(null);
  const playerRef = useRef<Player | null>(null);
  useEffect(() => { playerRef.current = player; }, [player]);

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
  const [hoveredEnemy, setHoveredEnemy] = useState<Enemy | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{x: number, y: number}>({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const joystickVectorRef = useRef<Vector2D>({ x: 0, y: 0 });
  const pressedKeys = useKeyboardInput();

  const addProjectile = useCallback((p: Projectile) => setProjectiles(prev => [...prev, p]), []);
  const addFloatingText = useCallback((ft: FloatingText) => setFloatingTexts(prev => [...prev, ft]), []);
  const addVisualEffect = useCallback((ve: VisualEffect) => setVisualEffects(prev => [...prev, ve]), []);
  const addGroundEffect = useCallback((ge: GroundEffect) => setGroundEffects(prev => [...prev, ge]), []);

  const playSound = useCallback((_type: 'attack' | 'damage' | 'hit' | 'level_up' | 'boss_spawn') => {
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
            if (getDistance(testPos, {x: GAME_CONFIG.WORLD_WIDTH/2, y: GAME_CONFIG.WORLD_HEIGHT/2}) < GAME_CONFIG.SAFE_ZONE_RADIUS + 100) continue;
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

  const spawnLocalEnemies = useCallback((worldId: string) => {
      setEnemies(prev => {
          if (prev.length >= GAME_CONFIG.MAX_ENEMIES) return prev; 
          const needed = GAME_CONFIG.MAX_ENEMIES - prev.length;
          const packsNeeded = Math.min(Math.ceil(needed / 4), 10);
          const newEnemies: Enemy[] = [];
          for(let i=0; i<packsNeeded; i++) newEnemies.push(...generateEnemyPack(worldId));
          return [...prev, ...newEnemies];
      });
  }, [generateEnemyPack]);

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
      if (difficulty === Difficulty.Insane) {
          newPlayer.applyInsaneModeNerfs();
      }
      newPlayer.setInvulnerable(3000);
      setPlayer(newPlayer);
      setCamera({ x: newPlayer.position.x, y: newPlayer.position.y });
      const cx = GAME_CONFIG.WORLD_WIDTH / 2;
      const cy = GAME_CONFIG.WORLD_HEIGHT / 2;
      setNpcs([
        new NPC({ x: cx + 150, y: cy }, 'Thomas', NPCType.Crafter),
        new NPC({ x: cx - 150, y: cy }, 'Trevor', NPCType.Vendor),
        new NPC({ x: cx, y: cy - 150 }, 'Jackson', NPCType.Seller),
        new NPC({ x: cx, y: cy + 150 }, 'Rory', NPCType.WorldTraveler),
        new NPC({ x: cx - 150, y: cy + 150 }, 'Vault Master', NPCType.Banker),
      ]);
      setWaypoints(WAYPOINTS.map(data => new Waypoint(data)));
      setEnemies([]);
      setDroppedItems([]);
  }, [difficulty]);

  useEffect(() => { initializeGame(characterData); }, [characterData, initializeGame]);

  const gameLoop = useCallback(() => {
    if (!player || player.isDead) return;
    
    localSpawnTimerRef.current++;
    if (localSpawnTimerRef.current > 60) {
         spawnLocalEnemies(player.currentWorldId);
         localSpawnTimerRef.current = 0;
    }

    autoSaveTimerRef.current++;
    if (autoSaveTimerRef.current > 1800) {
        triggerCloudSave();
        autoSaveTimerRef.current = 0;
    }

    const gameContext = { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode };
    player.update(pressedKeys, gameContext, joystickVectorRef.current);
    
    waypoints.forEach(wp => {
        if (getDistance(player.position, wp.data.position) < wp.unlockRadius) {
            if (player.discoverWaypoint(wp.data.id)) {
                 addFloatingText(new FloatingText("Waypoint Unlocked!", { x: player.position.x, y: player.position.y - 50 }, '#22d3ee'));
                 triggerCloudSave();
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
        if (p.ownerId === player.id) { 
            for (const enemy of updatedEnemies) {
                if (!enemy.isDead && getDistance(p.position, enemy.position) < p.radius + enemy.radius) {
                    p.onHit(enemy, gameContext);
                    if (!p.piercing && p.bounces <= 0) p.expire();
                }
            }
        }
    });

    const frameDrops: DroppedItem[] = [];
    updatedEnemies.forEach(enemy => {
        if (enemy.health <= 0 && !enemy.isDead) {
            enemy.isDead = true;
            if (!enemy.xpGiven) {
                enemy.xpGiven = true;
                player.gainXP(enemy.xpValue, addFloatingText, enemy.level);
                player.gainGold(enemy.goldValue, addFloatingText);
                player.kills++;
                const drops = enemy.dropLoot(player);
                drops.forEach(d => frameDrops.push(d));
            }
        }
    });

    const remainingItems: DroppedItem[] = [];
    droppedItems.forEach(di => {
        if(getDistance(di.position, player.position) < player.radius) {
            if (player.pickupItem(di.item)) addFloatingText(new FloatingText(`+ ${di.item.name}`, player.position, '#ffd700'));
            else remainingItems.push(di);
        } else remainingItems.push(di);
    });

    if (frameDrops.length > 0 || remainingItems.length !== droppedItems.length) {
        setDroppedItems([...remainingItems, ...frameDrops]);
    }

    setEnemies(updatedEnemies.filter(e => !e.isDead || (Date.now() - e.hitFlashTimer < 100)));
    setProjectiles(prev => prev.filter(p => !p.isExpired()));
    setFloatingTexts(prev => prev.filter(ft => !ft.isExpired()));
    setVisualEffects(prev => prev.filter(ve => !ve.isExpired()));
    setGroundEffects(prev => prev.filter(ge => !ge.isExpired()));

    if (player.health <= 0) {
        onDeath({
            killerName: player.lastDamagedBy || 'Wild Monster',
            level: player.level,
            kills: player.kills,
            gold: player.gold,
            totalDamageTaken: player.totalDamageTaken,
            deathLog: player.deathLog,
        }, player.toCharacterData());
        return;
    }

    const canvas = canvasRef.current;
    if (canvas) {
        const targetX = player.position.x - canvas.width / 2;
        const targetY = player.position.y - canvas.height / 2;
        setCamera(prev => ({ x: prev.x + (targetX - prev.x) * 0.1, y: prev.y + (targetY - prev.y) * 0.1 }));
    }
  }, [player, enemies, projectiles, floatingTexts, visualEffects, groundEffects, droppedItems, waypoints, camera, onDeath, spawnLocalEnemies, triggerCloudSave, addFloatingText, addProjectile, addVisualEffect, addGroundEffect, playSound, pressedKeys, isOnlineMode]);

  useGameLoop(gameLoop);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const worldX = (e.clientX - rect.left) + camera.x;
    const worldY = (e.clientY - rect.top) + camera.y;
    const target = enemies.find(enemy => !enemy.isDead && getDistance({ x: worldX, y: worldY }, enemy.position) <= enemy.radius + 15);
    setHoveredEnemy(target || null);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const saveAndTravel = async (worldId: string) => {
      if (!player) return;
      const data = player.toCharacterData();
      data.currentWorldId = worldId;
      data.position = { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 };
      await storageService.saveCharacter(userId, data);
      window.location.reload();
  };

  const handleInteraction = useCallback(() => {
    const nearbyNPC = player ? (npcs.find(n => getDistance(player.position, n.position) < n.interactionRadius)) : null;
    if (nearbyNPC) setInteractingNPC(nearbyNPC);
  }, [player, npcs]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (key === 'escape') { setInventoryOpen(false); setInteractingNPC(null); }
        if (key === 'i' || key === 'c') setInventoryOpen(p => !p);
        if (key === 'e') handleInteraction();
        if (key === 'q') onReturnToSelect(playerRef.current?.toCharacterData() || characterData);
        if (['1', '2', '3', '4', '5'].includes(key)) player?.useSkill(parseInt(key) - 1, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, enemies, handleInteraction, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode, onReturnToSelect, characterData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !player) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const world = WORLD_CONFIGS[player.currentWorldId] || WORLD_CONFIGS[WORLD_IDS.WORLD_1];
    ctx.fillStyle = world.bgColor; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(-camera.x, -camera.y);
    ctx.strokeStyle = world.gridColor; ctx.lineWidth = 1;
    for(let x = 0; x <= GAME_CONFIG.WORLD_WIDTH; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GAME_CONFIG.WORLD_HEIGHT); ctx.stroke(); }
    for(let y = 0; y <= GAME_CONFIG.WORLD_HEIGHT; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_CONFIG.WORLD_WIDTH, y); ctx.stroke(); }
    groundEffects.forEach(ge => ge.draw(ctx));
    waypoints.forEach(wp => wp.draw(ctx, player.discoveredWaypoints.includes(wp.data.id)));
    droppedItems.forEach(di => di.draw(ctx));
    npcs.forEach(npc => npc.draw(ctx));
    enemies.forEach(e => isVisible(e.position, e.radius) && e.draw(ctx));
    player.draw(ctx);
    projectiles.forEach(p => p.draw(ctx));
    visualEffects.forEach(ve => ve.draw(ctx));
    floatingTexts.forEach(ft => ft.draw(ctx));
    ctx.restore();
  }, [camera, player, enemies, projectiles, floatingTexts, visualEffects, groundEffects, droppedItems, waypoints, npcs]);

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-gray-950">
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" onMouseMove={handleMouseMove} />
      <VirtualJoystick onMove={(v) => joystickVectorRef.current = v} />
      <HUD player={player} enemies={enemies} npcs={npcs} waypoints={waypoints} toggleInventory={() => setInventoryOpen(p => !p)} otherPlayers={[]} isSaving={isSaving} onUseSkill={(i) => player?.useSkill(i, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode })} />
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
