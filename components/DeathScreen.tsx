import React from 'react';
import { GameStats } from '../game/types';

interface DeathScreenProps {
  stats: GameStats | null;
  onReturnToMenu: () => void;
  onRespawnInGame: () => void;
}

const DeathScreen: React.FC<DeathScreenProps> = ({ stats, onReturnToMenu, onRespawnInGame }) => {
  return (
    <div className="bg-gray-800/80 backdrop-blur-md p-8 rounded-xl shadow-lg border border-red-500/50 text-center max-w-lg w-full animate-fade-in">
      <h1 className="text-6xl font-extrabold mb-2 text-red-500">You Died</h1>
      <p className="text-lg text-gray-400 mb-6">
        Slain by a <span className="font-bold text-white">{stats?.killerName || 'an unknown force'}</span>
      </p>

      <div className="grid grid-cols-2 gap-4 my-6 text-lg text-left bg-gray-900/40 p-4 rounded-lg border border-gray-700">
        <div>Level: <span className="font-bold text-white">{stats?.level}</span></div>
        <div>Kills: <span className="font-bold text-white">{stats?.kills}</span></div>
        <div>Gold: <span className="font-bold text-yellow-400">{stats?.gold}</span></div>
        <div>Damage Taken: <span className="font-bold text-red-400">{stats?.totalDamageTaken?.toLocaleString() || 0}</span></div>
      </div>
      
       {stats?.deathLog && stats.deathLog.length > 0 && (
            <div className="text-left bg-gray-900/50 p-4 rounded-lg border border-gray-700 mb-8">
                <h3 className="font-bold mb-2 text-white">Final Moments:</h3>
                <ul className="space-y-1 text-sm text-gray-400">
                    {stats.deathLog.map((event, index) => (
                        <li key={index} className="opacity-80">- {event.message}</li>
                    ))}
                </ul>
            </div>
        )}

      <div className="flex justify-center space-x-4">
        <button
          onClick={onReturnToMenu}
          className="bg-gray-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-gray-700 transition-colors duration-300"
        >
          Return to Menu
        </button>
        <button
          onClick={onRespawnInGame}
          className="bg-teal-500 text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-teal-600 transition-colors duration-300 transform hover:scale-105"
        >
          Respawn
        </button>
      </div>
    </div>
  );
};

export default DeathScreen;