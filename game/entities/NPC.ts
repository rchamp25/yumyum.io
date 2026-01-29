
import { Character } from './Character';
import { Vector2D, NPCType } from '../types';

export class NPC extends Character {
    npcType: NPCType;
    name: string;
    interactionRadius: number = 50;

    constructor(position: Vector2D, name: string, type: NPCType) {
        // Default color
        let color = '#fbbf24'; // yellow-400
        if (type === NPCType.Banker) {
            color = '#94a3b8'; // slate-400 (Silver/Gray)
        }
        
        super(position, 18, 9999, color, 0);
        this.name = name;
        this.npcType = type;
    }

    update() {
        // NPCs are static for now
    }

    draw(ctx: CanvasRenderingContext2D, canInteract: boolean = false) {
        super.draw(ctx, false);
        
        ctx.save();
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;

        // Name (Below)
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(this.name, this.position.x, this.position.y + this.radius + 22);
        
        // Type (Below Name)
        ctx.fillStyle = '#e2e8f0'; // Light gray
        ctx.font = '10px sans-serif';
        ctx.fillText(`(${NPCType[this.npcType]})`, this.position.x, this.position.y + this.radius + 34);
        
        if (canInteract) {
            // Interaction Prompt Above Head
            const floatOffset = Math.sin(Date.now() / 200) * 3;
            
            ctx.fillStyle = '#facc15'; // yellow-400
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText("Press 'E'", this.position.x, this.position.y - this.radius - 10 + floatOffset);
            
            // Highlight Circle
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, this.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }
}
