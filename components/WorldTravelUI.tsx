
import React from 'react';

interface WorldTravelUIProps {
    onClose: () => void;
}

const WorldTravelUI: React.FC<WorldTravelUIProps> = ({ onClose }) => {
    const worlds = [
        { id: 'world_1', name: 'The Rat', isActive: true, description: 'A balanced land of monsters and adventure.' },
        { id: 'world_2', name: 'The Grove', isActive: false, description: 'A dense forest overrun by nature\'s wrath. (Coming Soon)' },
        { id: 'world_3', name: 'Red Jug', isActive: false, description: 'A volcanic wasteland where only the strong survive. (Coming Soon)' },
    ];

    return (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center pointer-events-auto z-50" onClick={onClose}>
            <div className="bg-gray-900/95 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-indigo-500/50 max-w-3xl w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-indigo-400 flex items-center">
                        <span className="mr-3 text-4xl">🌍</span> Rory's World Transport
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                
                <p className="text-gray-300 mb-8 text-lg">"The realms are vast. Where would you like to go today?"</p>

                <div className="grid grid-cols-1 gap-4">
                    {worlds.map(world => (
                        <div 
                            key={world.id}
                            className={`relative p-6 rounded-xl border-2 flex justify-between items-center transition-all duration-300
                                ${world.isActive 
                                    ? 'bg-indigo-900/30 border-indigo-500' 
                                    : 'bg-gray-800/50 border-gray-700 grayscale opacity-70'}
                            `}
                        >
                            <div>
                                <h3 className={`text-2xl font-bold mb-1 ${world.isActive ? 'text-white' : 'text-gray-500'}`}>{world.name}</h3>
                                <p className="text-gray-400">{world.description}</p>
                            </div>

                            {world.isActive ? (
                                <span className="bg-indigo-600 text-white font-bold px-4 py-2 rounded-full shadow-lg shadow-indigo-500/30">
                                    Current World
                                </span>
                            ) : (
                                <span className="bg-gray-700 text-gray-400 font-bold px-4 py-2 rounded-full flex items-center">
                                    🔒 Locked
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WorldTravelUI;
