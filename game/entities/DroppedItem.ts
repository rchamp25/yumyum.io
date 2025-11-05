
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
        const color = this.getRarityColor();

        ctx.save();

        // Glowing effect for higher rarities
        if (this.item.rarity !== ItemRarity.Common) {
            const glowIntensity = {
                [ItemRarity.Uncommon]: 8,
                [ItemRarity.Rare]: 15,
                [ItemRarity.Epic]: 22,
                [ItemRarity.Legendary]: 30,
            }[this.item.rarity] || 0;
            
            let pulse = 1;
            if (this.item.rarity === ItemRarity.Epic) {
                pulse = 0.8 + Math.sin(Date.now() / 200) * 0.2;
            }
            if (this.item.rarity === ItemRarity.Legendary) {
                pulse = 0.7 + Math.sin(Date.now() / 150) * 0.3;
            }

            ctx.shadowColor = color;
            ctx.shadowBlur = glowIntensity * pulse;
        }

        // --- Define Shape Path ---
        ctx.beginPath();
        if (this.item.rarity === ItemRarity.Common) {
            ctx.arc(this.position.x, this.position.y, 8, 0, Math.PI * 2);
        } else {
            ctx.moveTo(this.position.x - 8, this.position.y + 8);
            ctx.quadraticCurveTo(this.position.x, this.position.y + 12, this.position.x + 8, this.position.y + 8);
            ctx.lineTo(this.position.x + 6, this.position.y - 6);
            ctx.quadraticCurveTo(this.position.x, this.position.y - 10, this.position.x - 6, this.position.y - 6);
            ctx.closePath();
        }

        // --- Fill Shape ---
        if (this.item.rarity === ItemRarity.Common) {
            const gradient = ctx.createRadialGradient(
                this.position.x - 2, this.position.y - 2, 1, 
                this.position.x, this.position.y, 8
            );
            gradient.addColorStop(0, '#e5e7eb'); // gray-200
            gradient.addColorStop(1, '#6b7280'); // gray-500
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = color;
        }
        ctx.fill();
        
        ctx.restore(); // Restore to remove shadow for border

        // --- Stroke Shape ---
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(0,0,0,0.5)"; // Dark border for contrast
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
