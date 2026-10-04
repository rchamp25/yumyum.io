
import React from 'react';
import { WaypointData } from '../game/types';
import { WAYPOINTS } from '../game/constants';

interface FastTravelUIProps {
    discoveredWaypointIds: string[];
    currentWaypointId: string;
    onTravel: (destination: WaypointData) => void;
    onClose: () => void;
}

const FastTravelUI: React.FC<FastTravelUIProps> = ({ discoveredWaypointIds, currentWaypointId, onTravel, onClose }) => {
    return (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center pointer-events-auto z-60" onClick={onClose}>
            <div className="bg-gray-900/90 backdrop-blur-md p-4 md:p-6 rounded-xl shadow-2xl border border-cyan-500/50 w-[95%] md:max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-cyan-400 flex items-center">
                        <span className="mr-2 text-3xl">⚡</span> Fast Travel
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                
                <p className="text-gray-300 mb-4">Select a destination to teleport.</p>

                <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-2">
                    {WAYPOINTS.map(wp => {
                        const isDiscovered = discoveredWaypointIds.includes(wp.id);
                        const isCurrent = wp.id === currentWaypointId;
                        
                        if (!isDiscovered && !isCurrent) {
                             return (
                                <div key={wp.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 opacity-50 flex justify-between items-center cursor-not-allowed">
                                     <div className="flex items-center space-x-3">
                                        <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                                        <span className="text-gray-500 font-mono">Unknown Location</span>
                                     </div>
                                     <span className="text-xs text-gray-600 uppercase font-bold">Locked</span>
                                </div>
                             );
                        }

                        return (
                            <button
                                key={wp.id}
                                onClick={() => !isCurrent && onTravel(wp)}
                                disabled={isCurrent}
                                className={`p-4 rounded-lg border flex justify-between items-center transition-all duration-200
                                    ${isCurrent 
                                        ? 'bg-cyan-900/30 border-cyan-500/50 cursor-default' 
                                        : 'bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20'
                                    }
                                `}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`w-3 h-3 rounded-full ${isCurrent ? 'bg-cyan-400 animate-pulse' : 'bg-green-500'}`}></div>
                                    <div className="text-left">
                                        <div className={`font-bold text-lg ${isCurrent ? 'text-cyan-300' : 'text-white'}`}>{wp.name}</div>
                                        <div className="text-xs text-gray-400">Coords: {Math.round(wp.position.x)}, {Math.round(wp.position.y)}</div>
                                    </div>
                                </div>
                                
                                {isCurrent ? (
                                    <span className="text-sm text-cyan-500 font-bold uppercase tracking-wider">Current</span>
                                ) : (
                                    <span className="bg-cyan-600 text-white text-xs font-bold px-3 py-1 rounded-full">Travel</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default FastTravelUI;
