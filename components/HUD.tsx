import React from 'react';
import { Player } from '../game/entities/Player';
import { Enemy } from '../game/entities/Enemy';
import { NPC, NPCType } from '../game/entities/NPC';
import { InventoryIcon, HammerIcon } from './icons';

interface HUDProps {
  player: Player | null;
  enemies: Enemy[];
  npcs: NPC[];
  worldDimensions: { width: number; height: number };
  onLeave: () => void;
  onToggleInventory: () => void;
}

const StatBar: React.FC<{
  current: number;
  max: number;
  color: string;
  label: string;
}> = ({ current, max, color, label }) => {
  const percentage = max > 0 ? (current / max) * 100 : 0;
  return (
    <div className="w-full bg-gray-700 rounded-full h-5 relative overflow-hidden border-2 border-gray-900">
      <div
        className={`h-full rounded-full transition-all duration-300 ease-in-out ${color}`}
        style={{ width: `${percentage}%` }}
      />
      <span className="absolute inset-0 w-full text-center text-white text-xs font-bold flex items-center justify-center drop-shadow-md">
        {label}: {Math.round(current)} / {max}
      </span>
    </div>
  );
};

const Minimap: React.FC<{
    player: Player;
    enemies: Enemy[];
    npcs: NPC[];
    worldDimensions: { width: number; height: number };
}> = ({ player, enemies, npcs, worldDimensions }) => {
    const mapSize = 160; // size of minimap in pixels
    const scaleX = mapSize / worldDimensions.width;
    const scaleY = mapSize / worldDimensions.height;
    
    return (
        <div className="absolute top-4 right-4 w-40 h-40 bg-gray-900/70 backdrop-blur-sm border-2 border-gray-600 rounded-full overflow-hidden pointer-events-auto">
            <div className="absolute inset-0">
                {/* Player Dot */}
                <div 
                    className="absolute w-2 h-2 bg-blue-400 rounded-full border border-white"
                    style={{ 
                        left: `${player.position.x * scaleX - 4}px`, 
                        top: `${player.position.y * scaleY - 4}px` 
                    }}
                />
                {/* Enemy Dots */}
                {enemies.map(enemy => (
                    <div
                        key={enemy.id}
                        className="absolute w-1.5 h-1.5 bg-red-500 rounded-full"
                        style={{
                            left: `${enemy.position.x * scaleX - 3}px`,
                            top: `${enemy.position.y * scaleY - 3}px`,
                        }}
                    />
                ))}
                {/* NPC Icons */}
                {npcs.map(npc => (
                    <div
                        key={npc.id}
                        className="absolute"
                        style={{
                            left: `${npc.position.x * scaleX - 8}px`,
                            top: `${npc.position.y * scaleY - 8}px`,
                        }}
                    >
                        {npc.npcType === NPCType.Crafter && <HammerIcon className="w-4 h-4 text-yellow-400" />}
                    </div>
                ))}
            </div>
        </div>
    );
}


const HUD: React.FC<HUDProps> = ({ player, enemies, npcs, worldDimensions, onLeave, onToggleInventory }) => {
  if (!player) return null;

  const xpPercentage = player.xpToNextLevel > 0 ? (player.characterData.xp / player.xpToNextLevel) * 100 : 0;

  return (
    <div className="absolute inset-0 pointer-events-none">
        {/* Top Left - Player Info */}
        <div className="absolute top-4 left-4 w-1/4 max-w-sm p-4 bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 pointer-events-auto flex flex-col space-y-3">
            <div className="flex items-center">
                <div className="bg-gray-900 rounded-full w-12 h-12 flex items-center justify-center text-teal-400 text-2xl font-bold border-2 border-gray-600 mr-4">
                {player.characterData.level}
                </div>
                <div>
                <h2 className="text-xl font-bold text-white">{player.characterData.name}</h2>
                <p className="text-gray-400">{player.getClassName()}</p>
                </div>
            </div>
            <div className="space-y-2">
                <StatBar
                current={player.health}
                max={player.maxHealth}
                color="bg-red-500"
                label="HP"
                />
                <div className="w-full bg-purple-900 rounded-full h-3 relative overflow-hidden border border-gray-900">
                    <div
                        className="bg-purple-500 h-full rounded-full"
                        style={{ width: `${xpPercentage}%` }}
                    />
                    <span className="absolute inset-0 w-full text-center text-white text-xs font-bold flex items-center justify-center drop-shadow-md text-[10px]">
                        XP
                    </span>
                </div>
            </div>
            <div className="flex space-x-2 pt-2">
                 <button onClick={onLeave} className="flex-1 bg-gray-700 text-white font-bold py-2 px-4 rounded hover:bg-gray-600 transition-colors text-sm">
                    Leave World
                </button>
                <button onClick={onToggleInventory} className="bg-yellow-600 text-white p-2 rounded hover:bg-yellow-700 transition-colors">
                    <InventoryIcon className="w-5 h-5"/>
                </button>
            </div>
        </div>
        
        {/* Top Right - Minimap */}
        <Minimap player={player} enemies={enemies} npcs={npcs} worldDimensions={worldDimensions} />

    </div>
  );
};

export default HUD;
