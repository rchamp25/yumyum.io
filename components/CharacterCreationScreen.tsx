
import React, { useState, useEffect } from 'react';
import { CharacterClass } from '../game/types';
import { WarriorIcon, MageIcon, ArcherIcon } from './icons';

interface CharacterCreationScreenProps {
  onCreate: (name: string, characterClass: CharacterClass) => void;
  onCancel: () => void;
  checkNameTaken: (name: string) => Promise<boolean>;
}

// Tailwind only generates classes it can find as complete strings, so each color is spelled out
const CLASS_CARD_COLORS = {
  red: { selected: 'border-red-500 shadow-2xl shadow-red-500/20', icon: 'text-red-500', title: 'text-red-400' },
  blue: { selected: 'border-blue-500 shadow-2xl shadow-blue-500/20', icon: 'text-blue-500', title: 'text-blue-400' },
  green: { selected: 'border-green-500 shadow-2xl shadow-green-500/20', icon: 'text-green-500', title: 'text-green-400' },
};

const ClassCard: React.FC<{
  Icon: React.FC<{ className?: string }>;
  title: string;
  description: string;
  color: keyof typeof CLASS_CARD_COLORS;
  isSelected: boolean;
  onClick: () => void;
}> = ({ Icon, title, description, color, isSelected, onClick }) => {
  const colors = CLASS_CARD_COLORS[color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-gray-800 border-2 rounded-lg p-4 md:p-6 text-center transform hover:-translate-y-1 transition-all duration-300 ease-in-out w-full
        ${isSelected ? colors.selected : 'border-gray-700'}`}
    >
      <Icon className={`w-12 h-12 md:w-20 md:h-20 mx-auto mb-2 md:mb-4 ${colors.icon}`} />
      <h3 className={`text-xl md:text-2xl font-bold mb-1 md:mb-2 ${colors.title}`}>{title}</h3>
      <p className="text-gray-400">{description}</p>
    </button>
  );
};

const CharacterCreationScreen: React.FC<CharacterCreationScreenProps> = ({ onCreate, onCancel, checkNameTaken }) => {
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  
  // Debounced name check
  useEffect(() => {
      if (!name) {
          setError(null);
          setIsChecking(false);
          return;
      }

      if (name.length > 12) {
          setError("Name cannot exceed 12 characters.");
          setIsChecking(false);
          return;
      }

      // Only letters, numbers, and US Shift+Numbers special characters: !@#$%^&*()
      const validCharsRegex = /^[a-zA-Z0-9!@#$%^&*()]+$/;
      if (!validCharsRegex.test(name)) {
          setError("Only letters, numbers, and !@#$%^&*() allowed.");
          setIsChecking(false);
          return;
      }

      // If basic validation passes, check database
      setError(null);
      setIsChecking(true);

      const debounceTimer = setTimeout(async () => {
          const exists = await checkNameTaken(name);
          setIsChecking(false);
          if (exists) {
              setError("Name is already taken.");
          }
      }, 500);

      return () => clearTimeout(debounceTimer);
  }, [name, checkNameTaken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && selectedClass !== null && !error && !isChecking) {
      onCreate(name.trim(), selectedClass);
    }
  };

  const isCreateDisabled = !name.trim() || selectedClass === null || !!error || isChecking;

  return (
    <div className="bg-gray-900/50 backdrop-blur-md p-5 md:p-8 rounded-xl shadow-lg border border-gray-700 text-center max-w-4xl w-full">
      <h1 className="text-3xl md:text-5xl font-bold mb-2 text-white">Create Your Hero</h1>
      <p className="text-gray-400 mb-6 md:mb-8 md:text-lg">Choose a name and class for your new adventure.</p>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-8 max-w-sm mx-auto relative">
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter character name"
                maxLength={12}
                className={`w-full px-4 py-3 bg-gray-900 border-2 rounded-lg text-white placeholder-gray-500 focus:outline-hidden text-center text-lg transition-colors
                    ${error 
                        ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
                        : 'border-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
                    }
                `}
                required
            />
            {isChecking && (
                <span className="absolute right-3 top-4 text-gray-400 text-xs animate-pulse">Checking...</span>
            )}
            {error && (
                <div className="text-red-500 text-sm mt-2 font-bold animate-fade-in">
                    {error}
                </div>
            )}
            <div className="text-gray-500 text-xs mt-1">
                Max 12 chars. Letters, numbers, !@#$%^&*() only.
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-6 md:mb-8">
            <ClassCard
                Icon={WarriorIcon} title="Warrior" description="A sturdy melee fighter." color="red"
                isSelected={selectedClass === CharacterClass.Warrior}
                onClick={() => setSelectedClass(CharacterClass.Warrior)}
            />
            <ClassCard
                Icon={MageIcon} title="Mage" description="A powerful spellcaster." color="blue"
                isSelected={selectedClass === CharacterClass.Mage}
                onClick={() => setSelectedClass(CharacterClass.Mage)}
            />
            <ClassCard
                Icon={ArcherIcon} title="Archer" description="A swift marksman." color="green"
                isSelected={selectedClass === CharacterClass.Archer}
                onClick={() => setSelectedClass(CharacterClass.Archer)}
            />
        </div>
        
        <div className="flex justify-center space-x-4">
            <button
                type="button"
                onClick={onCancel}
                className="bg-gray-600 text-white font-bold py-3 px-8 rounded-lg text-xl hover:bg-gray-700 transition-colors"
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={isCreateDisabled}
                className={`font-bold py-3 px-8 rounded-lg text-xl transition-colors
                    ${isCreateDisabled 
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                        : 'bg-teal-500 text-white hover:bg-teal-600'
                    }
                `}
            >
                Create
            </button>
        </div>
      </form>
    </div>
  );
};

export default CharacterCreationScreen;
