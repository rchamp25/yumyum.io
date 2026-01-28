
import React from 'react';
import { Player } from '../game/entities/Player';
import { CoinIcon, BackpackIcon } from './icons';
import SkillBar from './SkillBar';
import { Enemy } from '../game/entities/Enemy';
import { NPC } from '../game/entities/NPC';
import { Waypoint } from '../game/entities/Waypoint';
import { GAME_CONFIG, INTEREST_ZONES } from '../game/constants';
import { getDistance } from '../game/math';
import { CharacterClass, StatusEffect } from '../game/types';

interface HUDProps {
  player: Player | null;
  enemies: Enemy[];
  npcs: NPC[];
  waypoints: Waypoint[];
  onUseSkill: (index: number) => void;
  toggleInventory: () => void;
  otherPlayers: any[];
  isSaving?: boolean;
  isStatsOpen: boolean;
}

const StatusEffectIcon: React.FC<{ effect: StatusEffect }> = ({ effect }) => {
    const remaining = Math.max(0, effect.duration - (Date.now() - effect.startTime));
    if (remaining <= 0) return null;
    const pct = (remaining / effect.duration) * 100;
    return (
        <div className={`relative w-10 h-10 bg-gray-950/90 rounded-xl border-2 border-teal-500/50 flex items-center justify-center shadow-lg group pointer-events-auto overflow-hidden`}>
            <div className="absolute inset-0 bg-teal-500/20 origin-bottom" style={{ transform: `scaleY(${pct/100})` }}></div>
            <div className="text-xl relative z-10">✨</div>
        </div>
    );
};

const StatBar: React.FC<{ value: number; maxValue: number; color: string; label: string }> = ({ value, maxValue, color, label }) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="w-full bg-black/50 rounded-full h-4 border border-white/5 relative overflow-hidden">
      <div className="h-full transition-all duration-300 ease-out" style={{ width: `${percentage}%`, backgroundColor: color }}></div>
      <div className="absolute inset-0 flex items-center justify-center text-white font-black text-[10px] uppercase tracking-tighter shadow-sm">{label}</div>
    </div>
  );
};

const StatsWindow: React.FC<{ player: Player }> = ({ player }) => {
    const stats = player.getFinalStats();
    const statItems = [
        { label: 'Damage', value: Math.round(stats.damage), color: 'text-red-400' },
        { label: 'H-Regen', value: stats.healthRegen.toFixed(1) + '/s', color: 'text-green-400' },
        { label: 'Speed', value: stats.speed.toFixed(1), color: 'text-blue-400' },
        { label: 'Item Find', value: Math.round(stats.itemFind * 100) + '%', color: 'text-yellow-400' },
        { label: 'Boss Dmg', value: '+' + Math.round((stats.bossDamageMultiplier - 1) * 100) + '%', color: 'text-purple-400' },
    ];

    return (
        <div className="w-48 bg-gray-900/80 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-2xl mt-4 animate-fade-in pointer-events-auto">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2 text-left">Hero Stats</h3>
            <div className="space-y-2">
                {statItems.map((stat, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-400 font-bold uppercase">{stat.label}</span>
                        <span className={`${stat.color} font-black tabular-nums`}>{stat.value}</span>
                    </div>
                ))}
            </div>
            <p className="text-[8px] text-gray-600 mt-4 text-center uppercase font-bold tracking-tighter">Press 'C' to toggle</p>
        </div>
    );
};

const Minimap: React.FC<{ player: Player; enemies: Enemy[]; npcs: NPC[]; waypoints: Waypoint[]; otherPlayers: any[] }> = ({ player, enemies, npcs, waypoints }) => {
    const worldSize = GAME_CONFIG.WORLD_WIDTH;
    return (
        <div className="w-48 h-48 bg-gray-950/80 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden relative aspect-square">
            <div className="relative w-full h-full">
                {/* Zones */}
                {INTEREST_ZONES.map(zone => (
                    <div 
                        key={zone.id} 
                        className="absolute rounded-full opacity-30" 
                        style={{ 
                            left: `${(zone.x / worldSize) * 100}%`, 
                            top: `${(zone.y / worldSize) * 100}%`,
                            width: `${(zone.radius / worldSize) * 100 * 2}%`,
                            height: `${(zone.radius / worldSize) * 100 * 2}%`,
                            backgroundColor: zone.color,
                            transform: 'translate(-50%, -50%)'
                        }}
                    ></div>
                ))}
                
                {waypoints.map(wp => (
                    <div key={wp.data.id} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${player.discoveredWaypoints.includes(wp.data.id) ? 'bg-cyan-400 w-2 h-2' : 'bg-gray-700 w-1 h-1'}`} style={{ left: `${(wp.data.position.x / worldSize) * 100}%`, top: `${(wp.data.position.y / worldSize) * 100}%` }}></div>
                ))}
                {enemies.map(enemy => {
                    if (!enemy.isBoss && getDistance(player.position, enemy.position) > 2000) return null;
                    return <div key={enemy.id} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${enemy.isBoss ? 'bg-red-500 w-3 h-3 animate-pulse' : 'bg-red-900/50 w-1 h-1'}`} style={{ left: `${(enemy.position.x / worldSize) * 100}%`, top: `${(enemy.position.y / worldSize) * 100}%` }}></div>;
                })}
                {npcs.map(npc => <div key={npc.id} className="absolute w-1.5 h-1.5 bg-yellow-400 rounded-full -translate-x-1/2 -translate-y-1/2" style={{ left: `${(npc.position.x / worldSize) * 100}%`, top: `${(npc.position.y / worldSize) * 100}%` }}></div>)}
                <div className="absolute w-3 h-3 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 z-20 shadow-[0_0_10px_white] ring-2 ring-blue-500/50" style={{ left: `${(player.position.x / worldSize) * 100}%`, top: `${(player.position.y / worldSize) * 100}%` }}></div>
            </div>
        </div>
    );
};

const HUD: React.FC<HUDProps> = ({ player, enemies, npcs, waypoints, onUseSkill, toggleInventory, otherPlayers, isSaving, isStatsOpen }) => {
  if (!player) return null;
  const xpToNext = player.getXpToNextLevel();
  const xpPercentage = xpToNext !== Infinity ? (player.xp / xpToNext) * 100 : 100;

  return (
    <div className="absolute inset-0 pointer-events-none select-none p-6">
      {/* Player Vitality */}
      <div className="absolute top-6 left-6 w-72 p-4 bg-gray-900/80 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/5">
        <div className="flex items-center mb-3 text-left">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-blue-600 rounded-xl flex items-center justify-center text-xl font-black text-white border border-white/10 mr-3 shadow-lg shrink-0">{player.level}</div>
            <div className="overflow-hidden">
                <h2 className="text-lg font-black text-white truncate leading-none mb-1">{player.name}</h2>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-teal-400 font-black uppercase tracking-widest">{CharacterClass[player.characterClass]}</span>
                    {isSaving && <span className="text-[9px] text-white/30 animate-pulse uppercase font-bold tracking-tighter">● Saving</span>}
                </div>
            </div>
        </div>
        <StatBar value={player.health} maxValue={player.maxHealth} color="#f43f5e" label="Health" />
        <div className="w-full bg-black/50 rounded-full h-1.5 mt-2 overflow-hidden"><div className="h-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]" style={{ width: `${xpPercentage}%`}}></div></div>
      </div>
      
      {/* Map & Gold */}
      <div className="absolute top-6 right-6 flex flex-col items-end">
        <div className="px-5 py-2.5 bg-gray-900/80 backdrop-blur-md rounded-xl shadow-xl border border-white/10 flex items-center gap-3 mb-4">
            <CoinIcon className="w-5 h-5 text-yellow-500" />
            <span className="font-black text-lg text-yellow-400 tabular-nums">{player.gold.toLocaleString()}</span>
        </div>
        <Minimap player={player} enemies={enemies} npcs={npcs} waypoints={waypoints} otherPlayers={otherPlayers} />
        {isStatsOpen && <StatsWindow player={player} />}
      </div>
      
      <div className="absolute bottom-36 left-1/2 -translate-x-1/2 flex gap-2">{player.statusEffects.map((e, i) => <StatusEffectIcon key={i} effect={e} />)}</div>
      <SkillBar player={player} onUseSkill={onUseSkill} />

      {/* Action Tray */}
       <div className="absolute bottom-6 right-6 flex flex-col gap-3 items-end pointer-events-auto">
           <button onClick={toggleInventory} className="bg-teal-600 hover:bg-teal-500 text-white w-16 h-16 rounded-2xl shadow-xl border border-white/20 transition-all active:scale-90 flex items-center justify-center">
               <BackpackIcon className="w-8 h-8" />
           </button>
       </div>
    </div>
  );
};

export default HUD;
