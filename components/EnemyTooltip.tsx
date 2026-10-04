import React from 'react';
import { Enemy } from '../game/entities/Enemy';

interface EnemyTooltipProps {
    enemy: Enemy;
    position: { x: number; y: number };
}

const EnemyTooltip: React.FC<EnemyTooltipProps> = ({ enemy, position }) => {
    const percent = Math.max(0, Math.min(100, (enemy.health / enemy.maxHealth) * 100));

    return (
        <div
            className="fixed z-100 pointer-events-none bg-gray-900/95 border border-red-500/50 rounded-lg p-3 shadow-2xl backdrop-blur-xs min-w-[200px]"
            style={{
                left: position.x + 15,
                top: position.y + 15,
            }}
        >
            <div className="flex justify-between items-start mb-2 pb-1 border-b border-gray-700">
                <div>
                    <h3 className={`font-bold text-base ${enemy.isBoss ? 'text-red-400' : 'text-white'}`}>{enemy.name}</h3>
                    <p className="text-xs text-gray-400">Level {enemy.level} {enemy.isBoss ? 'Boss' : ''}</p>
                </div>
                {enemy.isBoss && <span className="text-[10px] font-bold text-red-500 bg-red-900/30 border border-red-500/30 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Boss</span>}
            </div>
            
            <div className="space-y-1.5">
                <div>
                    <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-gray-400">Health</span>
                        <span className="text-red-400 font-mono">{Math.ceil(enemy.health).toLocaleString()} / {Math.ceil(enemy.maxHealth).toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700/50">
                        <div 
                            className="h-full bg-linear-to-r from-red-600 to-red-400" 
                            style={{ width: `${percent}%` }}
                        ></div>
                    </div>
                </div>

                <div className="flex justify-between text-xs border-t border-gray-700/50 pt-1">
                    <span className="text-gray-400">Damage</span>
                    <span className="text-yellow-400 font-mono font-bold">{enemy.damage.toLocaleString()}</span>
                </div>
                 <div className="flex justify-between text-xs">
                    <span className="text-gray-400">XP Value</span>
                    <span className="text-purple-400 font-mono">{enemy.xpValue.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

export default EnemyTooltip;