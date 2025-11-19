
import { Vector2D, WaypointData } from '../types';

export class Waypoint {
    data: WaypointData;
    radius: number = 40;
    interactionRadius: number = 60;
    unlockRadius: number = 150;
    
    private animationOffset: number = 0;

    constructor(data: WaypointData) {
        this.data = data;
        this.animationOffset = Math.random() * 1000;
    }

    draw(ctx: CanvasRenderingContext2D, isDiscovered: boolean) {
        const x = this.data.position.x;
        const y = this.data.position.y;
        const time = Date.now() + this.animationOffset;
        
        ctx.save();
        
        // Base Rune
        ctx.beginPath();
        ctx.ellipse(x, y, this.radius, this.radius * 0.6, 0, 0, Math.PI * 2);
        
        if (isDiscovered) {
            // Pulse effect
            const pulse = 1 + Math.sin(time * 0.002) * 0.1;
            const glowAlpha = 0.3 + Math.sin(time * 0.002) * 0.2;
            
            ctx.scale(pulse, pulse);
            ctx.fillStyle = `rgba(34, 211, 238, ${glowAlpha})`; // Cyan glow
            ctx.fill();
            ctx.scale(1/pulse, 1/pulse); // Reset scale for stroke

            ctx.strokeStyle = '#06b6d4'; // Cyan-500
            ctx.lineWidth = 3;
            ctx.stroke();

            // Floating Crystal/Icon
            const floatY = y - 40 + Math.sin(time * 0.001) * 10;
            
            // Shadow
            ctx.beginPath();
            ctx.ellipse(x, y + 5, 10, 5, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fill();

            // Crystal
            ctx.beginPath();
            ctx.moveTo(x, floatY - 20);
            ctx.lineTo(x + 15, floatY);
            ctx.lineTo(x, floatY + 20);
            ctx.lineTo(x - 15, floatY);
            ctx.closePath();
            ctx.fillStyle = '#22d3ee';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Name
            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(this.data.name, x, y - 70);

        } else {
            // Undiscovered - Gray/Inactive
            ctx.fillStyle = 'rgba(75, 85, 99, 0.3)'; // Gray-600
            ctx.fill();
            ctx.strokeStyle = '#4b5563';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Floating Rock (Inactive)
            const floatY = y - 40;
             ctx.beginPath();
            ctx.moveTo(x, floatY - 15);
            ctx.lineTo(x + 10, floatY);
            ctx.lineTo(x, floatY + 15);
            ctx.lineTo(x - 10, floatY);
            ctx.closePath();
            ctx.fillStyle = '#4b5563';
            ctx.fill();
            
            // ? Symbol
            ctx.fillStyle = '#9ca3af';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('?', x, y - 70);
        }

        ctx.restore();
    }
}
