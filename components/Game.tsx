
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CharacterData, GameStats, Vector2D, Item, ItemSlot } from '../game/types';
import { Player } from '../game/entities/Player';
import { Enemy, EnemyType } from '../game/entities/Enemy';
import { Projectile } from '../game/entities/Projectile';
import { FloatingText } from '../game/entities/FloatingText';
import { DroppedItem } from '../game/entities/DroppedItem';
import { GoldCoin } from '../game/entities/GoldCoin';
import { GroundEffect } from '../game/entities/GroundEffect';
import { VisualEffect } from '../game/entities/VisualEffect';
import { GAME_CONFIG } from '../game/constants';
import { getDistance } from '../game/utils';
import { getRandomItem } from '../game/items';
import useGameLoop from '../hooks/useGameLoop';
import useKeyboardInput from '../hooks/useKeyboardInput';
import HUD from './HUD';
import Inventory from './Inventory';

interface GameProps {
  characterData: CharacterData;
  onDeath: (stats: GameStats, finalCharacterData: CharacterData) => void;
  onReturnToSelect: (finalCharacterData: CharacterData) => void;
}

const Game: React.FC<GameProps> = ({ characterData, onDeath, onReturnToSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Player | null>(null);
  if (playerRef.current === null) {
      playerRef.current = new Player(JSON.parse(JSON.stringify(characterData)));
  }

  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const droppedItemsRef = useRef<DroppedItem[]>([]);
  const goldCoinsRef = useRef<GoldCoin[]>([]);
  const groundEffectsRef = useRef<GroundEffect[]>([]);
  const visualEffectsRef = useRef<VisualEffect[]>([]);

  const [gameStats, setGameStats] = useState({ kills: characterData.kills, gold: characterData.gold });
  const lastEnemySpawn = useRef(Date.now());
  const cameraPos = useRef<Vector2D>({ x: 0, y: 0 });
  const mousePos = useRef<Vector2D>({ x: 0, y: 0 });

  const [isInventoryOpen, setInventoryOpen] = useState(false);
  
  const pressedKeys = useKeyboardInput();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 'i') {
            setInventoryOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const gameContext = {
      player: playerRef.current!,
      enemies: enemiesRef.current,
      projectiles: projectilesRef.current,
      addProjectile: (p: Projectile) => projectilesRef.current.push(p),
      addFloatingText: (ft: FloatingText) => floatingTextsRef.current.push(ft),
      addVisualEffect: (ve: VisualEffect) => visualEffectsRef.current.push(ve),
      addGroundEffect: (ge: GroundEffect) => groundEffectsRef.current.push(ge),
  };

  const handleCollisions = useCallback(() => {
    const player = playerRef.current!;
    
    projectilesRef.current = projectilesRef.current.filter(projectile => {
        let hit = false;
        if (projectile.ownerId === player.id) { // Player projectile
            enemiesRef.current.forEach(enemy => {
                if (!hit && projectile.hasCollided(enemy)) {
                    const ft = enemy.takeDamage(projectile.damage);
                    if (ft) floatingTextsRef.current.push(ft);
                    if (enemy.isDead) handleEnemyDeath(enemy);
                    hit = true;
                }
            });
        } else { // Enemy projectile
            if (projectile.hasCollided(player)) {
                const ft = player.takeDamage(projectile.damage);
                if (ft) floatingTextsRef.current.push(ft);
                if (player.isDead) handlePlayerDeath();
                hit = true;
            }
        }
        return !hit;
    });
    
    droppedItemsRef.current = droppedItemsRef.current.filter(item => {
        if (getDistance(player.position, item.position) < player.radius) {
            return !player.collectItem(item.item);
        }
        return true;
    });
    
    goldCoinsRef.current = goldCoinsRef.current.filter(coin => {
        if (getDistance(player.position, coin.position) < player.radius) {
            player.collectGold(1);
            setGameStats(prev => ({ ...prev, gold: player.characterData.gold }));
            return false;
        }
        return true;
    });
  }, []);
  
  const handleEnemyDeath = useCallback((enemy: Enemy) => {
      const player = playerRef.current!;
      player.gainXP(enemy.xpValue, gameContext);
      setGameStats(prev => ({...prev, kills: prev.kills + 1}));
      
      const goldAmount = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < goldAmount; i++) {
          goldCoinsRef.current.push(new GoldCoin(enemy.position));
      }
      
      if (Math.random() < 0.1) { // 10% chance to drop item
          const item = getRandomItem(player.level);
          if (item) {
              droppedItemsRef.current.push(new DroppedItem(enemy.position, item));
          }
      }
  }, []);
  
  const handlePlayerDeath = useCallback(() => {
      const player = playerRef.current!;
      const finalStats = { level: player.level, kills: gameStats.kills, gold: gameStats.gold };
      const finalCharacterData = player.getFinalCharacterData();
      onDeath(finalStats, finalCharacterData);
  }, [gameStats, onDeath]);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const player = playerRef.current!;
    
    cameraPos.current = {
      x: player.position.x - canvas.width / 2,
      y: player.position.y - canvas.height / 2,
    };
    
    cameraPos.current.x = Math.max(0, Math.min(cameraPos.current.x, GAME_CONFIG.WORLD_WIDTH - canvas.width));
    cameraPos.current.y = Math.max(0, Math.min(cameraPos.current.y, GAME_CONFIG.WORLD_HEIGHT - canvas.height));
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-cameraPos.current.x, -cameraPos.current.y);
    
    drawGrid(ctx, canvas.width, canvas.height);
    
    groundEffectsRef.current.forEach(ge => ge.draw(ctx));
    droppedItemsRef.current.forEach(di => di.draw(ctx));
    goldCoinsRef.current.forEach(gc => gc.draw(ctx));
    enemiesRef.current.forEach(enemy => enemy.draw(ctx));
    player.draw(ctx);
    projectilesRef.current.forEach(p => p.draw(ctx));
    visualEffectsRef.current.forEach(ve => ve.draw(ctx));
    floatingTextsRef.current.forEach(ft => ft.draw(ctx));
    
    ctx.restore();
  }, []);

  const spawnEnemy = useCallback(() => {
    const player = playerRef.current!;
    const spawnDistance = 800;
    const angle = Math.random() * Math.PI * 2;
    const x = player.position.x + Math.cos(angle) * spawnDistance;
    const y = player.position.y + Math.sin(angle) * spawnDistance;
    
    const clampedX = Math.max(0, Math.min(x, GAME_CONFIG.WORLD_WIDTH));
    const clampedY = Math.max(0, Math.min(y, GAME_CONFIG.WORLD_HEIGHT));
    
    const enemyTypes = Object.values(EnemyType).filter(v => !isNaN(Number(v)));
    const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)] as EnemyType;

    enemiesRef.current.push(new Enemy({ x: clampedX, y: clampedY }, randomType));
  }, []);

  const gameLoop = useCallback(() => {
    const player = playerRef.current!;
    if (player.isDead) return;

    player.setMousePosition({ x: mousePos.current.x + cameraPos.current.x, y: mousePos.current.y + cameraPos.current.y });
    if (!isInventoryOpen) {
        player.update(pressedKeys, gameContext);
    }
    enemiesRef.current.forEach(enemy => enemy.update(player, gameContext, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT));
    projectilesRef.current.forEach(p => p.update());
    floatingTextsRef.current.forEach(ft => ft.update());
    droppedItemsRef.current.forEach(di => di.update(player));
    goldCoinsRef.current.forEach(gc => gc.update(player.position));
    groundEffectsRef.current.forEach(ge => ge.update(enemiesRef.current, floatingTextsRef.current));
    visualEffectsRef.current.forEach(ve => ve.update());
    
    handleCollisions();

    if (Date.now() - lastEnemySpawn.current > GAME_CONFIG.ENEMY_SPAWN_RATE) {
      spawnEnemy();
      lastEnemySpawn.current = Date.now();
    }
    
    enemiesRef.current = enemiesRef.current.filter(e => !e.isDead);
    projectilesRef.current = projectilesRef.current.filter(p => !p.isExpired());
    floatingTextsRef.current = floatingTextsRef.current.filter(ft => !ft.isExpired());
    groundEffectsRef.current = groundEffectsRef.current.filter(ge => !ge.isExpired());
    visualEffectsRef.current = visualEffectsRef.current.filter(ve => !ve.isExpired());
    
    drawGame();
  }, [pressedKeys, isInventoryOpen, handleCollisions, spawnEnemy, drawGame]);

  const drawGrid = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    const gridSize = 50;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    const startX = Math.floor(cameraPos.current.x / gridSize) * gridSize;
    const endX = startX + canvasWidth + gridSize;
    const startY = Math.floor(cameraPos.current.y / gridSize) * gridSize;
    const endY = startY + canvasHeight + gridSize;
    
    for (let x = startX; x < endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }
    for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    
    const handleMouseMove = (e: MouseEvent) => {
        mousePos.current = { x: e.clientX, y: e.clientY };
    };

    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
        window.removeEventListener('resize', resize);
        canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  useGameLoop(gameLoop);
  
  const handleReturnToSelect = () => {
      onReturnToSelect(playerRef.current!.getFinalCharacterData());
  };
  
  const handleEquip = (item: Item, inventoryIndex: number) => {
      playerRef.current!.equipItem(item, inventoryIndex);
  };
  
  const handleUnequip = (slot: ItemSlot) => {
      playerRef.current!.unequipItem(slot);
  };

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="absolute inset-0 bg-gray-900" />
      <HUD 
        player={playerRef.current} 
        gameStats={gameStats}
        onToggleInventory={() => setInventoryOpen(prev => !prev)}
        onReturnToSelect={handleReturnToSelect}
      />
      <Inventory
        inventory={playerRef.current!.characterData.inventory}
        equipment={playerRef.current!.characterData.equipment}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
        isOpen={isInventoryOpen}
        onClose={() => setInventoryOpen(false)}
      />
    </div>
  );
};

export default Game;