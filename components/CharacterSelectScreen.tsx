
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
  isDevMode: boolean;
  onSetDevMode: (isDev: boolean) => void;
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
        <div className={`bg-gray-900 border-2 border-gray-800 rounded-2xl p-6 flex flex-col justify-between transform hover:-translate-y-1 transition-all duration-300 ease-in-out shadow-xl ${colors.border}`}>
            <div>
                <div className="flex items-center mb-4">
                    <div className="bg-gray-800 p-3 rounded-xl mr-4">
                        <ClassIcon charClass={character.characterClass} className={`w-10 h-10 ${colors.text}`} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white">{character.name}</h3>
                        <p className={`text-xs font-black uppercase tracking-widest ${colors.text}`}>Level {character.level}</p>
                    </div>
                </div>
                <div className="text-left text-sm text-gray-500 space-y-2 border-t border-gray-800 pt-4">
                    <div className="flex justify-between"><span>Kills:</span> <span className="text-gray-300 font-bold">{character.kills}</span></div>
                    <div className="flex justify-between"><span>Wealth:</span> <span className="text-yellow-500 font-bold">{(character.gold + (character.bankGold || 0)).toLocaleString()} G</span></div>
                </div>
            </div>
            <div className="mt-6 flex space-x-3">
                <button onClick={onSelect} className="flex-1 bg-teal-600 text-white font-black py-3 rounded-xl hover:bg-teal-500 transition-colors uppercase tracking-widest shadow-lg">Adventure</button>
                <button onClick={onDelete} className="bg-gray-800 text-red-500 font-black px-4 rounded-xl hover:bg-red-950 transition-colors text-xs uppercase">Del</button>
            </div>
        </div>
    );
};

const CharacterSelectScreen: React.FC<CharacterSelectScreenProps> = ({ user, characters, onSelectCharacter, onCreateNew, onDeleteCharacter, onLogout }) => {
  const slots = Array(3).fill(null);
  characters.forEach((char, index) => { if(index < 3) slots[index] = char; });

  return (
    <div className="bg-gray-900/40 backdrop-blur-3xl p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 text-center max-w-6xl w-full">
      <div className="flex justify-between items-end mb-10 border-b border-white/5 pb-8">
        <div className="text-left">
            <h1 className="text-5xl font-black text-white mb-1">Hero Selection</h1>
            <p className="text-teal-500 font-bold uppercase tracking-[0.2em] text-sm">Welcome back, {user.displayName}</p>
        </div>
        <button onClick={onLogout} className="bg-white/5 hover:bg-white/10 text-white/60 font-black py-2.5 px-6 rounded-xl transition-colors border border-white/5 uppercase tracking-widest text-xs">Sign Out</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {slots.map((char, index) => char ? (
            <CharacterCard key={char.id} character={char} onSelect={() => onSelectCharacter(char)} onDelete={() => onDeleteCharacter(char.id)} />
          ) : (
            <button key={index} onClick={onCreateNew} className="bg-white/[0.02] border-2 border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center hover:border-teal-500/50 hover:bg-teal-500/[0.02] transition-all group min-h-[300px]">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl text-white/20 group-hover:text-teal-400 group-hover:bg-teal-400/10 transition-all mb-4">+</div>
                <h3 className="text-lg font-black text-white/20 uppercase tracking-widest group-hover:text-teal-400/50 transition-colors">New Hero</h3>
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default CharacterSelectScreen;
