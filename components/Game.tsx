
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CharacterData, GameStats, Item, ItemSlot, Recipe, Vector2D, WaypointData } from '../game/types';
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
import { GAME_CONFIG, WAYPOINTS } from '../game/constants';
import { getDistance } from '../game/utils';
import { CRAFTING_RECIPES } from '../game/items';
import HUD from './HUD';
import Inventory from './Inventory';
import NPCInteraction from './NPCInteraction';
import FastTravelUI from './FastTravelUI';

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

  // Initialize game
  useEffect(() => {
    const newPlayer = new Player(characterData);
    setPlayer(newPlayer);
    setCamera({ x: newPlayer.position.x, y: newPlayer.position.y });

    // Spawn initial NPCs
    setNpcs([
        new NPC({ x: GAME_CONFIG.WORLD_WIDTH / 2 + 100, y: GAME_CONFIG.WORLD_HEIGHT / 2 }, 'Thomas', NPCType.Crafter),
        new NPC({ x: GAME_CONFIG.WORLD_WIDTH / 2 - 100, y: GAME_CONFIG.WORLD_HEIGHT / 2 }, 'Trevor', NPCType.Vendor),
    ]);

    // Initialize Waypoints
    setWaypoints(WAYPOINTS.map(data => new Waypoint(data)));

    // --- PRE-SPAWN ENEMIES ---
    // Populate the world immediately so it isn't empty on login
    const initialEnemies: Enemy[] = [];
    const targetInitialPopulation = Math.floor(GAME_CONFIG.MAX_ENEMIES * 0.8); // Fill to 80% capacity
    const worldCenter = { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 };
    const maxDistFromCenter = Math.max(GAME_CONFIG.WORLD_WIDTH / 2, GAME_CONFIG.WORLD_HEIGHT / 2);
    
    // Safety counter to prevent infinite loops
    let attempts = 0;
    
    while (initialEnemies.length < targetInitialPopulation && attempts < 2000) {
        attempts++;

        // 1. Pick random location
        const angle = Math.random() * Math.PI * 2;
        // Generate random distance, weighted towards the outer edges slightly more to fill the big world
        // But ensure it is outside Safe Zone
        const radius = GAME_CONFIG.SAFE_ZONE_RADIUS + Math.random() * (maxDistFromCenter - GAME_CONFIG.SAFE_ZONE_RADIUS);

        const packCenterX = worldCenter.x + Math.cos(angle) * radius;
        const packCenterY = worldCenter.y + Math.sin(angle) * radius;

        // 2. Check World Bounds
        if (packCenterX < 100 || packCenterX > GAME_CONFIG.WORLD_WIDTH - 100 || 
            packCenterY < 100 || packCenterY > GAME_CONFIG.WORLD_HEIGHT - 100) {
            continue;
        }

        // 3. Check Player Proximity (Don't spawn on top of login spot)
        if (getDistance({x: packCenterX, y: packCenterY}, newPlayer.position) < 800) {
            continue;
        }

        // 4. Determine Level based on distance
        const effectiveDist = Math.max(0, radius - GAME_CONFIG.SAFE_ZONE_RADIUS);
        const availableRange = maxDistFromCenter - GAME_CONFIG.SAFE_ZONE_RADIUS;
        const distFactor = effectiveDist / availableRange;
        
        // Map 0-1 factor to Level 1-MAX_LEVEL
        let zoneLevel = 1 + Math.floor(distFactor * (GAME_CONFIG.MAX_LEVEL - 1));
        // Add variance
        zoneLevel = Math.max(1, Math.min(GAME_CONFIG.MAX_LEVEL, zoneLevel - 2 + Math.floor(Math.random() * 5)));

        // 5. Spawn Pack
        const packSize = Math.floor(Math.random() * (GAME_CONFIG.ENEMY_PACK_SIZE_MAX - GAME_CONFIG.ENEMY_PACK_SIZE_MIN + 1)) + GAME_CONFIG.ENEMY_PACK_SIZE_MIN;

        for (let i = 0; i < packSize; i++) {
            const offsetAngle = Math.random() * Math.PI * 2;
            const offsetRadius = Math.random() * GAME_CONFIG.ENEMY_PACK_RADIUS;
            const ex = packCenterX + Math.cos(offsetAngle) * offsetRadius;
            const ey = packCenterY + Math.sin(offsetAngle) * offsetRadius;
            
            // Double check bounds for individual mob
            if (ex > 0 && ex < GAME_CONFIG.WORLD_WIDTH && ey > 0 && ey < GAME_CONFIG.WORLD_HEIGHT) {
                initialEnemies.push(new Enemy({ x: ex, y: ey }, zoneLevel));
            }
        }
    }
    setEnemies(initialEnemies);

  }, [characterData]);
  
  // Game loop
  const gameLoop = useCallback(() => {
    gameTimeRef.current++;
    if (!player || player.isDead) return;

    // Update player safe zone status
    const playerDistFromCenter = getDistance(player.position, {x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2});
    player.isInSafeZone = playerDistFromCenter <= GAME_CONFIG.SAFE_ZONE_RADIUS;
    
    const gameContext = { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect };
    
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
    projectiles.forEach(p => p.update());

    // Update effects
    floatingTexts.forEach(ft => ft.update());
    visualEffects.forEach(ve => ve.update());
    groundEffects.forEach(ge => ge.update(updatedEnemies, gameContext));
    droppedItems.forEach(di => di.update(player));

    // Spawn enemy packs
    if (gameTimeRef.current > 200 && gameTimeRef.current % 300 === 0 && updatedEnemies.filter(e => !e.isDead).length < GAME_CONFIG.MAX_ENEMIES) {
        const packSize = Math.floor(Math.random() * (GAME_CONFIG.ENEMY_PACK_SIZE_MAX - GAME_CONFIG.ENEMY_PACK_SIZE_MIN + 1)) + GAME_CONFIG.ENEMY_PACK_SIZE_MIN;
        
        let packCenterX = 0;
        let packCenterY = 0;
        let validSpawn = false;
        let attempts = 0;
        const minSpawnDistance = 800; // Minimum distance from player to prevent spawning on top
        const worldCenter = { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 };
        const maxDistFromCenter = Math.max(GAME_CONFIG.WORLD_WIDTH / 2, GAME_CONFIG.WORLD_HEIGHT / 2);

        // Try to find a valid spawn location away from the player
        while (!validSpawn && attempts < 10) {
            const angle = Math.random() * Math.PI * 2;
            const radius = GAME_CONFIG.SAFE_ZONE_RADIUS + GAME_CONFIG.ENEMY_SPAWN_BUFFER + Math.random() * (GAME_CONFIG.WORLD_WIDTH / 2 - GAME_CONFIG.SAFE_ZONE_RADIUS - GAME_CONFIG.ENEMY_SPAWN_BUFFER);
            packCenterX = worldCenter.x + Math.cos(angle) * radius;
            packCenterY = worldCenter.y + Math.sin(angle) * radius;

            if (getDistance({x: packCenterX, y: packCenterY}, player.position) > minSpawnDistance) {
                validSpawn = true;
            }
            attempts++;
        }
        
        if (validSpawn) {
            // Calculate level based on distance from center
            const distFromCenter = getDistance({ x: packCenterX, y: packCenterY }, worldCenter);
            // Normalize distance (subtract safe zone)
            const effectiveDist = Math.max(0, distFromCenter - GAME_CONFIG.SAFE_ZONE_RADIUS);
            const availableRange = maxDistFromCenter - GAME_CONFIG.SAFE_ZONE_RADIUS;
            
            // Map distance to level 1-45
            // 0 dist = Level 1
            // Max dist = Level 45
            const distFactor = effectiveDist / availableRange;
            let zoneLevel = 1 + Math.floor(distFactor * (GAME_CONFIG.MAX_LEVEL - 1));
            
            // Add some variance (+/- 2 levels), clamped
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
        if (p.ownerId === player.id) { // Player projectiles
            for (const enemy of updatedEnemies) {
                if (enemy.isDead) continue;
                if (getDistance(p.position, enemy.position) < p.radius + enemy.radius) {
                    p.onHit(enemy, gameContext);
                    if (!p.piercing && p.bounces <= 0) p.expire();
                }
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
            // Pass the full player object to dropLoot so it can access Item Find stats
            e.dropLoot(player).forEach(addDroppedItem);
            player.gainXP(e.xpValue, addFloatingText, e.level);
            player.gainGold(e.goldValue, addFloatingText);
            player.kills++;
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

  }, [player, enemies, projectiles, floatingTexts, visualEffects, groundEffects, droppedItems, pressedKeys, onDeath, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, addDroppedItem, waypoints]);

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

    // Culling Helper
    const cullingBuffer = 150;
    const isVisible = (pos: Vector2D, radius: number = 0) => {
        return pos.x + radius + cullingBuffer > camera.x &&
               pos.x - radius - cullingBuffer < camera.x + canvas.width &&
               pos.y + radius + cullingBuffer > camera.y &&
               pos.y - radius - cullingBuffer < camera.y + canvas.height;
    };

    // Draw world bounds/grid
    // Optimized Grid Drawing: Only draw lines visible on screen
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

    // Draw safe zone (if visible)
    if (isVisible({ x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 }, GAME_CONFIG.SAFE_ZONE_RADIUS)) {
        ctx.beginPath();
        ctx.arc(GAME_CONFIG.WORLD_WIDTH / 2, GAME_CONFIG.WORLD_HEIGHT / 2, GAME_CONFIG.SAFE_ZONE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 150, 0.05)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 255, 150, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // Draw entities with culling
    groundEffects.forEach(ge => {
        if(isVisible(ge.position, ge.radius)) ge.draw(ctx);
    });
    
    // Draw Waypoints
    waypoints.forEach(wp => {
        if(isVisible(wp.data.position, wp.radius)) {
            const isDiscovered = player.discoveredWaypoints.includes(wp.data.id);
            wp.draw(ctx, isDiscovered);
        }
    });

    droppedItems.forEach(di => {
        if(isVisible(di.position, 20)) di.draw(ctx);
    });
    
    enemies.forEach(e => {
        if(isVisible(e.position, e.radius)) e.draw(ctx);
    });
    
    npcs.forEach(npc => {
        if(isVisible(npc.position, npc.radius)) npc.draw(ctx);
    });
    
    player.draw(ctx);
    
    projectiles.forEach(p => {
        if(isVisible(p.position, p.radius)) p.draw(ctx);
    });
    
    visualEffects.forEach(ve => {
         // Simple culling for effects based on position
         if(isVisible(ve.position, 100)) ve.draw(ctx);
    });
    
    floatingTexts.forEach(ft => {
        if(isVisible(ft.position, 50)) ft.draw(ctx);
    });

    ctx.restore();
  }, [player, enemies, projectiles, floatingTexts, visualEffects, groundEffects, droppedItems, npcs, camera, waypoints]);

  // Handle Inventory Toggle
  const toggleInventory = useCallback(() => {
    if (interactingNPC || interactingWaypoint) return;
    setInventoryOpen(prev => !prev);
  }, [interactingNPC, interactingWaypoint]);

  const handleUseSkill = (index: number) => {
      if(!player) return;
      player.useSkill(index, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect });
  };

  const handleUseSkillRef = useRef(handleUseSkill);
  useEffect(() => {
      handleUseSkillRef.current = handleUseSkill;
  });

  // Handle interaction and hotkeys
  const nearbyNPC = player ? npcs.find(npc => getDistance(player.position, npc.position) < npc.interactionRadius) : null;
  // Find nearby waypoints that are discovered
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
          
          // Handle overflow items if bag was swapped for smaller one
          const dropped = player.flushOverflowItems();
          dropped.forEach(item => addDroppedItem(new DroppedItem(player.position, item)));

          setPlayer(new Player(player.toCharacterData()));
      }
  };
  const handleItemUnequip = (itemSlot: ItemSlot) => {
      if (player) {
          player.unequipItem(itemSlot);
          
          // Handle overflow items if bag was removed
          const dropped = player.flushOverflowItems();
          dropped.forEach(item => addDroppedItem(new DroppedItem(player.position, item)));
          
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
