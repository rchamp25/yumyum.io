
import React from 'react';
import { CharacterClass } from '../game/types';
import { WarriorIcon, MageIcon, ArcherIcon } from './icons';

interface StartScreenProps {
  onStartGame: (characterClass: CharacterClass) => void;
}

const ClassCard: React.FC<{
  charClass: CharacterClass;
  Icon: React.FC<{ className?: string }>;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}> = ({ charClass, Icon, title, description, color, onClick }) => (
  <button
    onClick={onClick}
    className={`bg-gray-800 border-2 border-gray-700 rounded-lg p-6 text-center transform hover:-translate-y-2 transition-transform duration-300 ease-in-out hover:border-${color}-500 hover:shadow-2xl hover:shadow-${color}-500/20 w-full`}
  >
    <Icon className={`w-20 h-20 mx-auto mb-4 text-${color}-500`} />
    <h3 className={`text-2xl font-bold mb-2 text-${color}-400`}>{title}</h3>
    <p className="text-gray-400">{description}</p>
  </button>
);

const StartScreen: React.FC<StartScreenProps> = ({ onStartGame }) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-md p-8 rounded-xl shadow-lg border border-gray-700 text-center max-w-4xl w-full">
      <h1 className="text-5xl font-bold mb-2 text-white">Choose Your Hero</h1>
      <p className="text-gray-400 mb-8 text-lg">Select a class to begin your adventure.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <ClassCard
          charClass={CharacterClass.Warrior}
          Icon={WarriorIcon}
          title="Warrior"
          description="A sturdy melee fighter who excels at close-quarters combat."
          color="red"
          onClick={() => onStartGame(CharacterClass.Warrior)}
        />
        <ClassCard
          charClass={CharacterClass.Mage}
          Icon={MageIcon}
          title="Mage"
          description="A powerful spellcaster who vanquishes foes from a distance."
          color="blue"
          onClick={() => onStartGame(CharacterClass.Mage)}
        />
        <ClassCard
          charClass={CharacterClass.Archer}
          Icon={ArcherIcon}
          title="Archer"
          description="A swift marksman who rains arrows upon unsuspecting enemies."
          color="green"
          onClick={() => onStartGame(CharacterClass.Archer)}
        />
      </div>
    </div>
  );
};

export default StartScreen;