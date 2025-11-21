
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CharacterData, GameStats, Item, Party, TradeSession, NPCType, ServerEnemy, Recipe } from '../game/types';
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
import { GAME_CONFIG, WAYPOINTS, BOSS_ZONES, BOSS_CONFIG } from '../game/constants';
import { getDistance } from '../game/math';
import { CRAFTING_RECIPES } from '../game/items';
import HUD from './HUD';
import Inventory from './Inventory';
import NPCInteraction from './NPCInteraction';
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
        new NPC({ x: GAME_CONFIG.WORLD_WIDTH / 2 + 150, y: GAME_CONFIG.WORLD_HEIGHT / 2 + 50 }, "Rory", NPCType.WorldTraveler),
        new NPC({ x: GAME_CONFIG.WORLD_WIDTH / 2 - 150, y: GAME_CONFIG.WORLD_HEIGHT / 2 + 50 }, "Arthur", NPCType.Banker),
        new NPC({ x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 + 120 }, "Eldric", NPCType.QuestGiver),
    ];
    setNpcs(initialNPCs);

    // 3. Init Waypoints
    setWaypoints(WAYPOINTS.map(data => new Waypoint(data)));

    // 4. Init Bank
    const loadBank = async () => {
        if (!userId) return;
        try {
            const items = await storageService.getBank(userId);
            // Pad bank to 100 slots
            const paddedBank = [...items];
            while (paddedBank.length < 100) paddedBank.push(null);
            setBankItems(paddedBank);
            setBankLoaded(true);
        } catch (err) {
            console.error("Failed to load bank", err);
        }
    };
    loadBank();

    // 5. Online Mode Setup
    if (isOnlineMode) {
        socketService.connect((id) => {
            if (newPlayer) newPlayer.id = id;
        });
        socketService.joinGame(characterData);

        socketService.onGameState((gameState) => {
            const others: any[] = [];
            Object.entries(gameState.players).forEach(([id, pData]) => {
                if (id !== socketService.id) {
                    others.push(pData);
                }
            });
            setOtherPlayers(others);
            
            // Sync enemies
            setEnemies(prevEnemies => {
                const updatedEnemies = [...prevEnemies];
                
                // Add new enemies
                gameState.enemies.forEach(serverEnemy => {
                    const existingIndex = updatedEnemies.findIndex(e => e.id === serverEnemy.id);
                    if (existingIndex === -1) {
                        // Create new enemy locally
                        const newEnemy = new Enemy(serverEnemy.position, serverEnemy.level, serverEnemy.bossZoneId, serverEnemy.id);
                        newEnemy.sync(serverEnemy);
                        updatedEnemies.push(newEnemy);
                        if (serverEnemy.isBoss) playSound('boss_spawn');
                    } else {
                        // Sync existing
                        updatedEnemies[existingIndex].sync(serverEnemy);
                    }
                });

                // Remove enemies not in server state
                const serverEnemyIds = gameState.enemies.map(e => e.id);
                return updatedEnemies.filter(e => {
                     if (serverEnemyIds.includes(e.id)) return true;
                     // Keep dead animation/bodies for a bit? No, for now instant remove
                     return false; 
                });
            });
        });

        socketService.onLootDropped((drops) => {
            drops.forEach(drop => {
                setDroppedItems(prev => [...prev, new DroppedItem(drop.position, drop.item)]);
            });
        });

        socketService.onEnemyKilled((data) => {
            if (newPlayer) {
                newPlayer.gainXP(data.xp, addFloatingText, data.enemyLevel);
                newPlayer.gainGold(data.gold, addFloatingText);
            }
        });

        socketService.onInviteReceived((invite) => {
            // Auto accept for now or show UI? 
            // Showing simple alert for POC
            if (window.confirm(`${invite.fromName} invited you to ${invite.type}. Accept?`)) {
                if (invite.type === 'party') socketService.acceptPartyInvite(invite.fromId);
                if (invite.type === 'trade') socketService.acceptTradeRequest(invite.fromId);
            }
        });
        
        socketService.onPartyUpdate((partyData) => {
            setParty(partyData);
        });

        socketService.onTradeUpdate((session) => {
            setActiveTradeSession(session);
            if (!session) {
                 // Trade ended
            }
        });

        socketService.onTradeCompleted((success) => {
            if(success) {
                addFloatingText(new FloatingText("Trade Successful!", {x: newPlayer.position.x, y: newPlayer.position.y - 40}, '#4ade80', 20));
            }
        });

        socketService.onCharacterUpdate((data) => {
            // Server updated our character (e.g. after trade)
            if (newPlayer) {
                newPlayer.gold = data.gold;
                newPlayer.inventory = data.inventory;
                // Re-equip check?
                // Simplest is just update references
            }
        });
    }

    return () => {
        if (isOnlineMode) {
            socketService.disconnect();
        }
    };
  }, [isOnlineMode, userId, addFloatingText, characterData, playSound]);

  // --- Game Loop ---
  useGameLoop(() => {
    if (!player || player.isDead) return;
    gameTimeRef.current++;

    // 1. Update Player
    player.update(pressedKeys, { 
        player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode 
    });

    // Send input to server
    if (isOnlineMode) {
        const keysArray = Array.from(pressedKeys);
        socketService.sendInput(keysArray);
    }

    // Check Safe Zone
    const distToCenter = getDistance(player.position, { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 });
    player.isInSafeZone = distToCenter < GAME_CONFIG.SAFE_ZONE_RADIUS;

    // 2. Update Projectiles
    setProjectiles(prev => {
      const next: Projectile[] = [];
      prev.forEach(p => {
        p.update();
        let hit = false;
        
        // Player projectile hitting enemies
        if (!p.isHostile) {
            for (const enemy of enemies) {
                if (!enemy.isDead && getDistance(p.position, enemy.position) < p.radius + enemy.radius) {
                    p.onHit(enemy, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode });
                    hit = true;
                    if (isOnlineMode && !enemy.isDead) { // Sync hit to server
                        socketService.damageEnemy(String(enemy.id), p.damage);
                    }
                    if (!p.piercing) break;
                }
            }
        } 
        // Hostile projectile hitting player
        else {
            if (getDistance(p.position, player.position) < p.radius + player.radius) {
                 p.onHit(player, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode });
                 hit = true;
            }
        }

        if (!p.isExpired() && (!hit || p.piercing)) {
            next.push(p);
        }
      });
      return next;
    });

    // 3. Update Enemies (Local Mode Only logic + Shared Animation logic)
    setEnemies(prev => {
        prev.forEach(enemy => {
            // Only run AI logic if offline (Online logic handled by server sync + simple interpolation)
            if (!isOnlineMode) {
                enemy.update({ player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode });
                if (enemy.isDead && !enemy.lootDropped) {
                     const drops = enemy.dropLoot(player);
                     drops.forEach(d => setDroppedItems(curr => [...curr, d]));
                     if (player.level < GAME_CONFIG.MAX_LEVEL) {
                        player.gainXP(enemy.xpValue, addFloatingText, enemy.level);
                     }
                     player.gainGold(enemy.goldValue, addFloatingText);
                }
            } else {
                // Just update animations
                enemy.updateAnimation();
            }
        });
        return isOnlineMode ? prev : prev.filter(e => !e.isDead || Date.now() - (e as any).deathTime < 1000); // Keep dead briefly? No, simpler to remove
    });

    // 3b. Spawn Enemies (Local Mode)
    if (!isOnlineMode) {
        const aliveEnemies = enemies.filter(e => !e.isDead);
        if (aliveEnemies.length < GAME_CONFIG.MAX_ENEMIES) {
            // Logic to spawn new enemies
            const spawnX = Math.random() * GAME_CONFIG.WORLD_WIDTH;
            const spawnY = Math.random() * GAME_CONFIG.WORLD_HEIGHT;
            if (getDistance({x: spawnX, y: spawnY}, {x: GAME_CONFIG.WORLD_WIDTH/2, y: GAME_CONFIG.WORLD_HEIGHT/2}) > GAME_CONFIG.SAFE_ZONE_RADIUS + 100) {
                // Calculate level based on distance from center
                const dist = getDistance({x: spawnX, y: spawnY}, {x: GAME_CONFIG.WORLD_WIDTH/2, y: GAME_CONFIG.WORLD_HEIGHT/2});
                const maxDist = Math.max(GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT) / 2;
                const level = Math.floor(1 + (dist / maxDist) * (GAME_CONFIG.MAX_LEVEL - 1));
                
                const newEnemy = new Enemy({x: spawnX, y: spawnY}, Math.max(1, level));
                setEnemies(prev => [...prev, newEnemy]);
            }
        }

        // Spawn Bosses (Local)
        bossSpawnTimerRef.current++;
        if (bossSpawnTimerRef.current > 600) { // Check every ~10s
             bossSpawnTimerRef.current = 0;
             const activeBosses = enemies.filter(e => e.isBoss);
             if (activeBosses.length < BOSS_CONFIG.MAX_ACTIVE_BOSSES) {
                  // Try spawn boss
                  BOSS_ZONES.forEach(zone => {
                       if (!activeBosses.find(b => b.bossZoneId === zone.id) && Math.random() < 0.3) {
                            // Spawn
                            const boss = new Enemy({x: zone.x, y: zone.y}, GAME_CONFIG.MAX_LEVEL, zone.id);
                            setEnemies(prev => [...prev, boss]);
                            playSound('boss_spawn');
                            addFloatingText(new FloatingText(`${boss.name} has spawned!`, {x: player.position.x, y: player.position.y - 100}, '#ef4444', 24));
                       }
                  });
             }
        }
    }

    // 4. Update Items & Interactions
    setDroppedItems(prev => {
        const next: DroppedItem[] = [];
        prev.forEach(item => {
            item.update(player);
            if (getDistance(item.position, player.position) < player.radius + 10) {
                if (player.pickupItem(item.item)) {
                    playSound('hit'); // Pickup sound
                    addFloatingText(new FloatingText(`+${item.item.name}`, player.position, '#4ade80'));
                } else {
                    next.push(item); // Inventory full
                }
            } else {
                next.push(item);
            }
        });
        return next;
    });

    // 5. Update Effects
    setFloatingTexts(prev => {
        const next: FloatingText[] = [];
        prev.forEach(ft => {
            ft.update();
            if (!ft.isExpired()) next.push(ft);
        });
        return next;
    });
    setVisualEffects(prev => {
        const next: VisualEffect[] = [];
        prev.forEach(ve => {
            ve.update();
            if (!ve.isExpired()) next.push(ve);
        });
        return next;
    });
    setGroundEffects(prev => {
        const next: GroundEffect[] = [];
        prev.forEach(ge => {
            ge.update(enemies, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode });
            if (!ge.isExpired()) next.push(ge);
        });
        return next;
    });

    // 6. Update Camera
    const targetCamX = player.position.x - window.innerWidth / 2;
    const targetCamY = player.position.y - window.innerHeight / 2;
    setCamera(prev => ({
        x: prev.x + (targetCamX - prev.x) * 0.1,
        y: prev.y + (targetCamY - prev.y) * 0.1
    }));

    // 7. Check Interaction
    let nearby: NPC | null = null;
    let minDist = 999;
    npcs.forEach(npc => {
        const d = getDistance(player.position, npc.position);
        if (d < npc.interactionRadius + player.radius && d < minDist) {
            minDist = d;
            nearby = npc;
        }
    });
    setInteractingNPC(nearby);

    // Waypoint Discovery
    waypoints.forEach(wp => {
        if (getDistance(player.position, wp.data.position) < wp.unlockRadius) {
            if (player.discoverWaypoint(wp.data.id)) {
                addFloatingText(new FloatingText("Waypoint Discovered!", {x: player.position.x, y: player.position.y - 50}, '#22d3ee', 20));
                playSound('level_up');
            }
        }
    });

    // Death Check
    if (player.health <= 0 && !player.isDead) {
        const stats: GameStats = {
            killerName: player.lastDamagedBy || "Unknown",
            level: player.level,
            kills: player.kills,
            gold: player.gold,
            totalDamageTaken: player.totalDamageTaken,
            deathLog: player.deathLog
        };
        onDeath(stats, player.toCharacterData());
    }
  });

  // --- Render Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !player) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Clear
    ctx.fillStyle = '#1a202c'; // bg-gray-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Draw World Border
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);

    // Draw Safe Zone
    ctx.beginPath();
    ctx.arc(GAME_CONFIG.WORLD_WIDTH/2, GAME_CONFIG.WORLD_HEIGHT/2, GAME_CONFIG.SAFE_ZONE_RADIUS, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(74, 222, 128, 0.1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Ground Effects
    groundEffects.forEach(ge => ge.draw(ctx));

    // Draw Dropped Items
    droppedItems.forEach(item => item.draw(ctx));

    // Draw Waypoints
    waypoints.forEach(wp => wp.draw(ctx, player.discoveredWaypoints.includes(wp.data.id)));

    // Draw NPCs
    npcs.forEach(npc => npc.draw(ctx));

    // Draw Enemies
    enemies.forEach(enemy => enemy.draw(ctx));

    // Draw Other Players
    otherPlayers.forEach(op => {
        const isParty = party?.members.some(m => m.id === op.id);
        
        // Simple draw for other players
        ctx.save();
        ctx.translate(op.position.x, op.position.y);
        
        // Shadow
        ctx.beginPath();
        ctx.ellipse(0, 20, 20, 10, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fillStyle = isParty ? '#4ade80' : '#60a5fa'; // Green if party, blue if not
        ctx.fill();
        
        // Name
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = '12px sans-serif';
        ctx.fillText(op.characterData.name, 0, 35);
        ctx.restore();
    });

    // Draw Player
    player.draw(ctx);

    // Draw Projectiles
    projectiles.forEach(p => p.draw(ctx));

    // Draw Visual Effects
    visualEffects.forEach(ve => ve.draw(ctx));

    // Draw Floating Text
    floatingTexts.forEach(ft => ft.draw(ctx));

    ctx.restore();
  }, [player, enemies, projectiles, floatingTexts, visualEffects, groundEffects, droppedItems, npcs, waypoints, camera, otherPlayers, party]);

  // --- Handlers ---
  const handleUseSkill = (index: number) => {
      if (player) player.useSkill(index, { player, enemies, addProjectile, addFloatingText, addVisualEffect, addGroundEffect, playSound, isOnlineMode });
  };

  const toggleInventory = () => setInventoryOpen(!isInventoryOpen);

  // --- Bank Handlers ---
  const handleDeposit = async (inventoryIndex: number) => {
      if (!player || !isBankLoaded) return;
      const item = player.inventory[inventoryIndex];
      if (!item) return;

      // Find empty slot in bank
      const emptySlot = bankItems.findIndex(s => s === null);
      if (emptySlot !== -1) {
          const newBank = [...bankItems];
          newBank[emptySlot] = item;
          
          player.inventory[inventoryIndex] = null; // Remove from player
          
          setBankItems(newBank);
          await storageService.saveBank(userId, newBank);
          // Note: Player inventory save is handled by periodic save or exit, 
          // but for robustness we could force a save here.
      } else {
          addFloatingText(new FloatingText("Bank is full!", player.position, '#ef4444'));
      }
  };

  const handleWithdraw = async (bankIndex: number) => {
      if (!player || !isBankLoaded) return;
      const item = bankItems[bankIndex];
      if (!item) return;

      // Check player space
      if (player.pickupItem(item)) {
           const newBank = [...bankItems];
           newBank[bankIndex] = null;
           setBankItems(newBank);
           await storageService.saveBank(userId, newBank);
      } else {
          addFloatingText(new FloatingText("Inventory full!", player.position, '#ef4444'));
      }
  };

  const handleCraft = (recipe: Recipe) => {
      if (player && player.craftItem(recipe)) {
          playSound('level_up'); // Craft sound
          addFloatingText(new FloatingText(`Crafted ${recipe.result.name}`, player.position, '#facc15'));
      }
  };
  
  const handleSell = (item: Item, index: number, sellFullStack: boolean) => {
      if (player && player.sellItem(index, sellFullStack)) {
          playSound('hit'); // Sell sound (coins)
      }
  };

  const handleBuy = (item: Item, cost: number) => {
      if (player && player.buyItem(item, cost)) {
           playSound('hit');
      }
  };
  
  const handleSellByRarity = (rarity: number) => {
      if (player) {
           const gain = player.sellUnlockedItemsByRarity(rarity);
           if (gain > 0) playSound('hit');
      }
  };

  const handleEquip = (index: number) => {
      if (player) player.equipItem(index);
  };
  const handleUnequip = (slot: any) => {
      if (player) player.unequipItem(slot);
  };
  const handleMoveItem = (from: number, to: number) => {
      if (player) player.moveItem(from, to);
  };
  const handleToggleLock = (index: number) => {
      if (player) player.toggleItemLock(index);
  };

  // Key Listeners
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'i' || e.key === 'c') toggleInventory();
          if (e.key === 'e' && interactingNPC) {
              // Open Interaction
          }
          if (player) {
              if (e.key === '1') handleUseSkill(0);
              if (e.key === '2') handleUseSkill(1);
              if (e.key === '3') handleUseSkill(2);
              if (e.key === '4') handleUseSkill(3);
              if (e.key === '5') handleUseSkill(4);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInventoryOpen, interactingNPC, player]);


  if (!player) return <div>Loading Game...</div>;

  return (
    <>
        <canvas ref={canvasRef} className="block" />
        <HUD 
            player={player} 
            enemies={enemies} 
            npcs={npcs}
            waypoints={waypoints}
            nearbyNPC={interactingNPC}
            onUseSkill={handleUseSkill}
            toggleInventory={toggleInventory}
            isInventoryOpen={isInventoryOpen}
            party={party}
            onOpenParty={() => setPartyUIOpen(true)}
            onRequestTrade={(tid) => socketService.requestTrade(tid)}
            otherPlayers={otherPlayers}
        />
        
        {isInventoryOpen && (
            <Inventory 
                characterData={player.toCharacterData()} // Helper to get data view
                onItemEquip={handleEquip}
                onItemUnequip={handleUnequip}
                toggleInventory={toggleInventory}
                onInventoryMove={handleMoveItem}
                onToggleLock={handleToggleLock}
            />
        )}

        {interactingNPC && (pressedKeys.has('e') || activeTradeSession) && (
             <NPCInteraction 
                npc={interactingNPC}
                characterData={player.toCharacterData()}
                recipes={CRAFTING_RECIPES}
                onClose={() => setInteractingNPC(null)}
                onCraft={handleCraft}
                onSell={handleSell}
                onBuy={handleBuy}
                onSellByRarity={handleSellByRarity}
                bankItems={bankItems}
                onDeposit={handleDeposit}
                onWithdraw={handleWithdraw}
             />
        )}

        {/* Interactions that persist even if walking away slightly, or modal-based */}
        {isPartyUIOpen && (
            <PartyUI 
                party={party}
                onClose={() => setPartyUIOpen(false)}
                onInvite={(name) => socketService.inviteToParty(name)}
                onLeave={() => socketService.leaveParty()}
            />
        )}

        {activeTradeSession && (
             <TradeUI 
                session={activeTradeSession}
                currentUserId={socketService.id || ''}
                inventory={player.inventory}
                onUpdateOffer={(g, i) => socketService.updateTradeOffer(g, i)}
                onLockOffer={(l) => socketService.lockTrade(l)}
                onCancel={() => socketService.cancelTrade()}
             />
        )}
    </>
  );
};

export default Game;
