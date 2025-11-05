import React from 'react';
import { Player } from '../game/entities/Player';
// FIX: Imported CharacterClass to resolve name not found error.
import { GameStats, Vector2D, NPCType, CharacterClass, ItemRarity } from '../game/types';
import SkillBar from './SkillBar';
import { GAME_CONFIG } from '../game/constants';
import { Enemy } from '../game/entities/Enemy';
import { NPC } from '../game/entities/NPC';
import { HammerIcon, CoinIcon } from './icons';
import { ITEMS_DB } from '../game/items';

interface HUDProps {
    player: Player | null; // Can be null during connection
    gameStats: GameStats;
    enemies: Enemy[];
    npcs: NPC[];
    toggleInventory: () => void;
    onReturnToSelect: () => void;
    nearbyNPC: NPC | null;
    onUseSkill: (index: number) => void;
    isDevMode: boolean;
    onDevSpawnItem: (itemId: string) => void;
}

const StatBar: React.FC<{ value: number; maxValue: number; color: string; bgColor: string; isInCombat?: boolean; }> = ({ value, maxValue, color, bgColor, isInCombat }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
        <div className={`w-full h-5 ${bgColor} rounded-full overflow-hidden border-2 transition-colors duration-500 ${isInCombat ? 'border-red-600 animate-pulse' : 'border-gray-900/50'}`}>
            <div className={`h-full ${color} transition-all duration-300 ease-out`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

const Minimap: React.FC<{ player: Player, enemies: Enemy[], npcs: NPC[] }> = ({ player, enemies, npcs }) => {
    const mapSize = 200;
    const worldSize = { w: GAME_CONFIG.WORLD_WIDTH, h: GAME_CONFIG.WORLD_HEIGHT };
    const scale = mapSize / (worldSize.w * 0.5); // Adjust view range on minimap

    const worldToMap = (pos: Vector2D) => {
        const relativeX = pos.x - player.position.x;
        const relativeY = pos.y - player.position.y;
        return {
            x: mapSize / 2 + relativeX * scale,
            y: mapSize / 2 + relativeY * scale,
        };
    };

    return (
        <div 
            className="w-52 h-52 bg-gray-900/70 backdrop-blur-sm rounded-lg shadow-lg border-2 border-gray-700 overflow-hidden"
            style={{ width: mapSize, height: mapSize }}
        >
            <div className="relative w-full h-full">
                {/* Player Dot */}
                <div className="absolute w-2 h-2 bg-blue-400 rounded-full" style={{ top: mapSize/2 - 4, left: mapSize/2 - 4, transform: `translate(0,0)`}}></div>

                {/* Enemy Dots */}
                {enemies.map(enemy => {
                    const mapPos = worldToMap(enemy.position);
                    if (mapPos.x < 0 || mapPos.x > mapSize || mapPos.y < 0 || mapPos.y > mapSize) return null;
                    return <div key={enemy.id} className="absolute w-2 h-2 bg-red-500 rounded-full" style={{ top: mapPos.y-4, left: mapPos.x-4 }}></div>;
                })}
                
                {/* NPC Icons */}
                {npcs.map(npc => {
                    const mapPos = worldToMap(npc.position);
                     if (mapPos.x < 0 || mapPos.x > mapSize || mapPos.y < 0 || mapPos.y > mapSize) return null;
                     const icon = npc.npcType === NPCType.Crafter ? <HammerIcon /> : <CoinIcon />;
                     return <div key={npc.id} className="absolute w-4 h-4 text-yellow-400" style={{ top: mapPos.y-8, left: mapPos.x-8 }}>{icon}</div>
                })}
            </div>
        </div>
    );
};

const DevPanel: React.FC<{ onSpawnItem: (itemId: string) => void }> = ({ onSpawnItem }) => {
    const rarityColors: Record<ItemRarity, string> = {
        [ItemRarity.Common]: 'text-gray-400',
        [ItemRarity.Uncommon]: 'text-green-400',
        [ItemRarity.Rare]: 'text-blue-400',
        [ItemRarity.Epic]: 'text-purple-400',
        [ItemRarity.Legendary]: 'text-orange-400',
    };

    return (
        <div className="absolute top-1/2 -translate-y-1/2 left-4 w-64 p-3 bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg border border-green-500 pointer-events-auto">
            <h3 className="font-bold text-center text-green-400 mb-2">Item Spawner</h3>
            <div className="max-h-96 overflow-y-auto space-y-1 pr-2">
                {Object.values(ITEMS_DB).map(item => (
                    <button 
                        key={item.id}
                        onClick={() => onSpawnItem(item.id)}
                        className={`w-full text-left text-sm p-1 rounded hover:bg-gray-700 transition-colors ${rarityColors[item.rarity]}`}
                    >
                        {item.name}
                    </button>
                ))}
            </div>
        </div>
    );
}


const HUD: React.FC<HUDProps> = ({ player, gameStats, enemies, npcs, toggleInventory, onReturnToSelect, nearbyNPC, onUseSkill, isDevMode, onDevSpawnItem }) => {
    if (!player) return null;

    const finalStats = player.getFinalStats();
    const xpForNextLevel = GAME_CONFIG.BASE_XP_TO_NEXT_LEVEL * Math.pow(GAME_CONFIG.XP_PER_LEVEL_MULTIPLIER, player.level - 1);

    return (
        <div className="absolute inset-0 pointer-events-none text-white font-sans">
            {/* Dev Panel */}
            {isDevMode && <DevPanel onSpawnItem={onDevSpawnItem} />}
            
            {/* Top Left - Player Info */}
            <div className="absolute top-4 left-4 w-64 p-3 bg-gray-900/70 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700">
                <div className="flex items-center mb-2">
                    <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center font-bold text-xl border-2 border-gray-600 mr-3">
                        {player.level}
                    </div>
                    <div>
                        <h2 className="font-bold text-lg leading-tight">{player.name}</h2>
                        <p className="text-sm text-gray-400">{CharacterClass[player.characterClass]}</p>
                    </div>
                </div>
                {/* Health Bar */}
                <div className="relative mb-1">
                    <StatBar value={player.health} maxValue={finalStats.maxHealth} color="bg-red-500" bgColor="bg-red-900/50" isInCombat={player.isInCombat} />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold drop-shadow-md">
                        {Math.round(player.health)} / {finalStats.maxHealth}
                    </div>
                </div>
                {/* XP Bar */}
                <div className="relative">
                     <StatBar value={player.xp} maxValue={xpForNextLevel} color="bg-yellow-500" bgColor="bg-yellow-900/50" />
                     <div className="absolute inset-0 flex items-center justify-center text-xs font-bold drop-shadow-md">
                        {player.level < GAME_CONFIG.MAX_LEVEL ? `XP: ${player.xp} / ${Math.round(xpForNextLevel)}` : 'MAX LEVEL'}
                    </div>
                </div>
            </div>

            {/* Top Right - Game Stats & Controls */}
            <div className="absolute top-4 right-4 flex flex-col items-end space-y-3">
                <Minimap player={player} enemies={enemies} npcs={npcs} />
                <div className="p-3 bg-gray-900/70 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 text-right">
                    <p>Kills: <span className="font-bold">{gameStats.kills}</span></p>
                    <p>Gold: <span className="font-bold text-yellow-400">{gameStats.gold.toLocaleString()}</span></p>
                    <div className="mt-2 space-x-2 pointer-events-auto">
                         <button onClick={toggleInventory} className="bg-blue-600/80 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded text-sm transition-colors">
                            Inventory (I)
                        </button>
                        <button onClick={onReturnToSelect} className="bg-gray-600/80 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded text-sm transition-colors">
                            Leave World
                        </button>
                    </div>
                </div>
            </div>
            
            {/* NPC Interaction Prompt */}
            {nearbyNPC && (
                 <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-gray-900/80 p-3 rounded-lg border border-gray-600 text-center shadow-lg">
                    <p className="text-lg">Press <span className="font-bold text-teal-400">[E]</span> to talk to {nearbyNPC.name}</p>
                </div>
            )}

            {/* Bottom Center - Skill Bar */}
            <SkillBar skills={player.skills} onUseSkill={onUseSkill} />
        </div>
    );
};

export default HUD;
