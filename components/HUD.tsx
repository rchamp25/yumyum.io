
import React from 'react';
import { Player } from '../game/entities/Player';
import SkillBar from './SkillBar';
import { CharacterClass } from '../game/types';

interface HUDProps {
  player: Player | null;
  gameStats: { kills: number; gold: number; };
  onToggleInventory: () => void;
  onReturnToSelect: () => void;
}

const Bar: React.FC<{ value: number; maxValue: number; color: string; label: string }> = ({ value, maxValue, color, label }) => {
  const percentage = Math.max(0, (value / maxValue) * 100);
  return (
    <div className="w-full bg-gray-900/80 rounded-full h-6 border-2 border-gray-600 relative overflow-hidden">
      <div className={`${color} h-full rounded-full transition-all duration-300 ease-in-out`} style={{ width: `${percentage}%` }}></div>
      <span className="absolute inset-0 w-full h-full text-center text-white font-bold text-sm flex items-center justify-center drop-shadow-md">
        {label}: {Math.round(value)} / {Math.round(maxValue)}
      </span>
    </div>
  );
};

const HUD: React.FC<HUDProps> = ({ player, gameStats, onToggleInventory, onReturnToSelect }) => {
  if (!player) return null;

  return (
    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
      {/* Top Left: Player Info */}
      <div className="w-full md:w-1/3 lg:w-1/4 pointer-events-auto">
          <div className="bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg shadow-2xl border border-gray-700">
              <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-teal-500 rounded-full mr-4 flex items-center justify-center font-bold text-xl">{player.level}</div>
                  <div>
                      <h2 className="text-xl font-bold text-white">{player.characterData.name}</h2>
                      <p className="text-gray-400">{CharacterClass[player.characterData.characterClass]}</p>
                  </div>
              </div>
              <Bar value={player.health} maxValue={player.maxHealth} color="bg-red-500" label="HP" />
              <div className="mt-2">
                <Bar value={player.xp} maxValue={player.xpToNextLevel} color="bg-purple-500" label="XP" />
              </div>
          </div>
      </div>
      
      {/* Top Right: Game Stats & Menu */}
      <div className="absolute top-4 right-4 flex flex-col items-end pointer-events-auto space-y-2">
        <div className="bg-gray-800/80 backdrop-blur-sm p-3 rounded-lg shadow-2xl border border-gray-700 text-right">
          <p className="text-white">Kills: <span className="font-bold">{gameStats.kills}</span></p>
          <p className="text-yellow-400">Gold: <span className="font-bold">{gameStats.gold}</span></p>
        </div>
        <div className="flex space-x-2">
            <button onClick={onToggleInventory} className="bg-gray-700 text-white font-bold py-2 px-4 rounded hover:bg-gray-600 transition-colors">Inventory (i)</button>
            <button onClick={onReturnToSelect} className="bg-red-700 text-white font-bold py-2 px-4 rounded hover:bg-red-600 transition-colors">Exit Game</button>
        </div>
      </div>


      {/* Bottom Center: Skill Bar */}
      <SkillBar skills={player.skills} />
    </div>
  );
};

export default HUD;
