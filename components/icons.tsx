
import React from 'react';
import { Item, ItemSlot } from '../game/types';

export const WarriorIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19.25 21.25L12 14L4.75 21.25" />
        <path d="M12 14V3.75" />
        <path d="M6.25 6.75H17.75" />
    </svg>
);

export const MageIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.13 1L6 16a2 2 0 002 2h8a2 2 0 002-2L17.87 1" />
        <path d="M4 22h16" />
        <path d="M14.1 4.1L12 2 9.9 4.1" />
        <path d="M12 12V2" />
    </svg>
);

export const ArcherIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h6v6" />
        <path d="M9 21H3v-6" />
        <path d="M21 3l-7 7" />
        <path d="M3 21l7-7" />
        <path d="M12 12l8-8" />
    </svg>
);

export const BackpackIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 20V10c0-2.2 1.8-4 4-4h0c2.2 0 4 1.8 4 4v10" />
        <rect x="6" y="10" width="12" height="10" rx="2" />
        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        <path d="M6 14h12" />
    </svg>
);

// Generic Icons
export const SwordIcon: React.FC<{ className?: string }> = ({ className }) => <WarriorIcon className={className} />;
export const VestIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 22a2 2 0 002-2V7l-4-3-4 3v13a2 2 0 002 2h4zM8 22a2 2 0 01-2-2V7l4-3 4 3v13a2 2 0 01-2 2H8z" />
        <path d="M8 7l4-3 4 3" />
    </svg>
);
export const BootsIcon: React.FC<{ className?: string }> = ({ className }) => (
     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 16V6.5a2.5 2.5 0 00-5 0V16" />
        <path d="M11 16H6a2 2 0 01-2-2v-4a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2h-2" />
    </svg>
);
export const RingIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
    </svg>
);
export const BagIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 01-8 0" />
    </svg>
);

const MaterialIcon: React.FC<{ className?: string }> = ({ className }) => (
     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l-5.5 9h11z" />
        <path d="M17.5 22l-5.5-9-5.5 9" />
    </svg>
);

export const SmallLockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V12c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm2.9 8H9.1V7c0-1.6.8-2.9 2.9-2.9s2.9 1.3 2.9 2.9v3z" />
    </svg>
);

// --- Specific Item Icons ---
const RustySwordIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 14.5L9 20l-4-4 5.5-5.5M19 9l-5 5M3 21l-1-1" /><path d="M17 11l-1.5-1.5" /><path d="M21 7l-1.5-1.5" />
    </svg>
);
const SteelLongswordIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.73 3.27a1 1 0 00-1-1L3.27 19.73a1 1 0 001 1L21.73 4.27z" /><path d="M5 19l4-4" />
    </svg>
);
const FallenKingBladeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 14.5L9 20l-4-4 5.5-5.5m7.5-3.5-5 5" /><path d="M2 22l1-1" /><path d="M18 2l-1.5 1.5M22 6l-1.5 1.5" /><path d="M12 6V3l2 2-2 2-2-2 2-2z" />
    </svg>
);
const ShortbowIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20c-4.418 0-8-3.582-8-8s3.582-8 8-8" /><path d="M20 4c-1.488 2.11-3.66 4.75-6.5 7.5" /><path d="M4 12h16" />
    </svg>
);
const ElvenBowIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.44 11.44c.32.32.32.84 0 1.12l-5.6 5.6a.8.8 0 01-1.12 0l-1.6-1.6a.8.8 0 010-1.12l5.6-5.6a.8.8 0 011.12 0z" /><path d="M3 21l6-6" /><path d="M16 8l-6 6" /><path d="M15 3h6v6" /><path d="M21 3l-7 7" />
    </svg>
);
const GnarledStaffIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21l7-7" /><path d="M12 12l.5-1 .5 1-.5 1-.5-1z" /><path d="M10 14l7-7" /><path d="M13 11l.5-1 .5 1-.5 1-.5-1z" /><path d="M17 7l4-4" />
    </svg>
);
const ArchmageStaffIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21l8-8" /><path d="M11 13l6-6" /><circle cx="19" cy="5" r="2" /><path d="M5 3l4 4" />
    </svg>
);
const LeatherTunicIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2H18L20 12L12 22L4 12L6 2Z" /><path d="M6 2L12 10L18 2" />
    </svg>
);
const ChainmailVestIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="6" r="1"/><circle cx="12" cy="6" r="1"/><circle cx="15" cy="6" r="1"/>
        <circle cx="7.5" cy="8.5" r="1"/><circle cx="10.5" cy="8.5" r="1"/><circle cx="13.5" cy="8.5" r="1"/><circle cx="16.5" cy="8.5" r="1"/>
        <path d="M7 11v7h10v-7l-5-2-5 2z"/><path d="M7 11l5-2 5 2"/>
    </svg>
);
const PlateArmorIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3L6 8V16L12 21L18 16V8L12 3Z" /><path d="M6 8L12 12L18 8" /><path d="M12 12V21" />
    </svg>
);
const MageRobesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3v4h14V3" /><path d="M7 7l-2 12h14l-2-12" /><path d="M12 7v14" />
    </svg>
);
const DragonscaleHauberkIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L4 8v8l8 6 8-6V8l-8-6z" /><path d="M4 8l8 4 8-4" /><path d="M12 2v10" /><path d="M12 12l-8 4" /><path d="M12 12l8 4" />
    </svg>
);
const WornBootsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 9V5a2 2 0 00-2-2H8a2 2 0 00-2 2v4" /><path d="M4 11V5a2 2 0 012-2h2" /><path d="M10 11h4" /><path d="M20 11v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8" />
    </svg>
);
const SturdyGreavesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6" /><path d="M18 12V7a2 2 0 00-2-2h-4a2 2 0 00-2 2v5" /><path d="M6 12V7a2 2 0 012-2h4a2 2 0 012 2v5" /><path d="M12 12h-0.01" />
    </svg>
);
const SwiftnessBootsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12l-2-7-5 2-3-5-3 5-5-2-2 7v8a2 2 0 002 2h16a2 2 0 002-2v-8z" /><path d="M12 12V2" />
    </svg>
);
const PlatedSabatonsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20h16" /><path d="M6 16V8a2 2 0 012-2h8a2 2 0 012 2v8" /><path d="M8 12h8" />
    </svg>
);
const WindwalkersIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5" /><path d="M12 5l-4 4" /><path d="M12 5l4 4" /><path d="M5 12h14" />
    </svg>
);
const VitalityRingIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8"/><path d="M12 12l-2 2 4 4 4-4-2-2"/><path d="M12 12V6"/>
    </svg>
);
const PowerAmuletIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 11.5l2 2 4-4"/>
    </svg>
);
const AncientKingSealIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><path d="M12 15l-3-3 3-3 3 3-3 3z"/><path d="M12 1v4m0 14v4m-9-9H-1m26 0h-4M4.2 4.2l2.8 2.8m10 10l2.8 2.8m-10-15.6l2.8-2.8m-10 10l-2.8 2.8"/>
    </svg>
);
const CommonScrapsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 6l-4 4 4 4"/><path d="M10 18l4-4-4-4"/>
    </svg>
);
const UncommonMetalIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 18L18 6" /><path d="M12 12L6 6l12 12" />
    </svg>
);
const RareCrystalIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L4 8l8 6 8-6-8-6z"/><path d="M4 8v8l8 6 8-6V8"/>
    </svg>
);
const EpicOrbIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 00-3.5 19.4"/>
    </svg>
);
const LegendaryCoreIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L4 8l8 14 8-14-8-6z"/><path d="M12 2v20"/>
    </svg>
);

export const HammerIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 12l-8.5 8.5" /><path d="M5.5 11l8-8" /><path d="M12 15l-1.5 1.5" /><path d="M22 2l-5 5" /><path d="M10 14l-1.5 1.5" />
    </svg>
);
export const CoinIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8" /><path d="M12 18V6" /><path d="M16 14c-2 0-3-1-3-3s1-3 3-3" />
    </svg>
);


export const SkillIcon1: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l18 18" /><path d="M12 12l4 4" /><path d="M16 12l4-4" /><path d="M8 12l-4 4" />
    </svg>
);
export const SkillIcon2: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
);
export const SkillIcon3: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);
export const SkillIcon4: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18" /><path d="M9 18l3 3 3-3" /><path d="M15 6l-3-3-3 3" />
    </svg>
);
export const SkillIcon5: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 12.5l-1 5.5c-0.1 0.4 0.3 0.8 0.7 0.7l5.5-1" />
        <path d="M12.5 4.5l5.5-1c-0.4-0.1-0.8 0.3-0.7 0.7l-1 5.5" />
        <path d="M4.5 19.5l1-5.5c0.1-0.4 -0.3-0.8 -0.7-0.7l-5.5 1" />
        <path d="M19.5 4.5l-5.5 1c-0.4 0.1-0.8-0.3-0.7-0.7l1-5.5" />
    </svg>
);

const itemIconMap: { [key: string]: React.FC<{ className?: string }> } = {
  // Weapons
  'w_com_01': RustySwordIcon,
  'w_com_02': ShortbowIcon,
  'w_com_03': GnarledStaffIcon,
  'w_unc_01': SteelLongswordIcon,
  'w_rar_01': ElvenBowIcon,
  'w_epi_01': ArchmageStaffIcon,
  'w_leg_01': FallenKingBladeIcon,
  // Armor
  'a_com_01': LeatherTunicIcon,
  'a_unc_01': ChainmailVestIcon,
  'a_rar_01': PlateArmorIcon,
  'a_epi_01': MageRobesIcon,
  'a_leg_01': DragonscaleHauberkIcon,
  // Boots
  'b_com_01': WornBootsIcon,
  'b_unc_01': SturdyGreavesIcon,
  'b_rar_01': SwiftnessBootsIcon,
  'b_epi_01': PlatedSabatonsIcon,
  'b_leg_01': WindwalkersIcon,
  // Accessories
  'x_rar_01': VitalityRingIcon,
  'x_epi_01': PowerAmuletIcon,
  'x_leg_01': AncientKingSealIcon,
  // Bags
  'bag_com': BagIcon,
  'bag_unc': BagIcon,
  'bag_rar': BagIcon,
  'bag_epi': BagIcon,
  'bag_leg': BagIcon,
  // Materials
  'mat_com': CommonScrapsIcon,
  'mat_unc': UncommonMetalIcon,
  'mat_rar': RareCrystalIcon,
  'mat_epi': EpicOrbIcon,
  'mat_leg': LegendaryCoreIcon,
};

export const ItemIcon: React.FC<{ item: Item; className?: string }> = ({ item, className }) => {
    const SpecificIcon = itemIconMap[item.id];
    if (SpecificIcon) {
        return <SpecificIcon className={className} />;
    }
    // Fallback to generic icons
    if (item.type === 'Material') {
        return <MaterialIcon className={className} />;
    }
    switch (item.slot) {
        case ItemSlot.Weapon: return <SwordIcon className={className} />;
        case ItemSlot.Armor: return <VestIcon className={className} />;
        case ItemSlot.Boots: return <BootsIcon className={className} />;
        case ItemSlot.Accessory: return <RingIcon className={className} />;
        case ItemSlot.Bag: return <BagIcon className={className} />;
        default: return <div className={className}>?</div>;
    }
};
