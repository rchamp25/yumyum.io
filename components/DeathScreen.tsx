import React from 'react';
import { GameStats } from '../game/types';

interface DeathScreenProps {
  stats: GameStats | null;
  onRespawn: () => void;
}

const DeathScreen: React.FC<DeathScreenProps> = ({ stats, onRespawn }) => {
  return (
    <div className="bg-gray-800/80 backdrop-blur-md p-8 rounded-xl shadow-lg border border-red-500/50 text-center max-w-md w-full animate-fade-in">
      <h1 className="text-6xl font-extrabold mb-4 text-red-500">You Died</h1>
      <div className="text-lg text-gray-300 space-y-2 mb-8 border-t border-b border-gray-700 py-6">
        <p>Level Reached: <span className="font-bold text-white">{stats?.level}</span></p>
        <p>Monsters Slain: <span className="font-bold text-white">{stats?.kills}</span></p>
        <p>Gold Collected: <span className="font-bold text-yellow-400">{stats?.gold}</span></p>
      </div>
      <button
        onClick={onRespawn}
        className="bg-teal-500 text-white font-bold py-3 px-8 rounded-lg text-xl hover:bg-teal-600 transition-colors duration-300 transform hover:scale-105"
      >
        Play Again
      </button>
    </div>
  );
};

export default DeathScreen;