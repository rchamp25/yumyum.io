
import { Vector2D } from "../types";
import { normalizeVector, getDistance } from "../utils";

export class GoldCoin {
    position: Vector2D;
    initialPosition: Vector2D;
    velocity: Vector2D;
    creationTime: number;

    constructor(position: Vector2D) {
        this.position = {
            x: position.x + (Math.random() - 0.5) * 30,
            y: position.y + (Math.random() - 0.5) * 30,
        };
        this.initialPosition = { ...this.position };
        this.velocity = {x: 0, y: 0};
        this.creationTime = Date.now();
    }

    update(playerPosition: Vector2D) {
        const distanceToPlayer = getDistance(this.position, playerPosition);
        if (distanceToPlayer < 75) { // Magnet range
            const direction = normalizeVector({
                x: playerPosition.x - this.position.x,
                y: playerPosition.y - this.position.y,
            });
            this.velocity.x += direction.x * 0.5;
            this.velocity.y += direction.y * 0.5;
        } else {
            // friction
            this.velocity.x *= 0.9;
            this.velocity.y *= 0.9;
        }

        // speed limit
        const speed = Math.sqrt(this.velocity.x**2 + this.velocity.y**2);
        if (speed > 10) {
            this.velocity = normalizeVector(this.velocity);
            this.velocity.x *= 10;
            this.velocity.y *= 10;
        }

        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#facc15'; // yellow-400
        ctx.fill();
        ctx.strokeStyle = '#ca8a04'; // yellow-600
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}
