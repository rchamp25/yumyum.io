
import React, { useState, useEffect } from 'react';
import { CharacterData, CharacterClass, Difficulty } from '../game/types';
import { WarriorIcon, MageIcon, ArcherIcon } from './icons';
import { GoogleUser } from '../services/auth';
import { socketService } from '../services/socketService';

interface CharacterSelectScreenProps {
  user: GoogleUser;
  characters: CharacterData[];
  onSelectCharacter: (character: CharacterData, difficulty?: Difficulty) => void;
  onCreateNew: () => void;
  onDeleteCharacter: (characterId: string) => void;
  onLogout: () => void;
  isDevMode: boolean;
  onSetDevMode: (isDev: boolean) => void;
  isOnlineMode: boolean;
  onSetOnlineMode: (isOnline: boolean) => void;
}

const ClassIcon: React.FC<{ charClass: CharacterClass, className?: string }> = ({ charClass, className }) => {
    switch (charClass) {
        case CharacterClass.Warrior: return <WarriorIcon className={className} />;
        case CharacterClass.Mage: return <MageIcon className={className} />;
        case CharacterClass.Archer: return <ArcherIcon className={className} />;
        default: return null;
    }
};

const CharacterCard: React.FC<{ character: CharacterData, onSelect: () => void, onDelete: () => void }> = ({ character, onSelect, onDelete }) => {
    const classColors = {
        [CharacterClass.Warrior]: { text: 'text-red-400', border: 'hover:border-red-500' },
        [CharacterClass.Mage]: { text: 'text-blue-400', border: 'hover:border-blue-500' },
        [CharacterClass.Archer]: { text: 'text-green-400', border: 'hover:border-green-500' },
    };
    const colors = classColors[character.characterClass];

    return (
        <div className={`bg-gray-800 border-2 border-gray-700 rounded-lg p-4 flex flex-col justify-between transform hover:-translate-y-1 transition-transform duration-300 ease-in-out ${colors.border}`}>
            <div>
                <div className="flex items-center mb-3">
                    <ClassIcon charClass={character.characterClass} className={`w-12 h-12 mr-4 ${colors.text}`} />
                    <div>
                        <h3 className="text-xl font-bold text-white">{character.name}</h3>
                        <p className={`text-sm font-semibold ${colors.text}`}>{CharacterClass[character.characterClass]} - Level {character.level}</p>
                    </div>
                </div>
                <div className="text-left text-sm text-gray-400 space-y-1">
                    <p>Kills: <span className="font-semibold text-white">{character.kills}</span></p>
                    <p>Gold: <span className="font-semibold text-yellow-400">{character.gold.toLocaleString()}</span></p>
                </div>
            </div>
            <div className="mt-4 flex space-x-2">
                <button onClick={onSelect} className="flex-1 bg-teal-500 text-white font-bold py-2 px-4 rounded hover:bg-teal-600 transition-colors">Play</button>
                <button onClick={onDelete} className="bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700 transition-colors text-sm">Delete</button>
            </div>
        </div>
    );
};

const EmptySlotCard: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
    <button onClick={onCreate} className="bg-gray-900/50 border-2 border-dashed border-gray-600 rounded-lg p-6 text-center flex flex-col items-center justify-center hover:border-teal-500 hover:bg-gray-800/50 transition-colors">
        <span className="text-5xl text-gray-500 mb-2">+</span>
        <h3 className="text-lg font-bold text-gray-400">Create New Character</h3>
    </button>
);

const DevModeToggle: React.FC<{ isDevMode: boolean, onSetDevMode: (isDev: boolean) => void }> = ({ isDevMode, onSetDevMode }) => {
    const [code, setCode] = useState('');
    const [isServerLocked, setServerLocked] = useState(false);

    useEffect(() => {
        // Connect first to ensure socket exists
        socketService.connect(() => {
            // Check status
            socketService.checkServerStatus((locked) => {
                setServerLocked(locked);
            });
        });
    }, []);

    const handleActivate = () => {
        if (code === 'gabs') {
            onSetDevMode(true);
        } else {
            alert('Incorrect dev code.');
        }
    };

    const toggleLock = () => {
        const newState = !isServerLocked;
        setServerLocked(newState);
        socketService.toggleServerLock(newState);
    };

    return (
        <div className={`p-2 rounded-lg border transition-colors ${isDevMode ? 'bg-green-900/50 border-green-500' : 'bg-gray-800/50 border-gray-600'}`}>
            <h4 className="text-xs font-bold text-gray-400 mb-1">Dev Tools</h4>
            {isDevMode ? (
                <div className="flex flex-col space-y-2">
                    <p className="text-sm font-bold text-green-400">Dev Mode Active</p>
                    <button 
                        onClick={toggleLock}
                        className={`px-2 py-1 rounded text-xs font-bold ${isServerLocked ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
                    >
                        Server: {isServerLocked ? 'LOCKED' : 'OPEN'}
                    </button>
                </div>
            ) : (
                <div className="flex items-center space-x-2">
                    <input 
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Dev Code"
                        className="bg-gray-900 text-white text-sm rounded border border-gray-500 px-2 py-1 w-24"
                    />
                    <button onClick={handleActivate} className="bg-gray-600 text-white text-sm font-semibold py-1 px-2 rounded hover:bg-gray-500 transition-colors">
                        Activate
                    </button>
                </div>
            )}
        </div>
    );
};

const ModeToggle: React.FC<{ isOnline: boolean, onToggle: (isOnline: boolean) => void }> = ({ isOnline, onToggle }) => {
    return (
        <div className="p-2 rounded-lg bg-gray-800/50 border-gray-600 border">
            <h4 className="text-xs font-bold text-gray-400 mb-2">World Type</h4>
            <div className="w-48 h-8 flex items-center bg-gray-900 rounded-full p-1">
                <button
                    onClick={() => onToggle(false)}
                    className={`w-1/2 h-full rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300
                    ${!isOnline ? 'bg-teal-500 text-white' : 'text-gray-400'}`}
                >
                    Private
                </button>
                <button
                    onClick={() => onToggle(true)}
                    className={`w-1/2 h-full rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300
                    ${isOnline ? 'bg-red-600 text-white' : 'text-gray-400'}`}
                >
                    Online
                </button>
            </div>
        </div>
    );
};

const DifficultySelectionModal: React.FC<{ onConfirm: (diff: Difficulty) => void, onCancel: () => void }> = ({ onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onCancel}>
            <div className="bg-gray-900/95 border border-gray-600 rounded-xl p-8 max-w-3xl w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-3xl font-bold text-white mb-6 text-center">Select World Difficulty</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Normal */}
                    <button 
                        onClick={() => onConfirm(Difficulty.Normal)}
                        className="bg-gray-800 hover:bg-gray-700 border border-green-500/30 hover:border-green-500 p-6 rounded-lg transition-all group"
                    >
                        <h3 className="text-xl font-bold text-green-400 mb-2">Normal</h3>
                        <ul className="text-sm text-gray-400 space-y-1 text-left">
                            <li>• Standard Experience</li>
                            <li>• Normal Drop Rates</li>
                            <li>• Normal Boss Strength</li>
                        </ul>
                    </button>

                    {/* Hard */}
                    <button 
                        onClick={() => onConfirm(Difficulty.Hard)}
                        className="bg-gray-800 hover:bg-gray-700 border border-yellow-500/30 hover:border-yellow-500 p-6 rounded-lg transition-all group"
                    >
                        <h3 className="text-xl font-bold text-yellow-400 mb-2">Hard</h3>
                        <ul className="text-sm text-gray-400 space-y-1 text-left">
                            <li>• <span className="text-yellow-200">1.5x</span> Loot Drops</li>
                            <li>• <span className="text-red-300">1.5x</span> Boss Health & Damage</li>
                            <li>• Greater Challenge</li>
                        </ul>
                    </button>

                    {/* Insane */}
                    <button 
                        onClick={() => onConfirm(Difficulty.Insane)}
                        className="bg-gray-800 hover:bg-gray-700 border border-red-600/30 hover:border-red-600 p-6 rounded-lg transition-all group"
                    >
                        <h3 className="text-xl font-bold text-red-600 mb-2 group-hover:animate-pulse">INSANE</h3>
                        <ul className="text-sm text-gray-400 space-y-1 text-left">
                            <li>• <span className="text-yellow-200">2.0x</span> Loot Drops</li>
                            <li>• <span className="text-red-300">3.0x</span> Boss Health & Damage</li>
                            <li className="text-red-400 font-bold mt-2 border-t border-red-900/50 pt-2">YOUR STATS HALVED</li>
                            <li className="text-xs text-red-500">(50% HP, DMG, Regen)</li>
                        </ul>
                    </button>
                </div>
                <button onClick={onCancel} className="mt-8 w-full py-2 text-gray-500 hover:text-white">Cancel</button>
            </div>
        </div>
    );
}

const CharacterSelectScreen: React.FC<CharacterSelectScreenProps> = ({ user, characters, onSelectCharacter, onCreateNew, onDeleteCharacter, onLogout, isDevMode, onSetDevMode, isOnlineMode, onSetOnlineMode }) => {
  const [pendingCharacter, setPendingCharacter] = useState<CharacterData | null>(null);

  const slots = Array(3).fill(null);
  characters.forEach((char, index) => {
    if(index < 3) slots[index] = char;
  });

  const handleCharacterClick = (character: CharacterData) => {
      if (isOnlineMode) {
          setPendingCharacter(character);
      } else {
          onSelectCharacter(character);
      }
  };

  const handleDifficultyConfirm = (difficulty: Difficulty) => {
      if (pendingCharacter) {
          onSelectCharacter(pendingCharacter, difficulty);
          setPendingCharacter(null);
      }
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-md p-8 rounded-xl shadow-lg border border-gray-700 text-center max-w-5xl w-full">
      <div className="flex justify-between items-start mb-6">
        <div>
            <h1 className="text-4xl font-bold text-white text-left">Your Heroes</h1>
            <p className="text-gray-400 text-left">Welcome, {user.displayName}!</p>
        </div>
        <div className="flex items-start space-x-4">
          <ModeToggle isOnline={isOnlineMode} onToggle={onSetOnlineMode} />
          <DevModeToggle isDevMode={isDevMode} onSetDevMode={onSetDevMode} />
          <button onClick={onLogout} className="bg-gray-700 text-white font-bold py-2 px-4 rounded hover:bg-gray-600 transition-colors">Sign Out</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {slots.map((char, index) =>
          char ? (
            <CharacterCard key={char.id} character={char} onSelect={() => handleCharacterClick(char)} onDelete={() => onDeleteCharacter(char.id)} />
          ) : (
            <EmptySlotCard key={index} onCreate={onCreateNew} />
          )
        )}
      </div>

      {pendingCharacter && (
          <DifficultySelectionModal 
             onConfirm={handleDifficultyConfirm}
             onCancel={() => setPendingCharacter(null)}
          />
      )}
    </div>
  );
};

export default CharacterSelectScreen;
