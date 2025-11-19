
import React from 'react';
import { Player } from '../game/entities/Player';
import { CoinIcon } from './icons';
import SkillBar from './SkillBar';
import { Enemy } from '../game/entities/Enemy';
import { NPC } from '../game/entities/NPC';
import { GAME_CONFIG } from '../game/constants';

interface HUDProps {
  player: Player | null;
  enemies: Enemy[];
  npcs: NPC[];
  nearbyNPC: NPC | null;
  onUseSkill: (index: number) => void;
  toggleInventory: () => void;
  isInventoryOpen: boolean;
}

const StatBar: React.FC<{ value: number; maxValue: number; color: string; label: string }> = ({ value, maxValue, color, label }) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="w-full bg-black/50 rounded-full h-6 border-2 border-gray-700 relative overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      ></div>
      <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm drop-shadow-md">
        {label}: {Math.round(value)} / {Math.round(maxValue)}
      </div>
    </div>
  );
};

const Minimap: React.FC<{ player: Player; enemies: Enemy[]; npcs: NPC[] }> = ({ player, enemies, npcs }) => {
    const mapSize = 200;
    const scale = mapSize / Math.max(GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);

    const playerX = player.position.x * scale;
    const playerY = player.position.y * scale;

    return (
        <div className="w-[200px] h-[200px] bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg border-2 border-gray-700 overflow-hidden relative">
            {/* Player Dot */}
            <div 
                className="absolute w-2 h-2 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${playerX}px`, top: `${playerY}px` }}
            ></div>
            {/* Enemy Dots */}
            {enemies.map(enemy => (
                 <div 
                    key={enemy.id}
                    className="absolute w-1.5 h-1.5 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${enemy.position.x * scale}px`, top: `${enemy.position.y * scale}px` }}
                ></div>
            ))}
             {/* NPC Dots */}
             {npcs.map(npc => (
                 <div 
                    key={npc.id}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${npc.position.x * scale}px`, top: `${npc.position.y * scale}px` }}
                ></div>
            ))}
        </div>
    );
};

const HUD: React.FC<HUDProps> = ({ player, enemies, npcs, nearbyNPC, onUseSkill, toggleInventory, isInventoryOpen }) => {
  if (!player) return null;

  const xpToNext = player.getXpToNextLevel();
  const xpPercentage = xpToNext !== Infinity ? (player.xp / xpToNext) * 100 : 100;

  return (
    <div className="absolute inset-0 pointer-events-none text-white">
      {/* Top Left - Player Info */}
      <div className="absolute top-4 left-4 w-72 p-3 bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700">
        <div className="flex items-center mb-2">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-xl font-bold border-2 border-gray-600 mr-3">
                {player.level}
            </div>
            <div>
                <h2 className="text-lg font-bold">{player.name}</h2>
                <p className="text-sm text-gray-400">{player.characterClass !== undefined ? ['Warrior', 'Mage', 'Archer'][player.characterClass] : 'Adventurer'}</p>
            </div>
        </div>
        <StatBar value={player.health} maxValue={player.maxHealth} color="#dc2626" label="HP" />
        <div className="w-full bg-black/50 rounded-full h-3 mt-2 border border-gray-700 relative overflow-hidden">
            <div className="absolute inset-0 text-white text-[10px] flex items-center justify-center font-bold">{Math.round(player.xp)} / {xpToNext !== Infinity ? xpToNext : 'MAX'}</div>
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${xpPercentage}%`}}></div>
        </div>
      </div>

      {/* Top Right - Vitals & Gold & Minimap */}
      <div className="absolute top-4 right-4 flex flex-col items-end space-y-2">
        <div className="p-3 bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 flex flex-col items-end space-y-2">
            <div className="flex items-center">
              <span className="font-bold text-lg">{player.gold.toLocaleString()}</span>
              <CoinIcon className="w-6 h-6 ml-2 text-yellow-400" />
            </div>
            <div className="text-sm text-gray-300">
              Damage: <span className="font-bold">{player.damage}</span>
            </div>
             <div className="text-sm text-gray-300">
              Speed: <span className="font-bold">{player.getFinalStats().speed.toFixed(1)}</span>
            </div>
            <div className="text-sm text-gray-300">
              Regen: <span className="font-bold">{player.getFinalStats().healthRegen?.toFixed(1)}/s</span>
            </div>
        </div>
        <Minimap player={player} enemies={enemies} npcs={npcs} />
      </div>

      {/* Center - Interaction Prompt */}
      {nearbyNPC && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-24 bg-gray-900/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-700">
            <p className="font-bold text-lg">Press [E] to talk to {nearbyNPC.name}</p>
        </div>
      )}
      
      {/* Bottom Center - Skill Bar */}
      {/* FIX: Pass the entire player object to SkillBar to provide context for skill locking. */}
      {player.skills && <SkillBar player={player} onUseSkill={onUseSkill} />}

      {/* Bottom Right - Inventory Button */}
       <button 
          onClick={toggleInventory}
          className="absolute bottom-4 right-4 bg-gray-800/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-700 pointer-events-auto hover:bg-gray-700/80 transition-colors"
       >
          <span className="font-bold">Inventory ({isInventoryOpen ? 'C' : 'I'})</span>
       </button>
    </div>
  );
};

export default HUD;
