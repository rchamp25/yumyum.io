
import React, { useState } from 'react';
import { CharacterClass } from '../game/types';
import { WarriorIcon, MageIcon, ArcherIcon } from './icons';

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
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && selectedClass !== null) {
      onCreate(name.trim(), selectedClass);
    }
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-md p-8 rounded-xl shadow-lg border border-gray-700 text-center max-w-4xl w-full">
      <h1 className="text-5xl font-bold mb-2 text-white">Create Your Hero</h1>
      <p className="text-gray-400 mb-8 text-lg">Choose a name and class for your new adventure.</p>
      
      <form onSubmit={handleSubmit}>
        <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter character name"
            maxLength={16}
            className="w-full max-w-sm mx-auto px-4 py-3 bg-gray-900 border-2 border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 mb-8 text-center text-lg"
            required
        />
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
                disabled={!name.trim() || selectedClass === null}
                className="bg-teal-500 text-white font-bold py-3 px-8 rounded-lg text-xl hover:bg-teal-600 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                Create
            </button>
        </div>
      </form>
    </div>
  );
};

export default CharacterCreationScreen;