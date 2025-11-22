
import React, { useState, useRef } from 'react';
import { Vector2D } from '../game/types';

interface VirtualJoystickProps {
    onMove: (vector: Vector2D) => void;
}

const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    
    // Configuration
    const maxRadius = 40; 

    const handleTouchStart = () => {
        setActive(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!active || !containerRef.current) return;
        
        const touch = e.touches[0];
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate delta from center
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Clamp to max radius for visual stick
        if (distance > maxRadius) {
            const angle = Math.atan2(dy, dx);
            dx = Math.cos(angle) * maxRadius;
            dy = Math.sin(angle) * maxRadius;
        }
        
        setPosition({ x: dx, y: dy });
        
        // Normalize output (-1 to 1)
        const outputX = dx / maxRadius;
        const outputY = dy / maxRadius;
        
        onMove({ x: outputX, y: outputY });
    };

    const handleTouchEnd = () => {
        setActive(false);
        setPosition({ x: 0, y: 0 });
        onMove({ x: 0, y: 0 });
    };

    return (
        <div 
            className="absolute bottom-8 left-8 w-32 h-32 rounded-full bg-gray-900/50 border-2 border-gray-600 backdrop-blur-sm touch-none flex items-center justify-center z-50 md:hidden"
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div 
                className="w-12 h-12 rounded-full bg-teal-500/80 shadow-lg border-2 border-teal-300"
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    transition: active ? 'none' : 'transform 0.2s ease-out'
                }}
            />
        </div>
    );
};

export default VirtualJoystick;
