import React from 'react';
import { Item, ItemSlot } from '../game/types';

const Icon: React.FC<{ className?: string, children: React.ReactNode }> = ({ className, children }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const WarriorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Icon className={className}>
    <path d="M19.25 12.25L12 19.5L4.75 12.25L12 5L19.25 12.25Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
    <path d="M12 5V2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
    <path d="M12 19.5V22" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
    <path d="M5 12H2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
    <path d="M19 12H22" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
  </Icon>
);

export const MageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Icon className={className}>
    <path d="M3 7l4-4 4 4M7 3v13" />
    <path d="M13 21l4-4 4 4M17 21V8" />
    <path d="M5 21h14" />
  </Icon>
);

export const ArcherIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Icon className={className}>
    <path d="M15 3h6v6" />
    <path d="M3 21l18-18" />
    <path d="M10 13L2.1 21.9" />
    <path d="M11 14l-2.5 2.5" />
    <path d="M14 11l2.5-2.5" />
  </Icon>
);

// --- Skill Icons ---
// FIX: Replaced generic placeholder icons with more descriptive and unique designs for skills.
export const SkillIcon1: React.FC<{ className?: string }> = ({ className }) => <Icon className={className}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></Icon>;
export const SkillIcon2: React.FC<{ className?: string }> = ({ className }) => <Icon className={className}><path d="M13 2H3v10h10V2z"/><path d="M21 12h-6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h6v10z"/></Icon>;
export const SkillIcon3: React.FC<{ className?: string }> = ({ className }) => <Icon className={className}><path d="M4.5 16.5c-1.5 1.5-3 1.5-4.5 0"/><path d="M19.5 4.5c1.5-1.5 3-1.5 4.5 0"/><path d="M6.5 14.5l11-11"/><path d="M14.5 6.5l-11 11"/></Icon>;
export const SkillIcon4: React.FC<{ className?: string }> = ({ className }) => <Icon className={className}><path d="M9 18V5l12-2v13"/><path d="M9 18l-4 4"/><path d="M9 5l4-4"/></Icon>;
export const SkillIcon5: React.FC<{ className?: string }> = ({ className }) => <Icon className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Icon>;

// --- UI & Item Icons ---
export const InventoryIcon: React.FC<{ className?: string }> = ({ className }) => <Icon className={className}><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></Icon>;
export const SwordIcon: React.FC<{ className?: string }> = ({ className }) => <Icon className={className}><path d="m15.5 13.5 6-6"/><path d="M22 2 12 12"/><path d="M6 12 2 22"/><path d="M9.5 14.5 2 22"/></Icon>;
export const VestIcon: React.FC<{ className?: string }> = ({ className }) => <Icon className={className}><path d="M18 2H6l-4 8 4 12h12l4-12-4-8Z"/><path d="M6 10h12"/><path d="M6 14h12"/></Icon>;
export const BootsIcon: React.FC<{ className?: string }> = ({ className }) => <Icon className={className}><path d="m2 17 4.5-5.5.5.5-1 2-2 2-2 1.5Z"/><path d="M10 17 8.5 14l-2-3-1-1.5-1.5-.5-1.5 1Z"/><path d="m14 20-3-3 2-2 3 3 2.5 1.5Z"/><path d="M10.5 13.5 12 12l2.5 1.5L16 15l1.5 2.5.5 1.5-1 1-1 1-1 1-1 .5Z"/><path d="M22 17h-5.5l-1.5-2-1.5-2-1-1.5-1-1.5-.5-1.5.5-1 1-1 .5-1 .5-.5 1-1.5L14 3.5 16 2l3.5 3.5.5 1.5Z"/></Icon>;
export const RingIcon: React.FC<{ className?: string }> = ({ className }) => <Icon className={className}><path d="M10.8 12.8a2.3 2.3 0 0 0 3.4 0l1.6-1.6a2.3 2.3 0 0 0-3.4-3.4l-1.6 1.6a2.3 2.3 0 0 0 0 3.4Z"/><path d="M16 6h2v2h-2z"/><path d="M6 16h2v2h-2z"/><circle cx="12" cy="12" r="10"/></Icon>;
export const HammerIcon: React.FC<{ className?: string }> = ({ className }) => <Icon className={className}><path d="m15 12-8.373 8.373a1 1 0 1 1-1.414-1.414L13.586 10.5"/><path d="M18 15 6 3"/><path d="m22 2-1.5 1.5"/><path d="m2 22 1.5-1.5"/></Icon>;

export const ItemIcon: React.FC<{ item: Item, className?: string }> = ({ item, className }) => {
    switch (item.slot) {
        case ItemSlot.Weapon: return <SwordIcon className={className} />;
        case ItemSlot.Armor: return <VestIcon className={className} />;
        case ItemSlot.Boots: return <BootsIcon className={className} />;
        case ItemSlot.Accessory: return <RingIcon className={className} />;
        default:
            return <div className={className}>?</div>;
    }
};
