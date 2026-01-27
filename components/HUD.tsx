
import React from 'react';
import { Player } from '../game/entities/Player';
import { CoinIcon } from './icons';
import SkillBar from './SkillBar';
import { Enemy } from '../game/entities/Enemy';
import { NPC } from '../game/entities/NPC';
import { Waypoint } from '../game/entities/Waypoint';
import { GAME_CONFIG, BOSS_CONFIG } from '../game/constants';
import { getDistance } from '../game/math';
import { Party, CharacterClass, StatusEffect } from '../game/types';

interface HUDProps {
  player: Player | null;
  enemies: Enemy[];
  npcs: NPC[];
  waypoints: Waypoint[];
  onUseSkill: (index: number) => void;
  toggleInventory: () => void;
  isInventoryOpen: boolean;
  party: Party | null;
  onOpenParty: () => void;
  onRequestTrade: (targetId: string) => void;
  otherPlayers: any[];
}

const StatusEffectIcon: React.FC<{ effect: StatusEffect }> = ({ effect }) => {
    const remaining = Math.max(0, effect.duration - (Date.now() - effect.startTime));
    if (remaining <= 0) return null;
    
    const pct = (remaining / effect.duration) * 100;
    
    let icon = '';
    let colorClass = '';
    let name = '';
    
    switch(effect.type) {
        case 'stun': icon = '💫'; colorClass = 'border-yellow-400 text-yellow-400 shadow-yellow-400/20'; name = 'Stunned'; break;
        case 'slow': icon = '❄️'; colorClass = 'border-blue-400 text-blue-400 shadow-blue-400/20'; name = 'Slowed'; break;
        case 'haste': icon = '⚡'; colorClass = 'border-green-400 text-green-400 shadow-green-400/20'; name = 'Haste'; break;
        case 'empowered': icon = '⚔️'; colorClass = 'border-red-500 text-red-500 shadow-red-500/20'; name = 'Empowered'; break;
        case 'shield': icon = '🛡️'; colorClass = 'border-gray-300 text-gray-300 shadow-gray-300/20'; name = 'Shielded'; break;
        case 'dot': icon = '☠️'; colorClass = 'border-purple-500 text-purple-500 shadow-purple-500/20'; name = 'DoT'; break;
        case 'whirlwind_active': icon = '🌪️'; colorClass = 'border-white text-white shadow-white/20'; name = 'Whirlwind'; break;
        default: icon = '✨'; colorClass = 'border-white text-white'; name = 'Effect';
    }

    return (
        <div className={`relative w-8 h-8 md:w-10 md:h-10 bg-gray-900/90 rounded-md border-2 ${colorClass} flex items-center justify-center shadow-lg group pointer-events-auto`}>
            <div className="text-lg md:text-xl drop-shadow-md">{icon}</div>
            <div className="absolute inset-0 bg-current opacity-10 origin-bottom pointer-events-none" style={{ transform: `scaleY(${pct/100})` }}></div>
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 border border-gray-700 text-white text-[10px] md:text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {name} ({Math.ceil(remaining/1000)}s)
            </div>
        </div>
    );
};

const StatBar: React.FC<{ value: number; maxValue: number; color: string; label: string }> = ({ value, maxValue, color, label }) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="w-full bg-black/50 rounded-full h-3 md:h-5 border border-gray-700/50 relative overflow-hidden">
      <div
        className="h-full transition-all duration-300 ease-in-out shadow-[0_0_10px_rgba(255,255,255,0.1)_inset]"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      ></div>
      <div className="absolute inset-0 flex items-center justify-center text-white font-black text-[9px] md:text-[11px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] uppercase tracking-tighter">
        {label}: {Math.round(value)} / {Math.round(maxValue)}
      </div>
    </div>
  );
};

const BossHealthBar: React.FC<{ boss: Enemy }> = ({ boss }) => {
    const percent = Math.max(0, Math.min(100, (boss.health / boss.maxHealth) * 100));
    
    return (
        <div className="w-[200px] md:w-[320px] mb-2 animate-in slide-in-from-top duration-500 pointer-events-none">
            <div className="flex justify-between items-end mb-1 px-1">
                <span className="text-red-200 font-black text-[10px] md:text-xs drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-widest uppercase flex items-center">
                    <span className="animate-pulse mr-1">💀</span> {boss.name}
                </span>
                <span className="text-red-400 font-black text-[10px] drop-shadow-md">{percent.toFixed(0)}%</span>
            </div>
            <div className="h-3 md:h-4 bg-gray-950 border border-red-500/30 rounded-full relative overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <div 
                    className="h-full bg-gradient-to-r from-red-900 via-red-600 to-orange-500 transition-all duration-500 ease-out"
                    style={{ width: `${percent}%` }}
                ></div>
            </div>
        </div>
    );
};

const Minimap: React.FC<{ player: Player; enemies: Enemy[]; npcs: NPC[]; waypoints: Waypoint[]; party: Party | null; otherPlayers: any[] }> = ({ player, enemies, npcs, waypoints, party, otherPlayers }) => {
    // Standardize sizing using a perfect square to match World dimensions.
    const worldWidth = GAME_CONFIG.WORLD_WIDTH;
    const worldHeight = GAME_CONFIG.WORLD_HEIGHT;
    
    return (
        <div className="w-32 h-32 md:w-48 md:h-48 bg-gray-950 rounded-xl shadow-2xl border-2 border-gray-700/80 overflow-hidden relative group aspect-square flex items-center justify-center">
            {/* Inner Scale Layer: Absolute boundaries for the 18000x18000 world */}
            <div className="relative w-full h-full bg-gray-900/50">
                {/* World Border Visual: Shows the actual playable bounds */}
                <div className="absolute inset-0 border border-white/5 pointer-events-none"></div>
                
                {/* Visual Grid */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px]"></div>
                
                {/* Waypoints */}
                {waypoints.map(wp => {
                    const isDiscovered = player.discoveredWaypoints.includes(wp.data.id);
                    return (
                        <div 
                            key={wp.data.id} 
                            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full z-10 ${isDiscovered ? 'bg-cyan-400 w-1.5 h-1.5 md:w-2 md:h-2' : 'bg-gray-600/40 w-1 h-1 md:w-1.5 md:h-1.5'}`} 
                            style={{ 
                                left: `${(wp.data.position.x / worldWidth) * 100}%`, 
                                top: `${(wp.data.position.y / worldHeight) * 100}%` 
                            }}
                        ></div>
                    );
                })}

                {/* Other Players */}
                {otherPlayers.map((op, idx) => {
                    const isPartyMember = party?.members.some(m => m.id === op.characterData.id);
                    return (
                        <div 
                            key={idx} 
                            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full z-10 ${isPartyMember ? 'bg-green-400 w-1.5 h-1.5' : 'bg-white w-1 h-1'}`} 
                            style={{ 
                                left: `${(op.position.x / worldWidth) * 100}%`, 
                                top: `${(op.position.y / worldHeight) * 100}%` 
                            }}
                        ></div>
                    );
                })}

                {/* Enemies */}
                {enemies.map(enemy => {
                    if (!enemy.isBoss && getDistance(player.position, enemy.position) > 3000) return null;
                    return (
                        <div 
                            key={enemy.id} 
                            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full z-10 ${enemy.isBoss ? 'bg-red-500 w-2 h-2 md:w-3 md:h-3 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-red-500/50 w-0.5 h-0.5 md:w-1 md:h-1'}`} 
                            style={{ 
                                left: `${(enemy.position.x / worldWidth) * 100}%`, 
                                top: `${(enemy.position.y / worldHeight) * 100}%` 
                            }}
                        ></div>
                    );
                })}

                {/* NPCs */}
                {npcs.map(npc => (
                    <div 
                        key={npc.id} 
                        className="absolute w-1 h-1 md:w-1.5 md:h-1.5 bg-yellow-400 rounded-full -translate-x-1/2 -translate-y-1/2 z-10" 
                        style={{ 
                            left: `${(npc.position.x / worldWidth) * 100}%`, 
                            top: `${(npc.position.y / worldHeight) * 100}%` 
                        }}
                    ></div>
                ))}

                {/* The Player (Draw Last) */}
                <div 
                    className="absolute w-2 h-2 md:w-3 md:h-3 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 z-20 shadow-[0_0_10px_white] ring-2 ring-blue-500/40" 
                    style={{ 
                        left: `${(player.position.x / worldWidth) * 100}%`, 
                        top: `${(player.position.y / worldHeight) * 100}%` 
                    }}
                ></div>
            </div>

            {/* UI Label Overlay */}
            <div className="absolute top-1 left-0 right-0 text-center pointer-events-none z-30">
                <span className="text-white/10 font-black text-[8px] md:text-[9px] uppercase tracking-[0.25em] select-none">Satellite Feed</span>
            </div>
        </div>
    );
};

const PartyFrame: React.FC<{ member: Party['members'][0], currentUserId: string, onRequestTrade: (id: string) => void }> = ({ member, currentUserId, onRequestTrade }) => {
    if (member.id === currentUserId) return null;

    const classColors = {
        [CharacterClass.Warrior]: 'border-red-500',
        [CharacterClass.Mage]: 'border-blue-500',
        [CharacterClass.Archer]: 'border-green-500',
    };
    
    const colorClass = classColors[member.characterClass] || 'border-gray-500';
    const healthPct = (member.health / member.maxHealth) * 100;
    const isOnline = member.isOnline !== false;

    return (
        <div className={`bg-gray-900/60 backdrop-blur-sm border-l-4 p-1 md:p-1.5 rounded-r-lg mb-1 w-24 md:w-36 pointer-events-auto group relative ${isOnline ? colorClass : 'border-gray-700 opacity-50'}`}>
             <div className="flex justify-between items-center overflow-hidden">
                 <span className={`font-black text-[9px] md:text-[11px] truncate uppercase tracking-tighter ${isOnline ? 'text-white' : 'text-gray-500'}`}>{member.name}</span>
                 <span className="text-[8px] md:text-[10px] text-gray-500">Lv {member.level}</span>
             </div>
             <div className="w-full bg-black/40 h-1 md:h-1.5 mt-0.5 rounded-full overflow-hidden">
                 <div className={`h-full transition-all duration-300 ${isOnline ? 'bg-red-500' : 'bg-gray-700'}`} style={{ width: `${healthPct}%`}}></div>
             </div>
             
             {isOnline && (
                 <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-r-lg">
                     <button onClick={() => onRequestTrade(member.id)} className="bg-yellow-600 hover:bg-yellow-500 text-white text-[8px] md:text-[10px] font-black px-2 py-0.5 rounded uppercase">Trade</button>
                 </div>
             )}
        </div>
    );
};

const HUD: React.FC<HUDProps> = ({ player, enemies, npcs, waypoints, onUseSkill, toggleInventory, isInventoryOpen, party, onOpenParty, onRequestTrade, otherPlayers }) => {
  if (!player) return null;

  const xpToNext = player.getXpToNextLevel();
  const xpPercentage = xpToNext !== Infinity ? (player.xp / xpToNext) * 100 : 100;

  const activeBosses = enemies.filter(e => {
      if (!e.isBoss || e.isDead) return false;
      return getDistance(player.position, e.position) < BOSS_CONFIG.ZONE_RADIUS;
  });

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Boss Health Bars */}
      {activeBosses.length > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-50">
              {activeBosses.map(boss => <BossHealthBar key={boss.id} boss={boss} />)}
          </div>
      )}

      {/* Player Info - Top Left */}
      <div className="absolute top-2 left-2 md:top-4 md:left-4 w-48 md:w-64 p-2 md:p-2.5 bg-gray-950/80 backdrop-blur-xl rounded-xl shadow-2xl border border-white/5 z-40">
        <div className="flex items-center mb-1.5">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center text-sm md:text-base font-black text-white border border-white/20 mr-2 shadow-lg">
                {player.level}
            </div>
            <div className="overflow-hidden">
                <h2 className="text-sm md:text-base font-black text-white truncate leading-none mb-0.5">{player.name}</h2>
                <p className="text-[10px] md:text-xs text-teal-400/80 uppercase font-bold tracking-widest">{player.characterClass !== undefined ? ['Warrior', 'Mage', 'Archer'][player.characterClass] : 'Adventurer'}</p>
            </div>
        </div>
        <StatBar value={player.health} maxValue={player.maxHealth} color="#ef4444" label="HEALTH" />
        <div className="w-full bg-black/50 rounded-full h-1.5 md:h-2 mt-1.5 border border-white/5 relative overflow-hidden">
            <div className="h-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]" style={{ width: `${xpPercentage}%`}}></div>
        </div>
      </div>
      
      {/* Party Frames */}
      {party && (
          <div className="absolute top-28 md:top-36 left-2 md:left-4 z-40 flex flex-col items-start">
              {party.members.map(m => <PartyFrame key={m.id} member={m} currentUserId={player.id as string} onRequestTrade={onRequestTrade} />)}
          </div>
      )}

      {/* Minimap & Gold - Top Right */}
      <div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col items-end gap-2 z-40">
        <div className="px-3 py-1.5 bg-gray-950/90 backdrop-blur-md rounded-lg shadow-xl border border-white/10 flex items-center gap-2">
            <CoinIcon className="w-4 h-4 text-yellow-500" />
            <span className="font-black text-xs md:text-sm text-yellow-400 tabular-nums">{player.gold.toLocaleString()}</span>
        </div>
        <Minimap player={player} enemies={enemies} npcs={npcs} waypoints={waypoints} party={party} otherPlayers={otherPlayers} />
      </div>
      
      {/* Status Effects - Centered above skills */}
      <div className="absolute bottom-40 md:bottom-28 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5 z-40">
        {player.statusEffects.map((effect) => <StatusEffectIcon key={`${effect.type}_${effect.startTime}`} effect={effect} />)}
      </div>
      
      {player.skills && <SkillBar player={player} onUseSkill={onUseSkill} />}

      {/* Utility Buttons */}
       <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-40 items-end pointer-events-auto">
           <button onClick={onOpenParty} className="bg-gray-900/80 backdrop-blur-md p-2.5 md:p-3 rounded-xl shadow-lg border border-white/10 hover:bg-gray-800 transition-all group active:scale-95 flex items-center justify-center">
              <span className="text-xl md:text-2xl group-hover:scale-110 transition-transform">👥</span>
              <span className="font-black text-[10px] md:text-xs text-white/60 ml-2 hidden md:inline uppercase tracking-widest">Party</span>
           </button>

           <button onClick={toggleInventory} className="bg-gray-900/80 backdrop-blur-md p-2.5 md:p-3 rounded-xl shadow-lg border border-white/10 hover:bg-gray-800 transition-all group active:scale-95 flex items-center justify-center">
              <span className="text-xl md:text-2xl group-hover:scale-110 transition-transform">🎒</span>
              <span className="font-black text-[10px] md:text-xs text-white/60 ml-2 hidden md:inline uppercase tracking-widest">Inv ({isInventoryOpen ? 'C' : 'I'})</span>
           </button>
       </div>
    </div>
  );
};

export default HUD;
