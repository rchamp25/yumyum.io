import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CharacterData, GameStats, GameContext, Item, Vector2D, ItemSlot, NPCType, Recipe } from '../game/types';
import { Player } from '../game/entities/Player';
import { Enemy, EnemyType } from '../game/entities/Enemy';
import { Projectile } from '../game/entities/Projectile';
import { FloatingText } from '../game/entities/FloatingText';
import { GoldCoin } from '../game/entities/GoldCoin';
import { DroppedItem } from '../game/entities/DroppedItem';
import { VisualEffect } from '../game/entities/VisualEffect';
import { GroundEffect } from '../game/entities/GroundEffect';
import { NPC } from '../game/entities/NPC';
import useGameLoop from '../hooks/useGameLoop';
import useKeyboardInput from '../hooks/useKeyboardInput';
import { getDistance, findNearestEnemy } from '../game/utils';
import { GAME_CONFIG } from '../game/constants';
import { getRandomItem, CRAFTING_RECIPES_DB } from '../game/items';

import HUD from './HUD';
import SkillBar from './SkillBar';
import Inventory from './Inventory';
import NPCInteraction from './NPCInteraction';
import CraftingUI from './CraftingUI';

interface GameProps {
  characterData: CharacterData;
  onDeath: (stats: GameStats, finalCharacterData: CharacterData) => void;
  onReturnToSelect: (finalCharacterData: CharacterData) => void;
}

const Game: React.FC<GameProps> = ({ characterData, onDeath, onReturnToSelect }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const keys = useKeyboardInput();
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // Game state refs
    const playerRef = useRef<Player | null>(null);
    const enemiesRef = useRef<Enemy[]>([]);
    const projectilesRef = useRef<Projectile[]>([]);
    const floatingTextsRef = useRef<FloatingText[]>([]);
    const goldCoinsRef = useRef<GoldCoin[]>([]);
    const droppedItemsRef = useRef<DroppedItem[]>([]);
    const visualEffectsRef = useRef<VisualEffect[]>([]);
    const groundEffectsRef = useRef<GroundEffect[]>([]);
    const npcsRef = useRef<NPC[]>([]);
    
    // UI state
    const [playerState, setPlayerState] = useState<Player | null>(null);
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [interactingNPC, setInteractingNPC] = useState<NPC | null>(null);
    const [isCraftingOpen, setIsCraftingOpen] = useState(false);
    
    const lastEnemySpawn = useRef(0);

    const gameContext: GameContext = {
        addProjectile: (p: Projectile) => projectilesRef.current.push(p),
        addFloatingText: (ft: FloatingText) => floatingTextsRef.current.push(ft),
        addVisualEffect: (ve: VisualEffect) => visualEffectsRef.current.push(ve),
        addGroundEffect: (ge: GroundEffect) => groundEffectsRef.current.push(ge),
        addDroppedItem: (item: Item, pos: Vector2D) => droppedItemsRef.current.push(new DroppedItem(pos, item)),
        spawnEnemy: () => spawnEnemy(true),
        get player() { return playerRef.current as Player },
        get enemies() { return enemiesRef.current },
        get projectiles() { return projectilesRef.current },
    };

    // Initialization
    useEffect(() => {
        const player = new Player({ x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 }, characterData);
        playerRef.current = player;
        setPlayerState(player);
        
        npcsRef.current.push(new NPC({ x: GAME_CONFIG.WORLD_WIDTH / 2 - 100, y: GAME_CONFIG.WORLD_HEIGHT / 2 - 100 }, 'Hephaestus', NPCType.Crafter));

        const handleMouseMove = (e: MouseEvent) => {
            if (canvasRef.current && playerRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                const scaleX = canvasRef.current.width / rect.width;
                const scaleY = canvasRef.current.height / rect.height;
                const cameraX = playerRef.current.position.x - canvasRef.current.width / 2;
                const cameraY = playerRef.current.position.y - canvasRef.current.height / 2;
                setMousePosition({
                    x: (e.clientX - rect.left) * scaleX + cameraX,
                    y: (e.clientY - rect.top) * scaleY + cameraY
                });
            }
        };
        
        const handleKeyDown = (e: KeyboardEvent) => {
             if (e.key.toLowerCase() === 'i') toggleInventory();
             if (e.key.toLowerCase() === 'e') {
                 if (interactingNPC) {
                    setInteractingNPC(null);
                 } else {
                    const player = playerRef.current;
                    if (!player) return;
                    const nearbyNPC = npcsRef.current.find(npc => getDistance(player.position, npc.position) < npc.interactionRadius);
                    if (nearbyNPC) setInteractingNPC(nearbyNPC);
                 }
             }
             if (e.key >= '1' && e.key <= '5') {
                 playerRef.current?.useSkill(parseInt(e.key) - 1, mousePosition, gameContext);
             }
        };
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('keydown', handleKeyDown);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [characterData]);
    
    const spawnEnemy = useCallback((force = false) => {
        if (!force && (Date.now() - lastEnemySpawn.current < GAME_CONFIG.ENEMY_SPAWN_INTERVAL || enemiesRef.current.length >= GAME_CONFIG.MAX_ENEMIES)) {
            return;
        }
        lastEnemySpawn.current = Date.now();
        const player = playerRef.current;
        if (!player) return;

        const angle = Math.random() * Math.PI * 2;
        const radius = 800;
        const x = player.position.x + Math.cos(angle) * radius;
        const y = player.position.y + Math.sin(angle) * radius;
        
        const enemyTypeRoll = Math.random();
        let enemyType: EnemyType;
        if (enemyTypeRoll > 0.9) enemyType = EnemyType.Tank;
        else if (enemyTypeRoll > 0.7) enemyType = EnemyType.Ranger;
        else if (enemyTypeRoll > 0.5) enemyType = EnemyType.Scout;
        else enemyType = EnemyType.Grunt;

        enemiesRef.current.push(new Enemy({ x, y }, enemyType));
    }, []);

    const handleCollisions = useCallback(() => {
        const player = playerRef.current;
        if (!player || player.isDead) return;

        // Projectiles vs Characters
        projectilesRef.current.forEach(proj => {
            if (proj.isExpired()) return;

            if (proj.ownerId !== player.id) { // Enemy projectile
                if (getDistance(proj.position, player.position) < player.radius + proj.radius) {
                    const ft = player.takeDamage(proj.damage);
                    if (ft) floatingTextsRef.current.push(ft);
                    projectilesRef.current = projectilesRef.current.filter(p => p.id !== proj.id);
                }
            } else { // Player projectile
                enemiesRef.current.forEach(enemy => {
                    if (!enemy.isDead && getDistance(proj.position, enemy.position) < enemy.radius + proj.radius && !proj.hitIds.includes(enemy.id)) {
                        const ft = enemy.takeDamage(proj.damage);
                        if(ft) floatingTextsRef.current.push(ft);
                        
                        // Handle on-hit effects
                        if (proj.onHitEffects) {
                           if (proj.onHitEffects.type === 'explosion' && proj.onHitEffects.radius) {
                               gameContext.addVisualEffect(new VisualEffect(proj.position, 'fire_explosion', 500, { radius: proj.onHitEffects.radius }));
                               enemiesRef.current.forEach(e => {
                                   if(e.id !== enemy.id && getDistance(proj.position, e.position) < proj.onHitEffects!.radius!) {
                                       const explosionFt = e.takeDamage(proj.damage * 0.5); // AoE damage
                                       if(explosionFt) floatingTextsRef.current.push(explosionFt);
                                   }
                               });
                           }
                           if (proj.onHitEffects.type === 'status' && proj.onHitEffects.effect) {
                               enemy.addStatusEffect(proj.onHitEffects.effect);
                           }
                        }

                        if (!proj.piercing) {
                           projectilesRef.current = projectilesRef.current.filter(p => p.id !== proj.id);
                        } else {
                           proj.hitIds.push(enemy.id);
                        }
                    }
                });
            }
        });
        
        // Player vs Items
        goldCoinsRef.current = goldCoinsRef.current.filter(coin => {
            if(getDistance(player.position, coin.position) < player.radius) {
                player.addGold(1);
                return false;
            }
            return true;
        });

        droppedItemsRef.current = droppedItemsRef.current.filter(dItem => {
            if(getDistance(player.position, dItem.position) < player.radius) {
                if(player.addItem(dItem.item)){
                    return false;
                }
            }
            return true;
        });

        // Enemy death logic
        enemiesRef.current.forEach(enemy => {
            if (enemy.isDead && !(enemy as any).processedDeath) {
                player.addXP(enemy.xpValue);
                player.incrementKills();
                for (let i = 0; i < Math.floor(Math.random() * 5) + 1; i++) {
                    goldCoinsRef.current.push(new GoldCoin(enemy.position));
                }
                const dropped = getRandomItem(player.characterData.level, enemy.enemyType);
                if (dropped) {
                    droppedItemsRef.current.push(new DroppedItem(enemy.position, dropped));
                }
                (enemy as any).processedDeath = true;
            }
        });
    }, [gameContext]);

    const update = useCallback(() => {
        const player = playerRef.current;
        if (!player) return;

        // --- Updates ---
        player.update(keys, mousePosition, gameContext);
        enemiesRef.current.forEach(e => e.update(player, gameContext, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT));
        projectilesRef.current.forEach(p => p.update());
        floatingTextsRef.current.forEach(ft => ft.update());
        goldCoinsRef.current.forEach(gc => gc.update(player.position));
        droppedItemsRef.current.forEach(di => di.update(player));
        visualEffectsRef.current.forEach(ve => ve.update());
        groundEffectsRef.current.forEach(ge => ge.update(enemiesRef.current, gameContext));
        
        // --- Collisions ---
        handleCollisions();
        
        // --- State changes ---
        if (player.isDead) {
            onDeath(player.characterData, player.getFinalCharacterData());
            return;
        }

        // --- Spawning ---
        spawnEnemy();
        
        // --- Cleanup ---
        enemiesRef.current = enemiesRef.current.filter(e => !(e.isDead && (e as any).processedDeath));
        projectilesRef.current = projectilesRef.current.filter(p => !p.isExpired());
        floatingTextsRef.current = floatingTextsRef.current.filter(ft => !ft.isExpired());
        visualEffectsRef.current = visualEffectsRef.current.filter(ve => !ve.isExpired());
        groundEffectsRef.current = groundEffectsRef.current.filter(ge => !ge.isExpired());

        setPlayerState({ ...player });
    }, [keys, mousePosition, gameContext, onDeath, spawnEnemy, handleCollisions]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const player = playerRef.current;
        if (!canvas || !player) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear and setup camera
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(-player.position.x + canvas.width / 2, -player.position.y + canvas.height / 2);

        // Draw grid
        const gridSize = 50;
        ctx.beginPath();
        for (let x = 0; x <= GAME_CONFIG.WORLD_WIDTH; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, GAME_CONFIG.WORLD_HEIGHT);
        }
        for (let y = 0; y <= GAME_CONFIG.WORLD_HEIGHT; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(GAME_CONFIG.WORLD_WIDTH, y);
        }
        ctx.strokeStyle = '#27272a'; // zinc-800
        ctx.stroke();
        
        // Draw world boundaries
        ctx.strokeStyle = '#f59e0b'; // amber-500
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);

        // Draw entities
        groundEffectsRef.current.forEach(e => e.draw(ctx));
        droppedItemsRef.current.forEach(item => item.draw(ctx));
        goldCoinsRef.current.forEach(coin => coin.draw(ctx));
        enemiesRef.current.forEach(e => e.draw(ctx));
        player.draw(ctx);
        npcsRef.current.forEach(npc => npc.draw(ctx));
        projectilesRef.current.forEach(p => p.draw(ctx));
        visualEffectsRef.current.forEach(ve => ve.draw(ctx));
        floatingTextsRef.current.forEach(ft => ft.draw(ctx));

        ctx.restore();
    }, []);
    
    useGameLoop(() => {
        update();
        draw();
    });

    // UI Handlers
    const toggleInventory = () => setIsInventoryOpen(prev => !prev);

    const handleEquipItem = (inventoryIndex: number) => {
        playerRef.current?.equipItem(inventoryIndex);
        setPlayerState({...playerRef.current!});
    };

    const handleUnequipItem = (slot: ItemSlot) => {
        playerRef.current?.unequipItem(slot);
        setPlayerState({...playerRef.current!});
    };

    const handleLeave = () => {
        onReturnToSelect(playerRef.current!.getFinalCharacterData());
    };
    
    const handleCraftItem = (recipe: Recipe) => {
        if (playerRef.current?.craftItem(recipe)) {
            setPlayerState({ ...playerRef.current });
        } else {
            console.log("Crafting failed: Insufficient materials or inventory space.");
        }
    };
    
    return (
        <div className="relative w-screen h-screen overflow-hidden bg-gray-800">
            <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="absolute top-0 left-0" />
            <HUD player={playerState} enemies={enemiesRef.current} npcs={npcsRef.current} worldDimensions={{ width: GAME_CONFIG.WORLD_WIDTH, height: GAME_CONFIG.WORLD_HEIGHT }} onLeave={handleLeave} onToggleInventory={toggleInventory}/>
            <SkillBar skills={playerState?.skills || []}/>
            {isInventoryOpen && playerState && <Inventory characterData={playerState.characterData} onItemEquip={handleEquipItem} onItemUnequip={handleUnequipItem} toggleInventory={toggleInventory}/>}
            {interactingNPC && <NPCInteraction npc={interactingNPC} onClose={() => setInteractingNPC(null)} onOpenCrafting={() => { setIsCraftingOpen(true); setInteractingNPC(null); }}/>}
            {isCraftingOpen && playerState && <CraftingUI recipes={CRAFTING_RECIPES_DB} characterData={playerState.characterData} onCraft={handleCraftItem} onClose={() => setIsCraftingOpen(false)}/>}
        </div>
    );
};

export default Game;
