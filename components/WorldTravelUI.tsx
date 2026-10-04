
import React from 'react';
import { WORLD_IDS } from '../game/constants';

interface WorldTravelUIProps {
    onClose: () => void;
    onTravelToWorld: (worldId: string) => void;
    currentWorldId: string;
}

const WorldTravelUI: React.FC<WorldTravelUIProps> = ({ onClose, onTravelToWorld, currentWorldId }) => {
    const worlds = [
        { id: WORLD_IDS.WORLD_1, name: 'The Rat', isActive: true, description: 'A balanced land of monsters and adventure.' },
        { id: WORLD_IDS.WORLD_2, name: 'The Grove', isActive: true, description: 'A dense forest overrun by nature\'s wrath. (HARD)' },
        { id: 'world_3', name: 'Red Jug', isActive: false, description: 'A volcanic wasteland where only the strong survive. (Coming Soon)' },
    ];

    return (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center pointer-events-auto z-60" onClick={onClose}>
            <div className="bg-gray-900/95 backdrop-blur-md p-4 md:p-6 rounded-xl shadow-2xl border border-indigo-500/50 w-[95%] md:max-w-3xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 md:mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-indigo-400 flex items-center">
                        <span className="mr-2 md:mr-3 text-3xl md:text-4xl">🌍</span> World Transport
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                
                <div className="grid grid-cols-1 gap-3 md:gap-4 max-h-[70vh] overflow-y-auto">
                    {worlds.map(world => {
                        const isCurrent = world.id === currentWorldId;
                        
                        return (
                            <div 
                                key={world.id}
                                className={`relative p-4 md:p-6 rounded-xl border-2 flex flex-col md:flex-row justify-between items-center transition-all duration-300 gap-4
                                    ${world.isActive 
                                        ? 'bg-indigo-900/30 border-indigo-500' 
                                        : 'bg-gray-800/50 border-gray-700 grayscale opacity-70'}
                                `}
                            >
                                <div className="text-center md:text-left">
                                    <h3 className={`text-xl md:text-2xl font-bold mb-1 ${world.isActive ? 'text-white' : 'text-gray-500'}`}>{world.name}</h3>
                                    <p className="text-sm md:text-base text-gray-400">{world.description}</p>
                                </div>

                                {isCurrent ? (
                                    <span className="bg-indigo-600 text-white font-bold px-4 py-2 rounded-full shadow-lg text-sm">
                                        Current
                                    </span>
                                ) : world.isActive ? (
                                    <button 
                                        onClick={() => onTravelToWorld(world.id)}
                                        className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2 rounded-full shadow-lg transition-colors text-sm w-full md:w-auto"
                                    >
                                        Travel
                                    </button>
                                ) : (
                                    <span className="bg-gray-700 text-gray-400 font-bold px-4 py-2 rounded-full flex items-center text-sm">
                                        🔒 Locked
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export default WorldTravelUI;
