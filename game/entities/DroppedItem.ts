
import { Vector2D, Item, ItemRarity } from "../types";
import { normalizeVector, getDistance } from "../utils";
import { Player } from "./Player";

export class DroppedItem {
    position: Vector2D;
    item: Item;
    creationTime: number;

    constructor(position: Vector2D, item: Item) {
        this.position = {
            x: position.x + (Math.random() - 0.5) * 20,
            y: position.y + (Math.random() - 0.5) * 20,
        };
        this.item = item;
        this.creationTime = Date.now();
    }

    update(player: Player) {
        const distanceToPlayer = getDistance(this.position, player.position);
        if (distanceToPlayer < 75) { // Magnet range
            const direction = normalizeVector({
                x: player.position.x - this.position.x,
                y: player.position.y - this.position.y,
            });
            
            const speed = Math.max(2, 10 - distanceToPlayer * 0.1);
            this.position.x += direction.x * speed;
            this.position.y += direction.y * speed;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        // Simple square for now, could be an icon later
        ctx.beginPath();
        ctx.rect(this.position.x - 8, this.position.y - 8, 16, 16);
        ctx.fillStyle = this.getRarityColor();
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    getRarityColor(): string {
        switch (this.item.rarity) {
            case ItemRarity.Uncommon: return '#16a34a'; // green-600
            case ItemRarity.Rare: return '#2563eb'; // blue-600
            case ItemRarity.Epic: return '#7e22ce'; // purple-700
            case ItemRarity.Legendary: return '#f97316'; // orange-500
            case ItemRarity.Common:
            default:
                return '#9ca3af'; // gray-400
        }
    }
}
