
import React, { useState } from 'react';
import { Party, CharacterClass } from '../game/types';

interface PartyUIProps {
    party: Party | null;
    onClose: () => void;
    onInvite: (name: string) => void;
    onLeave: () => void;
}

const PartyUI: React.FC<PartyUIProps> = ({ party, onClose, onInvite, onLeave }) => {
    const [inviteName, setInviteName] = useState('');

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if (inviteName.trim()) {
            onInvite(inviteName.trim());
            setInviteName('');
        }
    };

    const getClassColor = (cls: CharacterClass) => {
        switch (cls) {
            case CharacterClass.Warrior: return 'text-red-400';
            case CharacterClass.Mage: return 'text-blue-400';
            case CharacterClass.Archer: return 'text-green-400';
            default: return 'text-white';
        }
    }

    return (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-auto" onClick={onClose}>
            <div className="bg-gray-900/90 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-blue-500/50 max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-blue-400 flex items-center">
                        <span className="mr-2 text-3xl">👥</span> Party Management
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <div className="mb-6">
                    <h3 className="text-white font-bold mb-2">Members {party ? `(${party.members.length}/4)` : '(0/4)'}</h3>
                    <div className="bg-gray-800 rounded-lg p-2 min-h-[100px]">
                        {party ? (
                            <ul className="space-y-2">
                                {party.members.map(member => (
                                    <li key={member.id} className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
                                        <div>
                                            <span className={`font-bold ${getClassColor(member.characterClass)}`}>{member.name}</span>
                                            <span className="text-gray-400 text-xs ml-2">Lv {member.level}</span>
                                        </div>
                                        {member.id === party.leaderId && <span className="text-yellow-500 text-xs">👑 Leader</span>}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 text-center italic mt-8">You are not in a party.</p>
                        )}
                    </div>
                </div>

                <form onSubmit={handleInvite} className="flex gap-2 mb-6">
                    <input 
                        type="text" 
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="Player Name"
                        className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white flex-grow focus:outline-none focus:border-blue-500"
                    />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded transition-colors">
                        Invite
                    </button>
                </form>

                {party && (
                    <button 
                        onClick={onLeave}
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded transition-colors"
                    >
                        Leave Party
                    </button>
                )}
            </div>
        </div>
    );
};

export default PartyUI;
