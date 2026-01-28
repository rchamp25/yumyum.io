
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CharacterData, GameStats, NPCType, Difficulty } from '../game/types';
import { Player } from '../game/entities/Player';
import { Enemy } from '../game/entities/Enemy';
import { Projectile } from '../game/entities/Projectile';
import { FloatingText } from '../game/entities/FloatingText';
import { VisualEffect } from '../game/entities/VisualEffect';
import { GroundEffect } from '../game/entities/GroundEffect';
import { DroppedItem } from '../game/entities/DroppedItem';
import { NPC } from '../game/entities/NPC';
import { Waypoint } from '../game/entities/Waypoint';
import { GAME_CONFIG, WAYPOINTS, BOSS_ZONES, BOSS_CONFIG, WORLD_IDS, WORLD_CONFIGS, ENEMY_TYPES, GROVE_ENEMIES, INTEREST_ZONES } from '../game/constants';
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
  isDevMode: boolean;
  userId: string;
  difficulty: Difficulty;
}

const Game: React.FC<GameProps> = ({ 
  characterData, 
  onDeath, 
  onReturnToSelect, 
  userId, 
  difficulty 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // --- MASTER ENGINE REFS ---
  const playerRef = useRef<Player | null>(null);
  const entitiesRef = useRef({
      enemies: [] as Enemy[],
      projectiles: [] as Projectile[],
      floatingTexts: [] as FloatingText[],
      visualEffects: [] as VisualEffect[],
      groundEffects: [] as GroundEffect[],
      droppedItems: [] as DroppedItem[],
      npcs: [] as NPC[],
      waypoints: [] as Waypoint[]
  });
  const engineTimers = useRef({
      spawn: 0,
      save: 0,
      frame: 0
  });
  const cameraRef = useRef({ x: 0, y: 0 });
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const joystickVectorRef = useRef({ x: 0, y: 0 });

  // --- REACT UI STATE ---
  const [isInventoryOpen, setInventoryOpen] = useState(false);
  const [isStatsOpen, setStatsOpen] = useState(true);
  const [interactingNPC, setInteractingNPC] = useState<NPC | null>(null);
  const [hoveredEnemy, setHoveredEnemy] = useState<Enemy | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [, setTick] = useState(0); // Force UI updates

  // Helper for triggering cloud saves
  const triggerCloudSave = useCallback(async () => {
    if (!playerRef.current || isSaving) return;
    setIsSaving(true);
    try {
        await storageService.saveCharacter(userId, playerRef.current.toCharacterData());
        setTimeout(() => setIsSaving(false), 2000);
    } catch (e) {
        setIsSaving(false);
    }
  }, [userId, isSaving]);

  // Enemy generation logic - GLOBAL MAP RANDOM
  const generateEnemyPack = (worldId: string): Enemy[] => {
    let attempts = 0;
    let packCenter = { x: 0, y: 0 };
    let validPosition = false;

    while(!validPosition && attempts < 15) {
        attempts++;
        
        // Random position across entire map
        const randX = Math.random() * (GAME_CONFIG.WORLD_WIDTH - 200) + 100;
        const randY = Math.random() * (GAME_CONFIG.WORLD_HEIGHT - 200) + 100;
        const testPos = { x: randX, y: randY };
        
        // Don't spawn inside safe zone
        if (getDistance(testPos, {x: GAME_CONFIG.WORLD_WIDTH/2, y: GAME_CONFIG.WORLD_HEIGHT/2}) < GAME_CONFIG.SAFE_ZONE_RADIUS + 200) continue;
        
        // Don't spawn inside boss zones
        let inBossZone = false;
        for (const zone of BOSS_ZONES) {
            if (getDistance(testPos, {x: zone.x, y: zone.y}) < BOSS_CONFIG.ZONE_RADIUS + 100) {
                inBossZone = true;
                break;
            }
        }
        if (!inBossZone) { packCenter = testPos; validPosition = true; }
    }
    if (!validPosition) return [];

    // Check if spawn is in an Interest Zone
    const interestZone = INTEREST_ZONES.find(z => getDistance(packCenter, z) < z.radius);

    // Level scaling based on distance from SAFE ZONE center
    let level = 1;
    const distFromCenter = getDistance(packCenter, { x: GAME_CONFIG.WORLD_WIDTH/2, y: GAME_CONFIG.WORLD_HEIGHT/2 });
    const progress = Math.max(0, (distFromCenter - GAME_CONFIG.SAFE_ZONE_RADIUS) / (GAME_CONFIG.WORLD_WIDTH/2 - GAME_CONFIG.SAFE_ZONE_RADIUS));
    level = Math.min(GAME_CONFIG.MAX_LEVEL, Math.max(1, Math.floor(1 + progress * (GAME_CONFIG.MAX_LEVEL - 1))));

    // Determine Mob Type
    let typeId = '';
    
    if (interestZone && interestZone.mobTypes.length > 0) {
        // Force spawn zone-specific mob
        typeId = interestZone.mobTypes[Math.floor(Math.random() * interestZone.mobTypes.length)];
        // Zone mobs are stronger
        level = Math.min(GAME_CONFIG.MAX_LEVEL + 5, Math.ceil(level * interestZone.difficultyMultiplier));
    } else {
        // Standard random spawn
        const typeKeys = worldId === WORLD_IDS.WORLD_2 ? Object.keys(GROVE_ENEMIES) : Object.keys(ENEMY_TYPES).filter(k => !INTEREST_ZONES.some(z => z.mobTypes.includes(k)));
        typeId = typeKeys[Math.floor(Math.random() * typeKeys.length)];
    }

    const pack: Enemy[] = [];
    const packSize = Math.floor(Math.random() * 3) + 3;
    
    for(let i=0; i<packSize; i++) {
        const offset = { x: (Math.random()-0.5)*150, y: (Math.random()-0.5)*150 };
        const enemy = new Enemy({ x: packCenter.x + offset.x, y: packCenter.y + offset.y }, level, undefined, `mob_${Date.now()}_${Math.random()}`, typeId);
        
        // Apply zone drop bonus if applicable
        if (interestZone) {
            // We can attach a custom property or just let the level scaling handle it.
            // Since level increases loot chance, explicit property is a nice bonus.
            // Note: Enemy class doesn't store arbitrary props by default, 
            // but we rely on level for now. 
            // We could modify Enemy to accept a lootBonus, but for now the Level Boost is significant.
        }
        
        pack.push(enemy);
    }
    return pack;
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    const newPlayer = new Player(characterData);
    if (difficulty === Difficulty.Insane) newPlayer.applyInsaneModeNerfs();
    newPlayer.setInvulnerable(3000);
    playerRef.current = newPlayer;
    cameraRef.current = { x: newPlayer.position.x, y: newPlayer.position.y };

    const cx = GAME_CONFIG.WORLD_WIDTH / 2;
    const cy = GAME_CONFIG.WORLD_HEIGHT / 2;

    entitiesRef.current = {
        enemies: [],
        projectiles: [],
        floatingTexts: [],
        visualEffects: [],
        groundEffects: [],
        droppedItems: [],
        npcs: [
            new NPC({ x: cx + 150, y: cy }, 'Thomas', NPCType.Crafter),
            new NPC({ x: cx - 150, y: cy }, 'Trevor', NPCType.Vendor),
            new NPC({ x: cx, y: cy - 150 }, 'Jackson', NPCType.Seller),
            new NPC({ x: cx, y: cy + 150 }, 'Rory', NPCType.WorldTraveler),
            new NPC({ x: cx - 150, y: cy + 150 }, 'Vault Master', NPCType.Banker),
        ],
        waypoints: WAYPOINTS.map(data => new Waypoint(data))
    };

    // Populate World Immediately (Pre-spawn ~80 packs to ensure map isn't empty)
    for (let i = 0; i < 80; i++) {
        const pack = generateEnemyPack(newPlayer.currentWorldId);
        entitiesRef.current.enemies.push(...pack);
    }

    // --- MAIN ENGINE LOOP ---
    let animationFrameId: number;
    const loop = () => {
        const p = playerRef.current;
        if (!p || p.isDead) return;

        const e = entitiesRef.current;
        const ctx = {
            player: p,
            enemies: e.enemies,
            addProjectile: (proj: Projectile) => e.projectiles.push(proj),
            addFloatingText: (ft: FloatingText) => e.floatingTexts.push(ft),
            addVisualEffect: (ve: VisualEffect) => e.visualEffects.push(ve),
            addGroundEffect: (ge: GroundEffect) => e.groundEffects.push(ge),
            playSound: () => {}, // Placeholder
            isOnlineMode: false
        };

        // 1. Spawning Logic (Global Population Maintenance)
        engineTimers.current.spawn++;
        if (engineTimers.current.spawn > 20) { // Check frequently
            if (e.enemies.length < GAME_CONFIG.MAX_ENEMIES) {
                const pack = generateEnemyPack(p.currentWorldId);
                e.enemies.push(...pack);
            }

            // Ambient Particle Logic
            // Check if player is in a zone
            const zone = INTEREST_ZONES.find(z => getDistance(p.position, z) < z.radius);
            if (zone) {
                // Spawn ambient particles around player
                // Frequency depends on zone type
                let spawnChance = 0.3;
                if (zone.particleType === 'fog') spawnChance = 0.05; // Fog lasts longer
                
                if (Math.random() < spawnChance) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * 600; // Spawn within screen range
                    const pos = {
                        x: p.position.x + Math.cos(angle) * dist,
                        y: p.position.y + Math.sin(angle) * dist
                    };
                    
                    let duration = 2000;
                    let radius = 2;
                    let color = 'white';

                    if (zone.particleType === 'snow') { duration = 3000; radius = 3; }
                    else if (zone.particleType === 'ember') { duration = 1500; radius = 2; }
                    else if (zone.particleType === 'spore') { duration = 4000; radius = 2; }
                    else if (zone.particleType === 'ash') { duration = 3000; radius = 3; }
                    else if (zone.particleType === 'fog') { duration = 6000; radius = 150; color = 'rgba(200,200,200,0.1)'; }

                    e.visualEffects.push(new VisualEffect(pos, zone.particleType, duration, { radius, color }));
                }
            }

            engineTimers.current.spawn = 0;
        }

        // Auto-save logic
        engineTimers.current.save++;
        if (engineTimers.current.save > 3600) { // Every ~1 minute
            triggerCloudSave();
            engineTimers.current.save = 0;
        }

        // 2. Movement & Physics
        p.update(pressedKeysRef.current, ctx, joystickVectorRef.current);
        e.enemies.forEach(mob => mob.update(ctx));
        e.projectiles.forEach(proj => proj.update());
        e.droppedItems.forEach(item => item.update(p));
        e.floatingTexts.forEach(ft => ft.update());
        e.visualEffects.forEach(ve => ve.update());
        e.groundEffects.forEach(ge => ge.update(e.enemies, ctx));

        // 3. Collision Logic (Projectiles)
        e.projectiles.forEach(proj => {
            if (proj.ownerId === p.id) {
                for (const mob of e.enemies) {
                    if (!mob.isDead && getDistance(proj.position, mob.position) < proj.radius + mob.radius) {
                        proj.onHit(mob, ctx);
                        if (!proj.piercing && proj.bounces <= 0) proj.expire();
                    }
                }
            }
        });

        // 4. Combat Results & Looting
        e.enemies.forEach(mob => {
            if (mob.health <= 0 && !mob.isDead) {
                mob.isDead = true;
                if (!mob.xpGiven) {
                    mob.xpGiven = true;
                    p.gainXP(mob.xpValue, ctx.addFloatingText, mob.level);
                    p.gainGold(mob.goldValue, ctx.addFloatingText);
                    p.kills++;
                    const drops = mob.dropLoot(p);
                    e.droppedItems.push(...drops);
                }
            }
        });

        e.droppedItems = e.droppedItems.filter(item => {
            if (getDistance(item.position, p.position) < p.radius + 30) {
                if (p.pickupItem(item.item)) {
                    ctx.addFloatingText(new FloatingText(`+ ${item.item.name}`, p.position, '#ffd700'));
                    return false;
                }
            }
            return true;
        });

        // 5. Cleanup
        e.enemies = e.enemies.filter(mob => !mob.isDead || (Date.now() - mob.hitFlashTimer < 100));
        e.projectiles = e.projectiles.filter(proj => !proj.isExpired());
        e.floatingTexts = e.floatingTexts.filter(ft => !ft.isExpired());
        e.visualEffects = e.visualEffects.filter(ve => !ve.isExpired());
        e.groundEffects = e.groundEffects.filter(ge => !ge.isExpired());

        // 6. State Check
        if (p.health <= 0) {
            onDeath({
                killerName: p.lastDamagedBy || 'Monster',
                level: p.level,
                kills: p.kills,
                gold: p.gold,
                totalDamageTaken: p.totalDamageTaken,
                deathLog: p.deathLog,
            }, p.toCharacterData());
            return;
        }

        // 7. Sync Camera
        if (canvasRef.current) {
            const targetX = p.position.x - canvasRef.current.width / 2;
            const targetY = p.position.y - canvasRef.current.height / 2;
            cameraRef.current.x += (targetX - cameraRef.current.x) * 0.1;
            cameraRef.current.y += (targetY - cameraRef.current.y) * 0.1;
        }

        // 8. Draw Frame
        const canvas = canvasRef.current;
        const drawCtx = canvas?.getContext('2d');
        if (drawCtx && canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const world = WORLD_CONFIGS[p.currentWorldId as keyof typeof WORLD_CONFIGS] || WORLD_CONFIGS[WORLD_IDS.WORLD_1];
            
            drawCtx.fillStyle = world.bgColor;
            drawCtx.fillRect(0, 0, canvas.width, canvas.height);
            
            drawCtx.save();
            drawCtx.translate(-cameraRef.current.x, -cameraRef.current.y);
            
            // Draw Interest Zones (Ground Visuals)
            INTEREST_ZONES.forEach(zone => {
                const grad = drawCtx.createRadialGradient(zone.x, zone.y, zone.radius * 0.2, zone.x, zone.y, zone.radius);
                grad.addColorStop(0, zone.color);
                grad.addColorStop(0.7, zone.color);
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                
                drawCtx.fillStyle = grad;
                drawCtx.beginPath();
                drawCtx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
                drawCtx.fill();
            });

            // Grid
            drawCtx.strokeStyle = world.gridColor; drawCtx.lineWidth = 1;
            for(let x = 0; x <= GAME_CONFIG.WORLD_WIDTH; x += 150) { drawCtx.beginPath(); drawCtx.moveTo(x, 0); drawCtx.lineTo(x, GAME_CONFIG.WORLD_HEIGHT); drawCtx.stroke(); }
            for(let y = 0; y <= GAME_CONFIG.WORLD_HEIGHT; y += 150) { drawCtx.beginPath(); drawCtx.moveTo(0, y); drawCtx.lineTo(GAME_CONFIG.WORLD_WIDTH, y); drawCtx.stroke(); }

            // Safe Zone Ring
            const cx = GAME_CONFIG.WORLD_WIDTH / 2; const cy = GAME_CONFIG.WORLD_HEIGHT / 2;
            drawCtx.beginPath(); drawCtx.arc(cx, cy, GAME_CONFIG.SAFE_ZONE_RADIUS, 0, Math.PI * 2);
            drawCtx.strokeStyle = 'rgba(20, 184, 166, 0.4)'; drawCtx.lineWidth = 6; drawCtx.setLineDash([15, 10]); drawCtx.stroke(); drawCtx.setLineDash([]);
            drawCtx.fillStyle = 'rgba(20, 184, 166, 0.05)'; drawCtx.fill();

            // Entities
            e.groundEffects.forEach(ge => ge.draw(drawCtx));
            e.waypoints.forEach(wp => wp.draw(drawCtx, p.discoveredWaypoints.includes(wp.data.id)));
            e.droppedItems.forEach(di => di.draw(drawCtx));
            e.npcs.forEach(npc => npc.draw(drawCtx));
            e.enemies.forEach(mob => mob.draw(drawCtx));
            p.draw(drawCtx);
            e.projectiles.forEach(proj => proj.draw(drawCtx));
            e.visualEffects.forEach(ve => ve.draw(drawCtx));
            e.floatingTexts.forEach(ft => ft.draw(drawCtx));

            drawCtx.restore();
        }

        // 9. Sync UI (Throttled to 10hz for performance)
        engineTimers.current.frame++;
        if (engineTimers.current.frame % 6 === 0) setTick(t => t + 1);

        animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Interaction Handler
  const handleInteraction = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    const nearbyNPC = entitiesRef.current.npcs.find(n => getDistance(p.position, n.position) < n.interactionRadius + 20);
    if (nearbyNPC) setInteractingNPC(nearbyNPC);
  }, []);

  // Keyboard Management
  useEffect(() => {
    const handleKeyDown = (ev: KeyboardEvent) => {
        const key = ev.key.toLowerCase();
        pressedKeysRef.current.add(key);
        if (key === 'escape') { setInventoryOpen(false); setInteractingNPC(null); }
        if (key === 'i') setInventoryOpen(prev => !prev);
        if (key === 'c') setStatsOpen(prev => !prev);
        if (key === 'e') handleInteraction();
        if (key === 'q') onReturnToSelect(playerRef.current?.toCharacterData() || characterData);
        if (['1', '2', '3', '4', '5'].includes(key) && playerRef.current) {
            const p = playerRef.current;
            const e = entitiesRef.current;
            const ctx = {
                player: p, enemies: e.enemies,
                addProjectile: (proj: Projectile) => e.projectiles.push(proj),
                addFloatingText: (ft: FloatingText) => e.floatingTexts.push(ft),
                addVisualEffect: (ve: VisualEffect) => e.visualEffects.push(ve),
                addGroundEffect: (ge: GroundEffect) => e.groundEffects.push(ge),
                playSound: () => {}, isOnlineMode: false
            };
            p.useSkill(parseInt(key) - 1, ctx);
        }
    };
    const handleKeyUp = (ev: KeyboardEvent) => pressedKeysRef.current.delete(ev.key.toLowerCase());
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [handleInteraction, onReturnToSelect, characterData]);

  // World Travel Logic
  const saveAndTravel = async (worldId: string) => {
    const p = playerRef.current;
    if (!p) return;
    const data = p.toCharacterData();
    data.currentWorldId = worldId;
    data.position = { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 };
    await storageService.saveCharacter(userId, data);
    window.location.reload(); 
  };

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-gray-950">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full cursor-crosshair" 
        onMouseMove={(ev) => {
            const p = playerRef.current;
            if (!p) return;
            const rect = canvasRef.current!.getBoundingClientRect();
            const worldX = (ev.clientX - rect.left) + cameraRef.current.x;
            const worldY = (ev.clientY - rect.top) + cameraRef.current.y;
            const target = entitiesRef.current.enemies.find(mob => !mob.isDead && getDistance({ x: worldX, y: worldY }, mob.position) <= mob.radius + 15);
            setHoveredEnemy(target || null);
            setTooltipPos({ x: ev.clientX, y: ev.clientY });
        }}
      />
      <VirtualJoystick onMove={(v) => joystickVectorRef.current = v} />
      
      <HUD 
        player={playerRef.current} 
        enemies={entitiesRef.current.enemies} 
        npcs={entitiesRef.current.npcs} 
        waypoints={entitiesRef.current.waypoints} 
        toggleInventory={() => setInventoryOpen(p => !p)} 
        otherPlayers={[]} 
        isSaving={isSaving} 
        isStatsOpen={isStatsOpen}
        onUseSkill={(i) => {
            const p = playerRef.current;
            if (!p) return;
            const e = entitiesRef.current;
            const ctx = {
                player: p, enemies: e.enemies,
                addProjectile: (proj: Projectile) => e.projectiles.push(proj),
                addFloatingText: (ft: FloatingText) => e.floatingTexts.push(ft),
                addVisualEffect: (ve: VisualEffect) => e.visualEffects.push(ve),
                addGroundEffect: (ge: GroundEffect) => e.groundEffects.push(ge),
                playSound: () => {}, isOnlineMode: false
            };
            p.useSkill(i, ctx);
        }} 
      />

      {hoveredEnemy && <EnemyTooltip enemy={hoveredEnemy} position={tooltipPos} />}
      
      {isInventoryOpen && playerRef.current && (
        <Inventory 
            characterData={playerRef.current.toCharacterData()} 
            onItemEquip={(idx) => { playerRef.current?.equipItem(idx); triggerCloudSave(); }} 
            onItemUnequip={(slot) => { playerRef.current?.unequipItem(slot); triggerCloudSave(); }} 
            toggleInventory={() => setInventoryOpen(false)} 
            onInventoryMove={(f,t) => playerRef.current?.moveItem(f,t)} 
            onToggleLock={(idx) => playerRef.current?.toggleItemLock(idx)} 
        />
      )}

      {interactingNPC && playerRef.current && (
        <NPCInteraction 
          npc={interactingNPC} 
          characterData={playerRef.current.toCharacterData()} 
          recipes={CRAFTING_RECIPES} 
          onClose={() => setInteractingNPC(null)} 
          onCraft={(r) => { playerRef.current?.craftItem(r); triggerCloudSave(); }} 
          onSell={(_item, idx, stack) => { playerRef.current?.sellItem(idx, stack); triggerCloudSave(); }} 
          onBuy={(item, cost) => { playerRef.current?.buyItem(item, cost); triggerCloudSave(); }} 
          onSellByRarity={(rarity) => { playerRef.current?.sellUnlockedItemsByRarity(rarity); triggerCloudSave(); }}
          onTravelToWorld={saveAndTravel} 
          bankItems={playerRef.current.bank} 
          onDeposit={(idx) => { playerRef.current?.moveItemToBank(idx); triggerCloudSave(); }} 
          onWithdraw={(idx) => { playerRef.current?.moveItemFromBank(idx); triggerCloudSave(); }} 
          onDepositGold={(amt) => { playerRef.current?.depositGold(amt); triggerCloudSave(); }}
          onWithdrawGold={(amt) => { playerRef.current?.withdrawGold(amt); triggerCloudSave(); }}
        />
      )}
    </div>
  );
};

export default Game;
