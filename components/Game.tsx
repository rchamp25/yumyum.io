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
import { socketService } from '../services/socketService';


interface GameProps {
  characterData: CharacterData;
  onDeath: (stats: GameStats, finalCharacterData: CharacterData) => void;
  onReturnToSelect: (finalCharacterData: CharacterData) => void;
  isDevMode: boolean;
}

const Game: React.FC<GameProps> = ({ characterData, onDeath, onReturnToSelect, isDevMode }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [players, setPlayers] = useState<Map<string, Player>>(new Map());
    const [socketId, setSocketId] = useState<string | null>(null);

    // Single-player entities are commented out for Phase 1
    // const [enemies, setEnemies] = useState<Enemy[]>([]);
    // const [projectiles, setProjectiles] = useState<Projectile[]>([]);
    const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
    // const [goldCoins, setGoldCoins] = useState<GoldCoin[]>([]);
    // const [visualEffects, setVisualEffects] = useState<VisualEffect[]>([]);
    // const [groundEffects, setGroundEffects] = useState<GroundEffect[]>([]);
    // const [droppedItems, setDroppedItems] = useState<DroppedItem[]>([]);
    // const [npcs, setNpcs] = useState<NPC[]>([]);

    const [isInventoryOpen, setInventoryOpen] = useState(false);
    // const [interactingNPC, setInteractingNPC] = useState<NPC | null>(null);
    // const [nearbyNPC, setNearbyNPC] = useState<NPC | null>(null);

    const pressedKeysRef = useRef<Set<string>>(new Set());
    const mousePositionRef = useRef<Vector2D>({ x: 0, y: 0 });

    const myPlayer = socketId ? players.get(socketId) : null;

    // useEffect for socket connection and game state updates
    useEffect(() => {
        socketService.connect((id) => {
            setSocketId(id);
            socketService.joinGame(characterData);
        });

        socketService.onGameState((gameState) => {
             setPlayers(prevPlayers => {
                const newPlayers = new Map<string, Player>();
                const seenKeys = new Set<string>();

                for (const id in gameState) {
                    seenKeys.add(id);
                    const serverPlayer = gameState[id];
                    const existingPlayer = prevPlayers.get(id);

                    if (existingPlayer) {
                        existingPlayer.position = serverPlayer.position;
                        // In the future, we can update other states like health here
                        newPlayers.set(id, existingPlayer);
                    } else {
                        // A new player has joined
                        const newPlayer = new Player(serverPlayer.characterData);
                        newPlayer.id = id;
                        newPlayer.position = serverPlayer.position;
                        newPlayers.set(id, newPlayer);
                    }
                }
                return newPlayers;
            });
        });

        return () => {
            socketService.offGameState();
            socketService.disconnect();
        };
    }, [characterData]);

    const handleReturnToSelect = () => {
        if (myPlayer) {
            onReturnToSelect(myPlayer.toCharacterData());
        }
    };

    const toggleInventory = useCallback(() => {
        setInventoryOpen(prev => !prev);
    }, []);
    
    // Game loop - now primarily for rendering
    useGameLoop(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !myPlayer) return;

        // Drawing
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        
        // Camera follow my player
        ctx.translate(canvas.width / 2 - myPlayer.position.x, canvas.height / 2 - myPlayer.position.y);
        
        // Draw world background
        ctx.fillStyle = '#111827'; // gray-900
        ctx.fillRect(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);

        // Draw grid
        const gridSize = 40;
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
        // groundEffects.forEach(e => e.draw(ctx));
        // goldCoins.forEach(gc => gc.draw(ctx));
        // droppedItems.forEach(di => di.draw(ctx));
        // projectiles.forEach(p => p.draw(ctx));
        // enemies.forEach(e => e.draw(ctx));
        // npcs.forEach(n => n.draw(ctx));

        // Draw all players
        players.forEach(p => {
            p.draw(ctx);
            // Draw player names
            ctx.fillStyle = p.id === socketId ? 'white' : '#a5b4fc';
            ctx.textAlign = 'center';
            ctx.font = 'bold 12px sans-serif';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.fillText(p.name, p.position.x, p.position.y - p.radius - 5);
            ctx.shadowBlur = 0;
        });

        // visualEffects.forEach(ve => ve.draw(ctx));
        floatingTexts.forEach(ft => ft.draw(ctx));
        
        ctx.restore();
    });

    const handleItemEquip = (inventoryIndex: number) => {
        // This will become server-authoritative
    };

    const handleItemUnequip = (itemSlot: ItemSlot) => {
        // This will become server-authoritative
    };
    
    // Input handling useEffect
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            pressedKeysRef.current.add(e.key.toLowerCase());
            socketService.sendInput(Array.from(pressedKeysRef.current));

            if (e.key.toLowerCase() === 'i') {
                toggleInventory();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            pressedKeysRef.current.delete(e.key.toLowerCase());
            socketService.sendInput(Array.from(pressedKeysRef.current));
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
            {myPlayer && (
                 <HUD 
                    player={myPlayer} 
                    gameStats={myPlayer.getGameStats()}
                    enemies={[]} // Disabled for Phase 1
                    npcs={[]} // Disabled for Phase 1
                    nearbyNPC={null} // Disabled for Phase 1
                    toggleInventory={toggleInventory}
                    onReturnToSelect={handleReturnToSelect}
                    onUseSkill={() => {}} // Disabled for Phase 1
                    isDevMode={isDevMode}
                    onDevSpawnItem={() => {}} // Disabled for Phase 1
                />
            )}
            {isInventoryOpen && myPlayer && (
                <Inventory 
                    characterData={myPlayer.toCharacterData()}
                    onItemEquip={handleItemEquip}
                    onItemUnequip={handleItemUnequip}
                    toggleInventory={toggleInventory}
                />
            )}
            {/* NPC Interaction Disabled for Phase 1
            {interactingNPC && (
                <NPCInteraction
                    npc={interactingNPC}
                    characterData={player.toCharacterData()}
                    recipes={CRAFTING_RECIPES_DB}
                    onCraft={handleCraft}
                    onSell={handleItemSell}
                    onClose={() => setInteractingNPC(null)}
                />
            )} */}
        </div>
    );
};

export default Game;
