
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

  // Fire on touchstart for instant response on mobile. React registers touch listeners as passive,
  // so the follow-up click can't be cancelled, but the skill cooldown makes it a no-op.
  const handleTouch = () => {
      if (!isDisabled) onClick();
  };

  return (
    <button
      onClick={onClick}
      onTouchStart={handleTouch}
      disabled={isDisabled}
      className="relative w-12 h-12 md:w-16 md:h-16 bg-gray-950 border-2 border-white/10 rounded-xl flex items-center justify-center group focus:outline-hidden focus:ring-2 focus:ring-teal-400 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 overflow-hidden shadow-lg"
      aria-label={`Use skill: ${skill.definition.name} (Key ${keybind})`}
    >
      <Icon className={`w-7 h-7 md:w-9 md:h-9 ${isDisabled ? 'text-gray-600' : 'text-teal-400 group-hover:text-teal-300 transition-colors'}`} />
      
      <div className="absolute top-0.5 right-1 bg-black/40 text-[8px] md:text-[10px] font-black text-teal-400/60 uppercase select-none">
        {keybind}
      </div>

      {isLocked && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-[1px]">
              <LockIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-500" />
          </div>
      )}

      {isOnCooldown && !isLocked && (
        <>
          <div
            className="absolute bottom-0 left-0 right-0 bg-teal-500/20"
            style={{ height: `${percentage}%` }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center text-white font-black text-base md:text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
            {Math.ceil(cooldown / 1000)}
          </div>
        </>
      )}

      <div className="absolute bottom-full mb-3 w-48 bg-gray-900/95 border border-white/10 text-white text-[11px] rounded-lg p-2.5 text-center opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 pointer-events-none hidden md:block z-100 shadow-2xl backdrop-blur-md">
        <p className="font-black text-teal-400 uppercase tracking-widest mb-1">{skill.definition.name}</p>
        {isLocked ? (
            <p className="text-red-400 font-bold italic">Requires Level {skill.definition.unlockLevel}</p>
        ) : (
             <>
                <p className="text-gray-300 leading-tight">{skill.definition.description}</p>
                <div className="mt-1.5 pt-1.5 border-t border-white/5 flex justify-between text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
                    <span>Cooldown</span>
                    <span>{skill.definition.cooldown / 1000}s</span>
                </div>
            </>
        )}
      </div>
    </button>
  );
};

const SkillBar: React.FC<SkillBarProps> = ({ player, onUseSkill }) => {
  if (!player.skills) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto z-50 md:bottom-8">
      <div className="flex gap-2 md:gap-3 bg-gray-900/60 backdrop-blur-xl p-2.5 md:p-3 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.5)] border border-white/10">
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
