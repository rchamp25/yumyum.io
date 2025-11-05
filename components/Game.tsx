import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CharacterData, GameStats, Vector2D, GameContext, Item, ItemSlot, Recipe, ItemRarity } from '../game/types';
import { Player } from '../game/entities/Player';
import { Enemy, EnemyType } from '../game/entities/Enemy';
import { Projectile } from '../game/entities/Projectile';
import { FloatingText } from '../game/entities/FloatingText';
import { GoldCoin } from '../game/entities/GoldCoin';
import { VisualEffect } from '../game/entities/VisualEffect';
import { GroundEffect } from '../game/entities/GroundEffect';
import { NPC, NPCType } from '../game/entities/NPC';
import { DroppedItem } from '../game/entities/DroppedItem';
import { GAME_CONFIG } from '../game/constants';
import { getDistance, findNearestEnemy } from '../game/utils';
import { getRandomItem, CRAFTING_RECIPES_DB, ITEMS_DB } from '../game/items';
import useGameLoop from '../hooks/useGameLoop';
import HUD from './HUD';
import Inventory from './Inventory';
import NPCInteraction from './NPCInteraction';
import { Character } from '../game/entities/Character';


interface GameProps {
  characterData: CharacterData;
  onDeath: (stats: GameStats, finalCharacterData: CharacterData) => void;
  onReturnToSelect: (finalCharacterData: CharacterData) => void;
  isDevMode: boolean;
}

const Game: React.FC<GameProps> = ({ characterData, onDeath, onReturnToSelect, isDevMode }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [player, setPlayer] = useState<Player>(() => new Player(characterData));
    const [enemies, setEnemies] = useState<Enemy[]>([]);
    const [projectiles, setProjectiles] = useState<Projectile[]>([]);
    const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
    const [goldCoins, setGoldCoins] = useState<GoldCoin[]>([]);
    const [visualEffects, setVisualEffects] = useState<VisualEffect[]>([]);
    const [groundEffects, setGroundEffects] = useState<GroundEffect[]>([]);
    const [droppedItems, setDroppedItems] = useState<DroppedItem[]>([]);
    const [npcs, setNpcs] = useState<NPC[]>([]);

    const [gameStats, setGameStats] = useState<GameStats>(player.getGameStats());
    const [isInventoryOpen, setInventoryOpen] = useState(false);
    const [interactingNPC, setInteractingNPC] = useState<NPC | null>(null);
    const [nearbyNPC, setNearbyNPC] = useState<NPC | null>(null);

    const pressedKeysRef = useRef<Set<string>>(new Set());
    const mousePositionRef = useRef<Vector2D>({ x: 0, y: 0 });

    const gameContext: GameContext = {
        addProjectile: (p: Projectile) => setProjectiles(prev => [...prev, p]),
        addFloatingText: (ft: FloatingText) => setFloatingTexts(prev => [...prev, ft]),
        addVisualEffect: (ve: VisualEffect) => setVisualEffects(prev => [...prev, ve]),
        addGroundEffect: (ge: GroundEffect) => setGroundEffects(prev => [...prev, ge]),
        addDroppedItem: (item: Item, position: Vector2D) => setDroppedItems(prev => [...prev, new DroppedItem(position, item)]),
        player,
        enemies,
        projectiles,
    };

    // Initial world setup
    useEffect(() => {
        setNpcs([
            new NPC({x: GAME_CONFIG.WORLD_WIDTH/2 + 200, y: GAME_CONFIG.WORLD_HEIGHT/2}, "Thomas", NPCType.Crafter),
            new NPC({x: GAME_CONFIG.WORLD_WIDTH/2 - 200, y: GAME_CONFIG.WORLD_HEIGHT/2}, "Trevor", NPCType.Vendor),
        ]);
        
        const initialEnemies: Enemy[] = [];
        const numClusters = 5;
        const worldCenterX = GAME_CONFIG.WORLD_WIDTH / 2;
        const worldCenterY = GAME_CONFIG.WORLD_HEIGHT / 2;

        for (let i = 0; i < numClusters; i++) {
            let clusterX, clusterY, distanceToCenter;
            do {
                clusterX = Math.random() * GAME_CONFIG.WORLD_WIDTH;
                clusterY = Math.random() * GAME_CONFIG.WORLD_HEIGHT;
                distanceToCenter = getDistance({x: clusterX, y: clusterY}, {x: worldCenterX, y: worldCenterY});
            } while (distanceToCenter < GAME_CONFIG.SAFE_ZONE_RADIUS + 200);

            const clusterSize = Math.floor(Math.random() * 4) + 3;
            for (let j = 0; j < clusterSize; j++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 80;
                const x = clusterX + Math.cos(angle) * radius;
                const y = clusterY + Math.sin(angle) * radius;
                
                if (getDistance({x, y}, {x: worldCenterX, y: worldCenterY}) < GAME_CONFIG.SAFE_ZONE_RADIUS) {
                    continue;
                }

                const typeRoll = Math.random();
                let type = EnemyType.Grunt;
                if (typeRoll > 0.9) type = EnemyType.Tank;
                else if (typeRoll > 0.75) type = EnemyType.Ranger;
                else if (typeRoll > 0.5) type = EnemyType.Scout;
                
                initialEnemies.push(new Enemy({ x, y }, type));
            }
        }
        setEnemies(initialEnemies);
    }, []);

    // Enemy respawn logic
    useEffect(() => {
        const spawnInterval = setInterval(() => {
            setEnemies(prevEnemies => {
                if (prevEnemies.length < GAME_CONFIG.MAX_ENEMIES) {
                    const worldCenterX = GAME_CONFIG.WORLD_WIDTH / 2;
                    const worldCenterY = GAME_CONFIG.WORLD_HEIGHT / 2;
                    let clusterX, clusterY, distanceToCenter;
                    do {
                        clusterX = Math.random() * GAME_CONFIG.WORLD_WIDTH;
                        clusterY = Math.random() * GAME_CONFIG.WORLD_HEIGHT;
                        distanceToCenter = getDistance({x: clusterX, y: clusterY}, {x: worldCenterX, y: worldCenterY});
                    } while (distanceToCenter < GAME_CONFIG.SAFE_ZONE_RADIUS + 200);
            
                    const clusterSize = Math.floor(Math.random() * 4) + 3;
                    const newEnemies: Enemy[] = [];
                    for (let i = 0; i < clusterSize; i++) {
                         const angle = Math.random() * Math.PI * 2;
                         const radius = Math.random() * 80;
                         const x = clusterX + Math.cos(angle) * radius;
                         const y = clusterY + Math.sin(angle) * radius;
                 
                         if (getDistance({x, y}, {x: worldCenterX, y: worldCenterY}) < GAME_CONFIG.SAFE_ZONE_RADIUS) {
                             continue;
                         }
                 
                         const typeRoll = Math.random();
                         let type = EnemyType.Grunt;
                         if (typeRoll > 0.9) type = EnemyType.Tank;
                         else if (typeRoll > 0.75) type = EnemyType.Ranger;
                         else if (typeRoll > 0.5) type = EnemyType.Scout;
                         
                         newEnemies.push(new Enemy({ x, y }, type));
                    }
                    return [...prevEnemies, ...newEnemies];
                }
                return prevEnemies;
            });
        }, 10000);

        return () => clearInterval(spawnInterval);
    }, []);


    const handleReturnToSelect = () => {
        onReturnToSelect(player.toCharacterData());
    };

    const toggleInventory = useCallback(() => {
        setInventoryOpen(prev => !prev);
    }, []);
    
    // Game loop
    useGameLoop(() => {
        if (!canvasRef.current || isInventoryOpen || interactingNPC) return;

        // Update player
        player.update(pressedKeysRef.current, mousePositionRef.current, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
        if (player.isDead) {
            onDeath(player.getGameStats(), player.toCharacterData());
            return;
        }

        // Check for nearby NPCs for interaction prompt
        const closeNPC = npcs.find(npc => getDistance(player.position, npc.position) < npc.interactionRadius);
        setNearbyNPC(closeNPC || null);

        // Update enemies
        const updatedEnemies: Enemy[] = [];
        enemies.forEach(enemy => {
            enemy.update(player, gameContext, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
            if (enemy.isDead) {
                player.addXp(enemy.xpValue);
                player.kills++;
                setGameStats(player.getGameStats());

                // Drop gold
                const goldAmount = Math.floor(Math.random() * 5) + 1;
                for (let i = 0; i < goldAmount; i++) {
                    setGoldCoins(prev => [...prev, new GoldCoin(enemy.position)]);
                }
                
                // Drop items
                const item = getRandomItem(player.level, enemy.enemyType);
                if (item) {
                    gameContext.addDroppedItem(item, enemy.position);
                }
            } else {
                updatedEnemies.push(enemy);
            }
        });
        setEnemies(updatedEnemies);

        // Update projectiles
        const activeProjectiles: Projectile[] = [];
        projectiles.forEach(p => {
            p.update();
            let hit = false;
            
            const targets = p.ownerId === player.id ? enemies : [player];
            for (const target of targets) {
                if (target.isDead) continue;
                if (getDistance(p.position, target.position) < p.radius + target.radius) {
                    p.onHit(target, gameContext);
                    hit = true;
                    if (!p.piercing) break;
                }
            }

            if (!(hit && !p.piercing) && !p.isExpired()) {
                activeProjectiles.push(p);
            }
        });
        setProjectiles(activeProjectiles);
        
        // Update other entities
        setFloatingTexts(prev => prev.filter(ft => { ft.update(); return !ft.isExpired(); }));
        setGoldCoins(prev => prev.filter(gc => {
            gc.update(player.position);
            if (getDistance(gc.position, player.position) < player.radius) {
                player.gold++;
                setGameStats(player.getGameStats());
                return false;
            }
            return true;
        }));
        setDroppedItems(prev => prev.filter(di => {
             di.update(player);
             if (getDistance(di.position, player.position) < player.radius) {
                 const itemToPickUp = di.item;
                 if (itemToPickUp.rarity >= ItemRarity.Rare) {
                    player.logEvent(`Picked up ${itemToPickUp.name}`);
                 }

                // Stacking Logic
                if (itemToPickUp.stackable) {
                    const existingStackIndex = player.inventory.findIndex(slot => 
                        slot && slot.id === itemToPickUp.id && (slot.quantity || 0) < 999
                    );
                    if (existingStackIndex !== -1) {
                        const existingStack = player.inventory[existingStackIndex]!;
                        existingStack.quantity = (existingStack.quantity || 0) + (itemToPickUp.quantity || 1);
                        setPlayer(new Player(player.toCharacterData()));
                        return false; // Item stacked
                    }
                }

                // Add to empty slot
                const emptySlot = player.inventory.findIndex(slot => !slot);
                if (emptySlot !== -1) {
                    player.inventory[emptySlot] = itemToPickUp;
                    setPlayer(new Player(player.toCharacterData())); 
                    return false; // Item picked up
                }
             }
             return true; // Keep item on ground
        }));
        setVisualEffects(prev => prev.filter(ve => { ve.update(); return !ve.isExpired(); }));
        setGroundEffects(prev => prev.filter(ge => { ge.update(enemies, gameContext); return !ge.isExpired(); }));
        
        // Drawing
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        
        // Camera follow player
        ctx.translate(canvas.width / 2 - player.position.x, canvas.height / 2 - player.position.y);
        
        // Draw world background
        ctx.fillStyle = '#111827'; // gray-900
        ctx.fillRect(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);

        // Draw grid
        const gridSize = 40; // NPC radius is 18, diameter 36. 40 is a nice round number.
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;

        for (let x = 0; x <= GAME_CONFIG.WORLD_WIDTH; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, GAME_CONFIG.WORLD_HEIGHT);
            ctx.stroke();
        }
        for (let y = 0; y <= GAME_CONFIG.WORLD_HEIGHT; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(GAME_CONFIG.WORLD_WIDTH, y);
            ctx.stroke();
        }
        
        // Draw safe zone
        const worldCenterX = GAME_CONFIG.WORLD_WIDTH / 2;
        const worldCenterY = GAME_CONFIG.WORLD_HEIGHT / 2;
        const safeZoneRadius = GAME_CONFIG.SAFE_ZONE_RADIUS;
        const gradient = ctx.createRadialGradient(worldCenterX, worldCenterY, safeZoneRadius - 20, worldCenterX, worldCenterY, safeZoneRadius + 20);
        gradient.addColorStop(0, 'rgba(56, 189, 248, 0)');
        gradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.2)');
        gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');

        ctx.beginPath();
        ctx.arc(worldCenterX, worldCenterY, safeZoneRadius + 20, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();


        // Draw entities
        groundEffects.forEach(e => e.draw(ctx));
        goldCoins.forEach(gc => gc.draw(ctx));
        droppedItems.forEach(di => di.draw(ctx));
        projectiles.forEach(p => p.draw(ctx));
        enemies.forEach(e => e.draw(ctx));
        npcs.forEach(n => n.draw(ctx));
        player.draw(ctx);
        visualEffects.forEach(ve => ve.draw(ctx));
        floatingTexts.forEach(ft => ft.draw(ctx));
        
        ctx.restore();
    });

    const useSkill = useCallback((index: number) => {
        if (isInventoryOpen || interactingNPC) return;

        // 1. Safe Zone Check
        const worldCenter = { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 };
        if (getDistance(player.position, worldCenter) < GAME_CONFIG.SAFE_ZONE_RADIUS) {
            gameContext.addFloatingText(new FloatingText("Cannot use skills in the safe zone", player.position, '#facc15', 14));
            return;
        }

        const newPlayer = new Player(player.toCharacterData());
        const skillState = newPlayer.skills[index];
        if (!skillState) return;

        // 2. Cooldown Check
        const now = Date.now();
        if (now - skillState.lastUsed < skillState.definition.cooldown) {
            return; // UI shows cooldown, no text needed
        }

        // 3. Targeting & Range Check
        let skillTarget: Character | Vector2D;
        let finalMousePosition = mousePositionRef.current;

        const canvas = canvasRef.current;
        if(canvas) {
             finalMousePosition = {
                x: mousePositionRef.current.x - (canvas.width / 2 - newPlayer.position.x),
                y: mousePositionRef.current.y - (canvas.height / 2 - newPlayer.position.y),
            };
        }

        if (skillState.definition.requiresTarget) {
            const enemyTarget = findNearestEnemy(newPlayer.position, enemies, skillState.definition.range);
            if (!enemyTarget) {
                gameContext.addFloatingText(new FloatingText("No target in range", newPlayer.position, '#f87171', 14));
                return; // EXIT: No target in range for a required-target skill
            }
            skillTarget = enemyTarget;
        } else {
            skillTarget = finalMousePosition;
        }

        // 4. Execute skill
        skillState.definition.effect(newPlayer, skillTarget, gameContext);
        skillState.lastUsed = now;
        
        setPlayer(newPlayer);
    }, [player, enemies, gameContext, isInventoryOpen, interactingNPC]);


    const handleItemEquip = (inventoryIndex: number) => {
        if (player.isInCombat) {
            gameContext.addFloatingText(new FloatingText("Cannot change equipment in combat", player.position, '#f87171'));
            return;
        }
        const item = player.inventory[inventoryIndex];
        if (!item || item.type !== 'Equipment' || !item.slot) return;
        
        const currentItem = player.equipment[item.slot];
        player.equipment[item.slot] = item;
        player.inventory[inventoryIndex] = currentItem; // Swap
        
        player.recalculateStats();
        setPlayer(new Player(player.toCharacterData()));
    };

    const handleItemUnequip = (itemSlot: ItemSlot) => {
        if (player.isInCombat) {
            gameContext.addFloatingText(new FloatingText("Cannot change equipment in combat", player.position, '#f87171'));
            return;
        }
        const item = player.equipment[itemSlot];
        if (!item) return;

        const emptySlot = player.inventory.findIndex(slot => !slot);
        if (emptySlot === -1) {
            // No space in inventory, maybe show a message
            return;
        }

        player.inventory[emptySlot] = item;
        player.equipment[itemSlot] = null;
        
        player.recalculateStats();
        setPlayer(new Player(player.toCharacterData()));
    };

    const handleCraft = (recipe: Recipe) => {
        // Check ingredients again
        const hasIngredients = recipe.ingredients.every(ing => {
            const material = player.inventory.find(item => item && item.id === ing.materialId);
            return material && material.quantity && material.quantity >= ing.quantity;
        });

        const hasSpace = player.inventory.some(slot => !slot);

        if (!hasIngredients || !hasSpace) return;
        
        // Consume ingredients
        recipe.ingredients.forEach(ing => {
            const invItem = player.inventory.find(item => item && item.id === ing.materialId)!;
            invItem.quantity! -= ing.quantity;
            if(invItem.quantity! <= 0) {
                const index = player.inventory.indexOf(invItem);
                player.inventory[index] = null;
            }
        });

        // Add crafted item
        const emptySlot = player.inventory.findIndex(slot => !slot)!;
        player.inventory[emptySlot] = { ...recipe.result };

        setPlayer(new Player(player.toCharacterData()));
    };

    const handleItemSell = (item: Item, inventoryIndex: number) => {
        // Create a fresh player instance from the latest data to avoid state mutation
        const newPlayer = new Player(player.toCharacterData());
        const itemToSell = newPlayer.inventory[inventoryIndex];

        // Ensure the item exists and matches what the UI expects to sell
        if (!itemToSell || itemToSell.id !== item.id) {
            console.error("Mismatch between item to sell and inventory state.");
            return;
        }

        const price = itemToSell.sellPrice || 0;
        if (price <= 0) return;

        const sellQuantity = 1; // Sell one item at a time
        const totalValue = price * sellQuantity;

        newPlayer.gold += totalValue;

        // "reducing the quantity or removing the slot if the quantity becomes zero"
        if (itemToSell.stackable && itemToSell.quantity && itemToSell.quantity > sellQuantity) {
            itemToSell.quantity -= sellQuantity;
        } else {
            newPlayer.inventory[inventoryIndex] = null;
        }
        
        setPlayer(newPlayer);
        gameContext.addFloatingText(new FloatingText(`+${totalValue} G`, {x: newPlayer.position.x, y: newPlayer.position.y + 20}, '#facc15'));
    };

    const handleDevSpawnItem = (itemId: string) => {
        if (!isDevMode) return;
        const itemToSpawn = ITEMS_DB[itemId];
        if (!itemToSpawn) return;

        const newPlayer = new Player(player.toCharacterData());
        const emptySlot = newPlayer.inventory.findIndex(slot => !slot);

        if (emptySlot !== -1) {
            newPlayer.inventory[emptySlot] = { ...itemToSpawn };
            setPlayer(newPlayer);
        } else {
            gameContext.addFloatingText(new FloatingText("Inventory Full!", newPlayer.position, '#f87171'));
        }
    };
    
    // Using refs to pass latest state to event handlers without re-binding them
    const playerRef = useRef(player);
    playerRef.current = player;
    const useSkillRef = useRef(useSkill);
    useSkillRef.current = useSkill;
    const interactingNPCRef = useRef(interactingNPC);
    interactingNPCRef.current = interactingNPC;
    const nearbyNPCRef = useRef(nearbyNPC);
    nearbyNPCRef.current = nearbyNPC;
    const isInventoryOpenRef = useRef(isInventoryOpen);
    isInventoryOpenRef.current = isInventoryOpen;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            pressedKeysRef.current.add(e.key.toLowerCase());
            if (e.key.toLowerCase() === 'i') {
                toggleInventory();
            }
            if (e.key.toLowerCase() === 'e') {
                if (interactingNPCRef.current) {
                    setInteractingNPC(null);
                } else if (nearbyNPCRef.current) {
                    if(!isInventoryOpenRef.current) setInteractingNPC(nearbyNPCRef.current);
                }
            }
            if (['1', '2', '3', '4', '5'].includes(e.key)) {
                useSkillRef.current(parseInt(e.key, 10) - 1);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            pressedKeysRef.current.delete(e.key.toLowerCase());
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            mousePositionRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [toggleInventory]);


    return (
        <div className="relative w-screen h-screen">
            <canvas
                ref={canvasRef}
                width={window.innerWidth}
                height={window.innerHeight}
                className="bg-black"
            />
            <HUD 
                player={player} 
                gameStats={gameStats}
                enemies={enemies}
                npcs={npcs}
                nearbyNPC={nearbyNPC}
                toggleInventory={toggleInventory}
                onReturnToSelect={handleReturnToSelect}
                onUseSkill={useSkill}
                isDevMode={isDevMode}
                onDevSpawnItem={handleDevSpawnItem}
            />
            {isInventoryOpen && (
                <Inventory 
                    characterData={player.toCharacterData()}
                    onItemEquip={handleItemEquip}
                    onItemUnequip={handleItemUnequip}
                    toggleInventory={toggleInventory}
                />
            )}
            {interactingNPC && (
                <NPCInteraction
                    npc={interactingNPC}
                    characterData={player.toCharacterData()}
                    recipes={CRAFTING_RECIPES_DB}
                    onCraft={handleCraft}
                    onSell={handleItemSell}
                    onClose={() => setInteractingNPC(null)}
                />
            )}
        </div>
    );
};

export default Game;
