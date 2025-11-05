
import React from 'react';
import { CharacterData, CharacterClass } from '../game/types';
import { WarriorIcon, MageIcon, ArcherIcon } from './icons';
import { GoogleUser } from '../services/auth';

interface CharacterSelectScreenProps {
  user: GoogleUser;
  characters: CharacterData[];
  onSelectCharacter: (character: CharacterData) => void;
  onCreateNew: () => void;
  onDeleteCharacter: (characterId: string) => void;
  onLogout: () => void;
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
                    <p>Gold: <span className="font-semibold text-yellow-400">{character.gold}</span></p>
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

const CharacterSelectScreen: React.FC<CharacterSelectScreenProps> = ({ user, characters, onSelectCharacter, onCreateNew, onDeleteCharacter, onLogout }) => {
  const slots = Array(3).fill(null);
  characters.forEach((char, index) => {
    if(index < 3) slots[index] = char;
  });

  return (
    <div className="bg-gray-900/50 backdrop-blur-md p-8 rounded-xl shadow-lg border border-gray-700 text-center max-w-4xl w-full">
      <div className="flex justify-between items-start mb-6">
        <div>
            <h1 className="text-4xl font-bold text-white text-left">Your Heroes</h1>
            <p className="text-gray-400 text-left">Welcome, {user.displayName}!</p>
        </div>
        <button onClick={onLogout} className="bg-gray-700 text-white font-bold py-2 px-4 rounded hover:bg-gray-600 transition-colors">Sign Out</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {slots.map((char, index) =>
          char ? (
            <CharacterCard key={char.id} character={char} onSelect={() => onSelectCharacter(char)} onDelete={() => onDeleteCharacter(char.id)} />
          ) : (
            <EmptySlotCard key={index} onCreate={onCreateNew} />
          )
        )}
      </div>
    </div>
  );
};

export default CharacterSelectScreen;