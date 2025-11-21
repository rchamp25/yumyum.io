
import React, { useState, useEffect } from 'react';
import { CharacterClass } from '../game/types';
import { WarriorIcon, MageIcon, ArcherIcon } from './icons';
import { storageService } from '../services/storage';

interface CharacterCreationScreenProps {
  onCreate: (name: string, characterClass: CharacterClass) => void;
  onCancel: () => void;
}

const ClassCard: React.FC<{
  Icon: React.FC<{ className?: string }>;
  title: string;
  description: string;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}> = ({ Icon, title, description, color, isSelected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`bg-gray-800 border-2 rounded-lg p-6 text-center transform hover:-translate-y-1 transition-all duration-300 ease-in-out w-full
      ${isSelected ? `border-${color}-500 shadow-2xl shadow-${color}-500/20` : 'border-gray-700'}`}
  >
    <Icon className={`w-20 h-20 mx-auto mb-4 text-${color}-500`} />
    <h3 className={`text-2xl font-bold mb-2 text-${color}-400`}>{title}</h3>
    <p className="text-gray-400">{description}</p>
  </button>
);

const CharacterCreationScreen: React.FC<CharacterCreationScreenProps> = ({ onCreate, onCancel }) => {
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
          const exists = await storageService.checkCharacterNameExists(name);
          setIsChecking(false);
          if (exists) {
              setError("Name is already taken.");
          }
      }, 500);

      return () => clearTimeout(debounceTimer);
  }, [name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && selectedClass !== null && !error && !isChecking) {
      onCreate(name.trim(), selectedClass);
    }
  };

  const isCreateDisabled = !name.trim() || selectedClass === null || !!error || isChecking;

  return (
    <div className="bg-gray-900/50 backdrop-blur-md p-8 rounded-xl shadow-lg border border-gray-700 text-center max-w-4xl w-full">
      <h1 className="text-5xl font-bold mb-2 text-white">Create Your Hero</h1>
      <p className="text-gray-400 mb-8 text-lg">Choose a name and class for your new adventure.</p>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-8 max-w-sm mx-auto relative">
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter character name"
                maxLength={12}
                className={`w-full px-4 py-3 bg-gray-900 border-2 rounded-lg text-white placeholder-gray-500 focus:outline-none text-center text-lg transition-colors
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
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
