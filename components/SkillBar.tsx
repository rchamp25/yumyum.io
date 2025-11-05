import React, { useState, useEffect } from 'react';
import { SkillState } from '../game/types';
import { SkillIcon1, SkillIcon2, SkillIcon3, SkillIcon4, SkillIcon5 } from './icons';

interface SkillBarProps {
  skills: SkillState[];
  onUseSkill: (index: number) => void;
}

const skillIcons = [SkillIcon1, SkillIcon2, SkillIcon3, SkillIcon4, SkillIcon5];

const SkillSlot: React.FC<{ skill: SkillState; keybind: string; Icon: React.FC<{ className?: string }>; onClick: () => void }> = ({ skill, keybind, Icon, onClick }) => {
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const updateCooldown = () => {
      const now = Date.now();
      const timeSinceUsed = now - skill.lastUsed;
      const remaining = skill.definition.cooldown - timeSinceUsed;
      setCooldown(remaining > 0 ? remaining : 0);
    };

    updateCooldown();
    // Update more frequently for a smoother animation
    const interval = setInterval(updateCooldown, 50);

    return () => clearInterval(interval);
  }, [skill.lastUsed, skill.definition.cooldown]);

  const percentage = (cooldown / skill.definition.cooldown) * 100;
  const isOnCooldown = cooldown > 0;

  return (
    <button
      onClick={onClick}
      disabled={isOnCooldown}
      className="relative w-14 h-14 bg-gray-900 border-2 border-gray-600 rounded-md flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={`Use skill: ${skill.definition.name} (Key ${keybind})`}
    >
      <Icon className={`w-8 h-8 ${isOnCooldown ? 'text-gray-500' : 'text-gray-400'}`} />
      <div className="absolute -top-2 -right-2 bg-gray-900 border border-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-teal-400">
        {keybind}
      </div>

      {isOnCooldown && (
        <>
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-black/60"
            style={{ height: `${percentage}%` }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl drop-shadow-lg">
            {Math.ceil(cooldown / 1000)}
          </div>
        </>
      )}

      <div className="absolute bottom-full mb-2 w-48 bg-gray-800 text-white text-xs rounded py-1 px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <p className="font-bold text-teal-400">{skill.definition.name}</p>
        <p className="text-gray-300">{skill.definition.description}</p>
        <p className="text-gray-500">Cooldown: {skill.definition.cooldown / 1000}s</p>
      </div>
    </button>
  );
};

const SkillBar: React.FC<SkillBarProps> = ({ skills, onUseSkill }) => {
  if (!skills) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div className="flex space-x-3 bg-gray-800/80 backdrop-blur-sm p-3 rounded-lg shadow-2xl border border-gray-700">
        {skills.map((skill, index) => (
          <SkillSlot 
            key={index} 
            skill={skill} 
            keybind={(index + 1).toString()} 
            Icon={skillIcons[index]}
            onClick={() => onUseSkill(index)} 
          />
        ))}
      </div>
    </div>
  );
};

export default SkillBar;