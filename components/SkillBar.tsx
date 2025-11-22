
import React, { useState, useEffect } from 'react';
import { SkillState } from '../game/types';
import { SkillIcon1, SkillIcon2, SkillIcon3, SkillIcon4, SkillIcon5 } from './icons';
import { Player } from '../game/entities/Player';

interface SkillBarProps {
  player: Player;
  onUseSkill: (index: number) => void;
}

const skillIcons = [SkillIcon1, SkillIcon2, SkillIcon3, SkillIcon4, SkillIcon5];

const LockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

const SkillSlot: React.FC<{ skill: SkillState; keybind: string; Icon: React.FC<{ className?: string }>; onClick: () => void; playerLevel: number; }> = ({ skill, keybind, Icon, onClick, playerLevel }) => {
  const [cooldown, setCooldown] = useState(0);

  const isLocked = playerLevel < skill.definition.unlockLevel;

  useEffect(() => {
    if (isLocked) return;
    const updateCooldown = () => {
      const now = Date.now();
      const timeSinceUsed = now - skill.lastUsed;
      const remaining = skill.definition.cooldown - timeSinceUsed;
      setCooldown(remaining > 0 ? remaining : 0);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 50);

    return () => clearInterval(interval);
  }, [skill.lastUsed, skill.definition.cooldown, isLocked]);

  const percentage = (cooldown / skill.definition.cooldown) * 100;
  const isOnCooldown = cooldown > 0;
  const isDisabled = isOnCooldown || isLocked;

  const handleTouch = (e: React.TouchEvent) => {
      // Prevent default to avoid double-firing with click, and execute immediately
      e.preventDefault(); 
      if (!isDisabled) onClick();
  };

  return (
    <button
      onClick={onClick}
      onTouchStart={handleTouch}
      disabled={isDisabled}
      className="relative w-12 h-12 md:w-14 md:h-14 bg-gray-900 border-2 border-gray-600 rounded-md flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={`Use skill: ${skill.definition.name} (Key ${keybind})`}
    >
      <Icon className={`w-6 h-6 md:w-8 md:h-8 ${isDisabled ? 'text-gray-500' : 'text-gray-400'}`} />
      <div className="absolute -top-2 -right-2 bg-gray-900 border border-gray-600 rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-[10px] md:text-xs font-bold text-teal-400">
        {keybind}
      </div>

      {isLocked && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-md">
              <LockIcon className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
          </div>
      )}

      {isOnCooldown && !isLocked && (
        <>
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-black/60 rounded-b-sm"
            style={{ height: `${percentage}%` }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg md:text-xl drop-shadow-lg">
            {Math.ceil(cooldown / 1000)}
          </div>
        </>
      )}

      <div className="absolute bottom-full mb-2 w-48 bg-gray-800 text-white text-xs rounded py-1 px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden md:block">
        <p className="font-bold text-teal-400">{skill.definition.name}</p>
        {isLocked ? (
            <p className="text-red-400 font-bold">Unlocks at Level {skill.definition.unlockLevel}</p>
        ) : (
             <>
                <p className="text-gray-300">{skill.definition.description}</p>
                <p className="text-gray-500">Cooldown: {skill.definition.cooldown / 1000}s</p>
            </>
        )}
      </div>
    </button>
  );
};

const SkillBar: React.FC<SkillBarProps> = ({ player, onUseSkill }) => {
  if (!player.skills) return null;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto z-50 md:bottom-4">
      <div className="flex space-x-2 md:space-x-3 bg-gray-800/80 backdrop-blur-sm p-2 md:p-3 rounded-lg shadow-2xl border border-gray-700">
        {player.skills.map((skill, index) => (
          <SkillSlot 
            key={index} 
            skill={skill} 
            playerLevel={player.level}
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
