
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
  nearbyNPC: NPC | null;
  onUseSkill: (index: number) => void;
  toggleInventory: () => void;
  isInventoryOpen: boolean;
  party: Party | null;
  onOpenParty: () => void;
  onRequestTrade: (targetId: string) => void;
  otherPlayers: any[]; // New prop for multiplayer
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
        <div className={`relative w-10 h-10 bg-gray-900/90 rounded-md border-2 ${colorClass} flex items-center justify-center shadow-lg group pointer-events-auto`}>
            <div className="text-xl drop-shadow-md">{icon}</div>
            <div className="absolute inset-0 bg-current opacity-10 origin-bottom pointer-events-none" style={{ transform: `scaleY(${pct/100})` }}></div>
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 border border-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {name} ({Math.ceil(remaining/1000)}s)
            </div>
        </div>
    );
};

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

const BossHealthBar: React.FC<{ boss: Enemy }> = ({ boss }) => {
    const percent = Math.max(0, Math.min(100, (boss.health / boss.maxHealth) * 100));
    
    return (
        <div className="w-[280px] mb-2 animate-fade-in pointer-events-none">
            <div className="flex justify-between items-end mb-0.5 px-1">
                <span className="text-purple-200 font-bold text-sm drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-wide uppercase flex items-center">
                    <span className="text-lg mr-1">☠️</span> {boss.name}
                </span>
                <span className="text-purple-300 font-bold text-xs drop-shadow-md">{percent.toFixed(1)}%</span>
            </div>
            <div className="h-5 bg-gray-900/90 border border-purple-500/50 rounded-md relative overflow-hidden shadow-[0_0_10px_rgba(147,51,234,0.2)]">
                {/* Background pulsing effect */}
                <div className="absolute inset-0 bg-purple-900/20 animate-pulse"></div>
                
                {/* Health Fill */}
                <div 
                    className="h-full bg-gradient-to-r from-purple-900 via-purple-600 to-fuchsia-500 transition-all duration-300 ease-out relative"
                    style={{ width: `${percent}%` }}
                >
                    {/* Shine effect on bar */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                </div>
                
                {/* Text Overlay */}
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md tracking-widest">
                    {Math.ceil(boss.health).toLocaleString()} / {Math.ceil(boss.maxHealth).toLocaleString()}
                </div>
            </div>
        </div>
    );
};

const Minimap: React.FC<{ player: Player; enemies: Enemy[]; npcs: NPC[]; waypoints: Waypoint[]; party: Party | null; otherPlayers: any[] }> = ({ player, enemies, npcs, waypoints, party, otherPlayers }) => {
    const mapSize = 200;
    const scale = mapSize / Math.max(GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);

    const playerX = player.position.x * scale;
    const playerY = player.position.y * scale;

    return (
        <div className="w-[200px] h-[200px] bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg border-2 border-gray-700 overflow-hidden relative">
            {/* World Name Watermark */}
            <div className="absolute top-3 left-0 right-0 text-center pointer-events-none z-0">
                <span className="text-white/20 font-black text-lg uppercase tracking-[0.2em] drop-shadow-sm select-none">The Rat</span>
            </div>

            {/* Waypoints */}
            {waypoints.map(wp => {
                 const abbr = wp.data.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                 const isDiscovered = player.discoveredWaypoints.includes(wp.data.id);
                 
                 return (
                     <div 
                        key={wp.data.id}
                        className="absolute z-10 flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${wp.data.position.x * scale}px`, top: `${wp.data.position.y * scale}px` }}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full ${isDiscovered ? 'bg-cyan-400 shadow-[0_0_4px_#22d3ee]' : 'bg-gray-600'}`}></div>
                        <span className={`text-[6px] font-bold leading-none mt-0.5 select-none ${isDiscovered ? 'text-cyan-400' : 'text-gray-500'}`}>{abbr}</span>
                    </div>
                 );
            })}

            {/* Player Dot */}
            <div 
                className="absolute w-2 h-2 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 z-20 shadow-[0_0_5px_white]"
                style={{ left: `${playerX}px`, top: `${playerY}px` }}
            ></div>

            {/* Other Players Dot */}
            {otherPlayers.map((op, idx) => {
                const isPartyMember = party?.members.some(m => m.id === op.characterData.id);
                const color = isPartyMember ? '#4ade80' : '#ffffff'; // Green vs White
                const size = isPartyMember ? 'w-1.5 h-1.5' : 'w-1 h-1';
                const zIndex = isPartyMember ? 'z-15' : 'z-10';

                return (
                    <div
                        key={idx}
                        className={`absolute ${size} rounded-full -translate-x-1/2 -translate-y-1/2 ${zIndex}`}
                        style={{ 
                            left: `${op.position.x * scale}px`, 
                            top: `${op.position.y * scale}px`,
                            backgroundColor: color
                        }}
                    ></div>
                );
            })}

            {/* Enemy Dots - OPTIMIZED: Only show nearby enemies or bosses */}
            {enemies.map(enemy => {
                 if (!enemy.isBoss && getDistance(player.position, enemy.position) > 3000) return null;
                 
                 return (
                     <div 
                        key={enemy.id}
                        className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 z-10 ${enemy.isBoss ? 'w-3 h-3 bg-purple-500 animate-pulse' : 'w-1.5 h-1.5 bg-red-500'}`}
                        style={{ left: `${enemy.position.x * scale}px`, top: `${enemy.position.y * scale}px` }}
                    ></div>
                 );
            })}
             {/* NPC Dots */}
             {npcs.map(npc => (
                 <div 
                    key={npc.id}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${npc.position.x * scale}px`, top: `${npc.position.y * scale}px` }}
                ></div>
            ))}
        </div>
    );
};

const PartyFrame: React.FC<{ member: Party['members'][0], currentUserId: string, onRequestTrade: (id: string) => void }> = ({ member, currentUserId, onRequestTrade }) => {
    if (member.id === currentUserId) return null; // Don't show self in party frame

    const classColors = {
        [CharacterClass.Warrior]: 'text-red-400 border-red-500',
        [CharacterClass.Mage]: 'text-blue-400 border-blue-500',
        [CharacterClass.Archer]: 'text-green-400 border-green-500',
    };
    
    const colorClass = classColors[member.characterClass] || 'text-gray-400 border-gray-500';
    const healthPct = (member.health / member.maxHealth) * 100;
    const isOnline = member.isOnline !== false; // Default true if undefined

    return (
        <div className={`bg-gray-900/80 backdrop-blur-sm border-l-4 p-2 rounded mb-2 w-48 pointer-events-auto group relative ${isOnline ? colorClass.split(' ')[1] : 'border-gray-600 opacity-70'}`}>
             <div className="flex justify-between items-center">
                 <div className="flex flex-col">
                     <span className={`font-bold text-sm ${isOnline ? colorClass.split(' ')[0] : 'text-gray-500'}`}>{member.name}</span>
                     {!isOnline && <span className="text-[10px] text-red-400 font-bold uppercase tracking-wide">(Offline)</span>}
                 </div>
                 <span className="text-xs text-gray-400">Lv {member.level}</span>
             </div>
             <div className="w-full bg-gray-800 h-2 mt-1 rounded-full overflow-hidden">
                 <div className={`h-full transition-all duration-300 ${isOnline ? 'bg-green-500' : 'bg-gray-600'}`} style={{ width: `${healthPct}%`}}></div>
             </div>
             
             {/* Trade Button Overlay - Only if online */}
             {isOnline && (
                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                     <button 
                        onClick={() => onRequestTrade(member.id)}
                        className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded"
                     >
                        Trade
                     </button>
                 </div>
             )}
        </div>
    );
};

const HUD: React.FC<HUDProps> = ({ player, enemies, npcs, waypoints, nearbyNPC, onUseSkill, toggleInventory, isInventoryOpen, party, onOpenParty, onRequestTrade, otherPlayers }) => {
  if (!player) return null;

  const xpToNext = player.getXpToNextLevel();
  const xpPercentage = xpToNext !== Infinity ? (player.xp / xpToNext) * 100 : 100;

  const activeBosses = enemies.filter(e => {
      if (!e.isBoss || e.isDead) return false;
      return getDistance(player.position, e.position) < BOSS_CONFIG.ZONE_RADIUS;
  });

  return (
    <div className="absolute inset-0 pointer-events-none text-white">
      {/* Top Center - Boss Health Bars */}
      {activeBosses.length > 0 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center z-50">
              {activeBosses.map(boss => (
                  <BossHealthBar key={boss.id} boss={boss} />
              ))}
          </div>
      )}

      {/* Top Left - Player Info */}
      <div className="absolute top-4 left-4 w-72 p-3 bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 z-40">
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
      
      {/* Left Side - Party Frames */}
      {party && (
          <div className="absolute top-40 left-4 z-40 flex flex-col">
              {party.members.map(m => (
                  <PartyFrame key={m.id} member={m} currentUserId={player.id as string} onRequestTrade={onRequestTrade} />
              ))}
          </div>
      )}

      {/* Top Right - Vitals & Gold & Minimap */}
      <div className="absolute top-4 right-4 flex flex-col items-end space-y-2 z-40">
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
            <div className="text-sm text-gray-300">
              Item Find: <span className="font-bold text-purple-300">+{Math.round((player.getFinalStats().itemFind || 0) * 100)}%</span>
            </div>
        </div>
        <Minimap player={player} enemies={enemies} npcs={npcs} waypoints={waypoints} party={party} otherPlayers={otherPlayers} />
      </div>

      {/* Center - Interaction Prompt */}
      {nearbyNPC && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-24 bg-gray-900/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-700 z-30">
            <p className="font-bold text-lg">Press [E] to talk to {nearbyNPC.name}</p>
        </div>
      )}
      
      {/* Status Effects List - Centered above Skill Bar */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-end justify-center space-x-2 z-40 pointer-events-none">
        {player.statusEffects.map((effect) => (
            <StatusEffectIcon key={`${effect.type}_${effect.startTime}`} effect={effect} />
        ))}
      </div>
      
      {/* Bottom Center - Skill Bar */}
      {player.skills && <SkillBar player={player} onUseSkill={onUseSkill} />}

      {/* Bottom Left - Party Button */}
       <button 
          onClick={onOpenParty}
          className="absolute bottom-4 left-4 bg-gray-800/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-700 pointer-events-auto hover:bg-gray-700/80 transition-colors z-40 flex items-center space-x-2"
       >
          <span className="text-xl">👥</span>
          <span className="font-bold">Party</span>
       </button>

      {/* Bottom Right - Inventory Button */}
       <button 
          onClick={toggleInventory}
          className="absolute bottom-4 right-4 bg-gray-800/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-700 pointer-events-auto hover:bg-gray-700/80 transition-colors z-40"
       >
          <span className="font-bold">Inventory ({isInventoryOpen ? 'C' : 'I'})</span>
       </button>
    </div>
  );
};

export default HUD;
