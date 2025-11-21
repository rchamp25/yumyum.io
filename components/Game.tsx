
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
import { storageService } from '../services/storage';

interface GameProps {
  characterData: CharacterData;
  onDeath: (stats: GameStats, finalCharacterData: CharacterData) => void;
  onReturnToSelect: (finalCharacterData: CharacterData) => void;
  isOnlineMode: boolean;
  isDevMode: boolean;
  userId: string;
}

const Game: React.FC<GameProps> = ({ characterData, onDeath, onReturnToSelect, isOnlineMode, userId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameTimeRef = useRef(0);
  const bossSpawnTimerRef = useRef(0);
  
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
  
  // Bank State
  const [bankItems, setBankItems] = useState<(Item | null)[]>([]);
  const [isBankLoaded, setBankLoaded] = useState(false);

  // Multiplayer State
  const [party, setParty] = useState<Party | null>(null);
  const [isPartyUIOpen, setPartyUIOpen] = useState(false);
  const [activeTradeSession, setActiveTradeSession] = useState<TradeSession | null>(null);

  const pressedKeys = useKeyboardInput();

  const addProjectile = useCallback((p: Projectile) => setProjectiles(prev => [...prev, p]), []);
  const addFloatingText = useCallback((ft: FloatingText) => setFloatingTexts(prev => [...prev, ft]), []);
  const addVisualEffect = useCallback((ve: VisualEffect) => setVisualEffects(prev => [...prev, ve]), []);
  const addGroundEffect = useCallback((ge: GroundEffect) => setGroundEffects(prev => [...prev, ge]), []);

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
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.1);
            noise.connect(gain);
            gain.connect(masterGain);
            noise.start();
        } else if (type === 'level_up') {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.setValueAtTime(554, t + 0.2);
            osc.frequency.setValueAtTime(659, t + 0.4);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.linearRampToValueAtTime(0.1, t + 0.6);
            gain.gain.linearRampToValueAtTime(0, t + 1);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start();
            osc.stop(t + 1);
        }
    } catch (e) {
        // Ignore audio errors
    }
  }, []);

  // --- Initialization ---
  useEffect(() => {
    // 1. Init Player
    const newPlayer = new Player(characterData);
    setPlayer(newPlayer);

    // 2. Init NPCs
    const initialNPCs = [
        new NPC({ x: GAME_CONFIG.WORLD_WIDTH / 2 - 100, y: GAME_CONFIG.WORLD_HEIGHT / 2 }, "Thomas", NPCType.Crafter),
        new NPC({ x: GAME_CONFIG.WORLD_WIDTH / 2 + 100, y: GAME_CONFIG.WORLD_HEIGHT / 2 }, "Trevor", NPCType.Vendor),
        new NPC({ x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 - 100 }, "Jackson", NPCType.Seller),
        new NPC({ x: GAME_CONFIG.WORLD_WIDTH / 2 + 60, y: GAME_CONFIG.WORLD_HEIGHT / 2 + 60 }, "Rory", NPCType.WorldTraveler),
        new NPC({ x: GAME_CONFIG.WORLD_WIDTH / 2 - 60, y: GAME_CONFIG.WORLD_HEIGHT / 2 + 60 }, "Mr. Monopoly", NPCType.Banker),
    ];
    setNpcs(initialNPCs);

    // 3. Init Waypoints
    setWaypoints(WAYPOINTS.map(wp => new Waypoint(wp)));

    // 4. Init Bank
    if (userId) {
        storageService.getBank(userId).then(items => {
            const fullBank = items.length > 0 ? items : [];
            // Ensure 100 slots for visual consistency
            while (fullBank.length < 100) fullBank.push(null);
            setBankItems(fullBank);
            setBankLoaded(true);
        });
    }

    // 5. Connect to Socket if Online
    if (isOnlineMode) {
        socketService.connect((socketId) => {
            // Update player ID to match socket for proper sync
            newPlayer.id = socketId; 
            socketService.joinGame(newPlayer.toCharacterData());
        });

        socketService.onGameState((state) => {
            // Sync other players
            const others = Object.values(state.players).filter((p: any) => p.characterData.id !== socketService.id);
            setOtherPlayers(others);

            // Sync Enemies (Interpolation logic could be added here)
            const serverEnemies = state.enemies;
            
            setEnemies(prev => {
                const updatedEnemies = [...prev];
                // Update existing or add new
                serverEnemies.forEach(sEnemy => {
                    const existing = updatedEnemies.find(e => e.id === sEnemy.id);
                    if (existing) {
                        existing.sync(sEnemy);
                    } else {
                        const newEnemy = new Enemy(sEnemy.position, sEnemy.level, sEnemy.bossZoneId, sEnemy.id);
                        newEnemy.sync(sEnemy);
                        updatedEnemies.push(newEnemy);
                    }
                });
                
                // Remove enemies not in server state
                return updatedEnemies.filter(e => serverEnemies.some(se => se.id === e.id) || e.isDead); // Keep dead ones for a moment if needed for fade out
            });
        });

        socketService.onLootDropped((drops) => {
            drops.forEach(drop => {
                 setDroppedItems(prev => [...prev, new DroppedItem(drop.position, drop.item)]);
            });
        });

        socketService.onEnemyKilled((data) => {
            // Handled in local floating text logic mostly, but could show global messages
        });
        
        socketService.onPartyUpdate((partyData) => {
            setParty(partyData);
        });
        
        socketService.onTradeUpdate((session) => {
            setActiveTradeSession(session);
            if (!session) {
                // Trade ended or cancelled
            }
        });
        
        socketService.onTradeCompleted((success) => {
            if (success) {
                addFloatingText(new FloatingText("Trade Completed", newPlayer.position, '#22c55e', 20));
                // Refresh character data from state logic handled by socket updates usually,
                // but we might need to fetch or trust the socket 'update_character' event which is handled below.
            }
        });
        
        socketService.onCharacterUpdate((data: CharacterData) => {
            // Server pushed an update (e.g. after trade)
            // Update local player inventory/gold
             setPlayer(prev => {
                 if (!prev) return null;
                 prev.gold = data.gold;
                 prev.inventory = data.inventory;
                 prev.equipment = data.equipment;
                 prev.recalculateStats();
                 return prev;
             });
        });
    }

    return () => {
        if (isOnlineMode) socketService.disconnect();
    };
  }, [characterData, isOnlineMode, userId, addFloatingText]); // addFloatingText in deps is fine as it is useCallback

  // --- Game Loop ---
  const update = () => {
    if (!player) return;

    // 1. Player Input & Update
    if (isOnlineMode) {
        // Send input to server
        socketService.sendInput(Array.from(pressedKeys));
    }
    
    // Run local prediction/update
    player.update(pressedKeys, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode });

    // 2. Camera
    setCamera({
        x: player.position.x - window.innerWidth / 2,
        y: player.position.y - window.innerHeight / 2,
    });

    // 3. Enemies (Only update logic if offline, otherwise just animation/interp)
    if (!isOnlineMode) {
        gameTimeRef.current++;
        
        // Spawning
        if (enemies.length < GAME_CONFIG.MAX_ENEMIES) {
            if (Math.random() < 0.05) {
                const angle = Math.random() * Math.PI * 2;
                const dist = GAME_CONFIG.SAFE_ZONE_RADIUS + GAME_CONFIG.ENEMY_SPAWN_BUFFER + Math.random() * 1000;
                const pos = {
                    x: GAME_CONFIG.WORLD_WIDTH/2 + Math.cos(angle) * dist,
                    y: GAME_CONFIG.WORLD_HEIGHT/2 + Math.sin(angle) * dist
                };
                
                // Basic level scaling based on distance from center
                const distFromCenter = getDistance(pos, {x: GAME_CONFIG.WORLD_WIDTH/2, y: GAME_CONFIG.WORLD_HEIGHT/2});
                const level = Math.max(1, Math.floor(distFromCenter / 300));
                
                if (pos.x > 0 && pos.x < GAME_CONFIG.WORLD_WIDTH && pos.y > 0 && pos.y < GAME_CONFIG.WORLD_HEIGHT) {
                    setEnemies(prev => [...prev, new Enemy(pos, Math.min(level, GAME_CONFIG.MAX_LEVEL))]);
                }
            }
        }
        
        // Boss Spawning
        bossSpawnTimerRef.current++;
        if (bossSpawnTimerRef.current > 60) {
            bossSpawnTimerRef.current = 0;
            const activeBosses = enemies.filter(e => e.isBoss);
            if (activeBosses.length < BOSS_CONFIG.MAX_ACTIVE_BOSSES && Date.now() > (window as any).globalBossCooldown) {
                const availableZones = BOSS_ZONES.filter(z => !activeBosses.some(b => b.bossZoneId === z.id));
                if (availableZones.length > 0) {
                    const zone = availableZones[Math.floor(Math.random() * availableZones.length)];
                    setEnemies(prev => [...prev, new Enemy({x: zone.x, y: zone.y}, GAME_CONFIG.MAX_LEVEL, zone.id)]);
                    (window as any).globalBossCooldown = Date.now() + BOSS_CONFIG.SPAWN_COOLDOWN;
                    addFloatingText(new FloatingText(`${zone.name} Boss Spawned!`, player.position, '#ef4444', 30));
                    playSound('boss_spawn');
                }
            }
        }

        setEnemies(prev => prev.filter(e => !e.isDead));
    }

    enemies.forEach(enemy => enemy.update({ player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode }));

    // 4. Projectiles
    setProjectiles(prev => prev.filter(p => {
        p.update();
        if (p.isExpired()) return false;
        
        // Collision
        if (p.isHostile) {
            if (getDistance(p.position, player.position) < player.radius + p.radius) {
                p.onHit(player, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode });
                if (!p.piercing) return false;
            }
        } else {
             enemies.forEach(e => {
                 if (getDistance(p.position, e.position) < e.radius + p.radius) {
                     p.onHit(e, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode });
                 }
             });
             if (!p.piercing && p.hitIds.length > 0 && p.bounces === 0) return false;
        }
        return true;
    }));

    // 5. Effects
    setFloatingTexts(prev => prev.filter(ft => { ft.update(); return !ft.isExpired(); }));
    setVisualEffects(prev => prev.filter(ve => { ve.update(); return !ve.isExpired(); }));
    setGroundEffects(prev => prev.filter(ge => { ge.update(enemies, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode }); return !ge.isExpired(); }));
    setDroppedItems(prev => prev.filter(di => { 
        di.update(player);
        if (getDistance(di.position, player.position) < player.radius) {
            if (player.pickupItem(di.item)) {
                addFloatingText(new FloatingText(`+${di.item.name}`, player.position, '#bef264'));
                return false; 
            }
        }
        return true; 
    }));

    // 6. Check Loot on Dead Enemies (Offline only)
    if (!isOnlineMode) {
        enemies.forEach(enemy => {
            if (enemy.isDead && !enemy.lootDropped) {
                player.gainXP(enemy.xpValue, addFloatingText, enemy.level);
                player.gainGold(enemy.goldValue, addFloatingText);
                if (enemy.id === player.lastDamagedBy) {
                    player.kills++;
                }
                const drops = enemy.dropLoot(player);
                drops.forEach(d => setDroppedItems(prev => [...prev, d]));
                
                if (enemy.isBoss) {
                     addVisualEffect(new VisualEffect(enemy.position, 'explosion', 1000, { radius: 100, color: '#fbbf24' }));
                     addFloatingText(new FloatingText("BOSS SLAIN!", player.position, '#fbbf24', 40));
                }
            }
        });
    }
    
    // 7. Player Death Check
    if (player.health <= 0 && !player.isDead) {
         player.isDead = true; // Prevent multiple triggers
         onDeath({
             killerName: player.lastDamagedBy || 'Unknown',
             level: player.level,
             kills: player.kills,
             gold: player.gold,
             totalDamageTaken: player.totalDamageTaken,
             deathLog: player.deathLog
         }, player.toCharacterData());
    }
    
    // 8. NPC Interaction Check
    const nearby = npcs.find(npc => getDistance(player.position, npc.position) < npc.interactionRadius + player.radius);
    if (nearby !== interactingNPC && !isInventoryOpen) {
        // Auto-close if walked away
        if (!nearby) setInteractingNPC(null);
    }

    // 9. Sync Player Data periodically (or relying on onReturnToSelect/death for hard saves)
    if (gameTimeRef.current % 300 === 0 && userId && !isOnlineMode) {
         // Autosave every ~5 seconds
         storageService.saveCharacter(userId, player.toCharacterData());
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !player) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Draw World Borders
    ctx.strokeStyle = '#334155'; // slate-700
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);

    // Draw Safe Zone
    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.beginPath();
    ctx.arc(GAME_CONFIG.WORLD_WIDTH/2, GAME_CONFIG.WORLD_HEIGHT/2, GAME_CONFIG.SAFE_ZONE_RADIUS, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Boss Zones
    BOSS_ZONES.forEach(zone => {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, BOSS_CONFIG.ZONE_RADIUS, 0, Math.PI*2);
        ctx.fill();
        // Zone Name
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.font = 'bold 40px serif';
        ctx.textAlign = 'center';
        ctx.fillText(zone.name, zone.x, zone.y);
    });

    // Entities
    groundEffects.forEach(ge => ge.draw(ctx));
    waypoints.forEach(wp => wp.draw(ctx, player.discoveredWaypoints.includes(wp.data.id)));
    droppedItems.forEach(di => di.draw(ctx));
    npcs.forEach(npc => npc.draw(ctx));
    enemies.forEach(e => e.draw(ctx));
    otherPlayers.forEach(op => {
        // Simple draw for other players
        ctx.save();
        ctx.translate(op.position.x, op.position.y);
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(0, 0, GAME_CONFIG.PLAYER_RADIUS, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(op.characterData.name, 0, 30);
        ctx.restore();
    });
    player.draw(ctx);
    projectiles.forEach(p => p.draw(ctx));
    visualEffects.forEach(ve => ve.draw(ctx));
    floatingTexts.forEach(ft => ft.draw(ctx));

    ctx.restore();
  };

  useGameLoop(() => {
      update();
      draw();
  });

  // --- Handlers ---
  const handleInventoryToggle = () => {
      setInventoryOpen(!isInventoryOpen);
      if (isInventoryOpen) setInteractingNPC(null); 
  };

  const handleNPCInteract = () => {
      const nearby = npcs.find(npc => player && getDistance(player.position, npc.position) < npc.interactionRadius + player.radius);
      if (nearby) {
          setInteractingNPC(nearby);
          setInventoryOpen(true); // Open inventory when talking to NPC usually
      }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'i' || e.key.toLowerCase() === 'c') {
          handleInventoryToggle();
      }
      if (e.key.toLowerCase() === 'e') {
          handleNPCInteract();
      }
      if (player) {
          if (e.key === '1') player.useSkill(0, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode });
          if (e.key === '2') player.useSkill(1, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode });
          if (e.key === '3') player.useSkill(2, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode });
          if (e.key === '4') player.useSkill(3, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode });
          if (e.key === '5') player.useSkill(4, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode });
      }
  }, [player, isInventoryOpen, enemies]); // Dependencies

  useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // --- Bank Handlers ---
  const handleDeposit = async (inventoryIndex: number) => {
      if (!player || !isBankLoaded) return;
      
      const item = player.inventory[inventoryIndex];
      if (!item) return;

      const newBank = [...bankItems];
      // Find empty slot
      let emptyIndex = newBank.findIndex(i => i === null);
      if (emptyIndex === -1) {
          // Extend if less than max (e.g. 100)
          if (newBank.length < 100) {
              newBank.push(item);
              // Pad rest to 100 if desired or just push
          } else {
              addFloatingText(new FloatingText("Bank Full!", player.position, 'red'));
              return;
          }
      } else {
          newBank[emptyIndex] = item;
      }

      player.inventory[inventoryIndex] = null;
      setBankItems(newBank);
      
      // Save state
      await Promise.all([
          storageService.saveCharacter(userId, player.toCharacterData()),
          storageService.saveBank(userId, newBank)
      ]);
  };

  const handleWithdraw = async (bankIndex: number) => {
      if (!player || !isBankLoaded) return;
      
      const item = bankItems[bankIndex];
      if (!item) return;

      if (player.pickupItem(item)) {
          const newBank = [...bankItems];
          newBank[bankIndex] = null;
          setBankItems(newBank);
          
          // Save state
          await Promise.all([
            storageService.saveCharacter(userId, player.toCharacterData()),
            storageService.saveBank(userId, newBank)
          ]);
      } else {
          addFloatingText(new FloatingText("Inventory Full!", player.position, 'red'));
      }
  };

  // --- Other Handlers ---
  const handleCraft = (recipe: Recipe) => {
      if (player && player.craftItem(recipe)) {
          playSound('level_up'); // Recycling sound for craft
          if (!isOnlineMode) storageService.saveCharacter(userId, player.toCharacterData());
      }
  };
  
  const handleSell = (item: Item, index: number, sellFull: boolean) => {
      if (player && player.sellItem(index, sellFull)) {
          playSound('attack'); // Placeholder
          if (!isOnlineMode) storageService.saveCharacter(userId, player.toCharacterData());
      }
  };
  
  const handleSellByRarity = (rarity: ItemRarity) => {
      if (player) {
          const gold = player.sellUnlockedItemsByRarity(rarity);
          if (gold > 0) {
             playSound('attack');
             addFloatingText(new FloatingText(`+${gold} G`, player.position, 'yellow'));
             if (!isOnlineMode) storageService.saveCharacter(userId, player.toCharacterData());
          }
      }
  }

  const handleBuy = (item: Item, cost: number) => {
      if (player && player.buyItem(item, cost)) {
           playSound('attack');
           if (!isOnlineMode) storageService.saveCharacter(userId, player.toCharacterData());
      }
  };
  
  const handleEquip = (index: number) => {
      if (player) {
          player.equipItem(index);
          if (!isOnlineMode) storageService.saveCharacter(userId, player.toCharacterData());
      }
  };
  
  const handleUnequip = (slot: ItemSlot) => {
      if (player) {
          player.unequipItem(slot);
          if (!isOnlineMode) storageService.saveCharacter(userId, player.toCharacterData());
      }
  };

  return (
      <div className="relative w-full h-full">
          <canvas 
            ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
            className="block bg-[#1a1a1a]"
          />
          
          <HUD 
             player={player}
             enemies={enemies}
             npcs={npcs}
             waypoints={waypoints}
             nearbyNPC={npcs.find(n => player && getDistance(player.position, n.position) < n.interactionRadius + player.radius) || null}
             onUseSkill={(idx) => player && player.useSkill(idx, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode })}
             toggleInventory={handleInventoryToggle}
             isInventoryOpen={isInventoryOpen}
             party={party}
             onOpenParty={() => setPartyUIOpen(true)}
             onRequestTrade={(tid) => socketService.requestTrade(tid)}
             otherPlayers={otherPlayers}
          />

          {isInventoryOpen && player && (
              <Inventory 
                 characterData={player.toCharacterData()}
                 onItemEquip={handleEquip}
                 onItemUnequip={handleUnequip}
                 toggleInventory={handleInventoryToggle}
                 onInventoryMove={(from, to) => {
                     player.moveItem(from, to);
                     // force re-render
                     setPlayer(Object.assign(Object.create(Object.getPrototypeOf(player)), player));
                 }}
                 onToggleLock={(idx) => {
                     player.toggleItemLock(idx);
                     setPlayer(Object.assign(Object.create(Object.getPrototypeOf(player)), player));
                 }}
              />
          )}
          
          {interactingNPC && player && (
              <NPCInteraction 
                 npc={interactingNPC}
                 characterData={player.toCharacterData()}
                 recipes={CRAFTING_RECIPES}
                 onClose={() => {
                     setInteractingNPC(null);
                     setInventoryOpen(false);
                 }}
                 onCraft={handleCraft}
                 onSell={handleSell}
                 onBuy={handleBuy}
                 onSellByRarity={handleSellByRarity}
                 bankItems={bankItems}
                 onDeposit={handleDeposit}
                 onWithdraw={handleWithdraw}
              />
          )}

          {activeTradeSession && player && (
              <TradeUI 
                  session={activeTradeSession}
                  currentUserId={userId} // Use user.uid passed from App
                  inventory={player.inventory}
                  onUpdateOffer={(g, i) => socketService.updateTradeOffer(g, i)}
                  onLockOffer={(l) => socketService.lockTrade(l)}
                  onCancel={() => socketService.cancelTrade()}
              />
          )}
          
          {isPartyUIOpen && (
              <PartyUI 
                  party={party}
                  onClose={() => setPartyUIOpen(false)}
                  onInvite={(name) => socketService.inviteToParty(name)}
                  onLeave={() => socketService.leaveParty()}
              />
          )}
      </div>
  );
};

export default Game;
