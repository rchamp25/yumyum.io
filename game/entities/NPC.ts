import { Character } from './Character';
import { Vector2D } from '../types';

export enum NPCType {
    QuestGiver,
    Vendor,
    Crafter,
}

export class NPC extends Character {
    npcType: NPCType;
    name: string;
    interactionRadius: number = 50;

    constructor(position: Vector2D, name: string, type: NPCType) {
        super(position, 18, 9999, '#fbbf24', 0);
        this.name = name;
        this.npcType = type;
    }

    update() {
        // NPCs are static for now
    }

    draw(ctx: CanvasRenderingContext2D) {
        super.draw(ctx, false);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(this.name, this.position.x, this.position.y - this.radius - 15);
        ctx.font = '10px sans-serif';
        ctx.fillText(`(${NPCType[this.npcType]})`, this.position.x, this.position.y - this.radius - 5);
    }
}
