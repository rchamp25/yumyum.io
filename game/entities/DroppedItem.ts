
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
        const time = Date.now();

        // Floating animation (bobbing)
        const bobOffset = Math.sin(time / 500) * 3;
        const drawX = this.position.x;
        const drawY = this.position.y + bobOffset;

        ctx.save();

        // Glowing effect for higher rarities
        if (this.item.rarity !== ItemRarity.Common) {
            const glowIntensity = {
                [ItemRarity.Uncommon]: 10,
                [ItemRarity.Rare]: 20,
                [ItemRarity.Epic]: 30,
                [ItemRarity.Legendary]: 40,
            }[this.item.rarity] || 0;
            
            let pulse = 1;
            if (this.item.rarity >= ItemRarity.Rare) {
                pulse = 0.8 + Math.sin(time / 300) * 0.4;
            }

            ctx.shadowColor = color;
            ctx.shadowBlur = glowIntensity * pulse;
        }

        // --- Define Shape Path ---
        ctx.beginPath();
        if (this.item.rarity === ItemRarity.Common) {
            ctx.arc(drawX, drawY, 8, 0, Math.PI * 2);
        } else {
            // Diamond shape for rarity items
            ctx.moveTo(drawX - 8, drawY + 8);
            ctx.quadraticCurveTo(drawX, drawY + 12, drawX + 8, drawY + 8);
            ctx.lineTo(drawX + 6, drawY - 6);
            ctx.quadraticCurveTo(drawX, drawY - 10, drawX - 6, drawY - 6);
            ctx.closePath();
        }

        // --- Fill Shape ---
        if (this.item.rarity === ItemRarity.Common) {
            const gradient = ctx.createRadialGradient(
                drawX - 2, drawY - 2, 1, 
                drawX, drawY, 8
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

        // --- Sparkle Effect for Rare+ ---
        if (this.item.rarity >= ItemRarity.Rare) {
            const numSparkles = this.item.rarity === ItemRarity.Legendary ? 3 : (this.item.rarity === ItemRarity.Epic ? 2 : 1);
            
            for(let i=0; i<numSparkles; i++) {
                 // Generate pseudo-random but consistent motion based on time and index
                 const offset = i * (Math.PI * 2 / numSparkles);
                 const t = time * 0.003 + offset + (this.position.x * 0.01); 
                 
                 // Orbit
                 const orbitRadius = 16 + Math.sin(t * 2) * 4;
                 const sx = drawX + Math.cos(t) * orbitRadius;
                 const sy = drawY + Math.sin(t) * orbitRadius;
                 
                 // Scale pulse (Twinkle)
                 const scale = Math.abs(Math.sin(t * 3)) * 0.7;
                 
                 if (scale > 0.1) {
                     ctx.save();
                     ctx.translate(sx, sy);
                     ctx.rotate(t * 4); // Rotate sparkle
                     ctx.scale(scale, scale);
                     
                     ctx.fillStyle = 'white';
                     ctx.shadowColor = 'white';
                     ctx.shadowBlur = 6;
                     
                     // Draw star shape
                     ctx.beginPath();
                     ctx.moveTo(0, -5);
                     ctx.quadraticCurveTo(1, -1, 5, 0);
                     ctx.quadraticCurveTo(1, 1, 0, 5);
                     ctx.quadraticCurveTo(-1, 1, -5, 0);
                     ctx.quadraticCurveTo(-1, -1, 0, -5);
                     ctx.fill();
                     
                     ctx.restore();
                 }
            }
        }
    }
    
    getRarityColor(): string {
        switch (this.item.rarity) {
            case ItemRarity.Uncommon: return '#22c55e'; // green-500
            case ItemRarity.Rare: return '#3b82f6'; // blue-500
            case ItemRarity.Epic: return '#a855f7'; // purple-500
            case ItemRarity.Legendary: return '#f97316'; // orange-500
            case ItemRarity.Common:
            default:
                return '#9ca3af'; // gray-400
        }
    }
}
