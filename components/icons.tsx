
import React from 'react';

const IconWrapper: React.FC<{ className?: string, children: React.ReactNode }> = ({ className, children }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
    </svg>
);

export const WarriorIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M19.25 21.25 12 14 4.75 21.25" />
        <path d="M12 14V2.75" />
        <path d="m5 10 7-7 7 7" />
    </IconWrapper>
);

export const MageIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M12 2.75L3.25 8.5 12 21.25l8.75-12.75L12 2.75Z" />
        <path d="M12 12 3.25 8.5" />
        <path d="M12 12v9.25" />
        <path d="M12 12 20.75 8.5" />
        <path d="M3.25 8.5 20.75 8.5" />
    </IconWrapper>
);

export const ArcherIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="m3 21 9-9" />
        <path d="M12 3v9" />
        <path d="m21 3-9 9" />
        <path d="M3 12h18" />
    </IconWrapper>
);

export const SkillIcon1: React.FC<{ className?: string }> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="m15 5-4 4-4-4" />
        <path d="m15 19-4-4-4 4" />
        <path d="M5 9v6" />
        <path d="M19 9v6" />
    </IconWrapper>
);

export const SkillIcon2: React.FC<{ className?: string }> = ({ className }) => (
    <IconWrapper className={className}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 12 8 8" />
        <path d="m12 12 4 4" />
        <path d="m12 12-4 4" />
        <path d="m12 12 4-4" />
    </IconWrapper>
);

export const SkillIcon3: React.FC<{ className?: string }> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M4 14.899A7 7 0 1 1 15 9.1" />
        <path d="M15 9.1L9 15" />
    </IconWrapper>
);

export const SkillIcon4: React.FC<{ className?: string }> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M12 3v18" />
        <path d="m19 12-7 7-7-7" />
    </IconWrapper>
);

export const SkillIcon5: React.FC<{ className?: string }> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M12 2.75L3.25 8.5 12 21.25l8.75-12.75L12 2.75Z" />
    </IconWrapper>
);
