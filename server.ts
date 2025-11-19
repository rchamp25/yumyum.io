
import express, { Request, Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
// FIX: Added .js extension to satisfy Node ES module resolver
import { Vector2D, CharacterData } from './game/types.js';
import { GAME_CONFIG } from './game/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ServerPlayer {
    id: string; // Corresponds to socket.id
    position: Vector2D;
    characterData: CharacterData;
    input: Set<string>;
    speed: number;
    radius: number;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const players = new Map<string, ServerPlayer>();

// Serve static files from the root directory
// FIX: Cast express.static return value to 'any' to bypass faulty type checking.
app.use('/', express.static(__dirname) as any);

// Serve index.html for any other request
// FIX: Cast res to 'any' to access the sendFile method, working around broken type definitions.
app.get('*', (req: Request, res: Response) => {
    (res as any).sendFile(path.resolve(__dirname, 'index.html'));
});

io.on('connection', (socket: Socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('join_game', (characterData: CharacterData) => {
        console.log(`Player ${socket.id} (${characterData.name}) is joining the game.`);
        const startPosition = characterData.position || { 
            x: GAME_CONFIG.WORLD_WIDTH / 2, 
            y: GAME_CONFIG.WORLD_HEIGHT / 2 
        };

        players.set(socket.id, {
            id: socket.id,
            characterData,
            position: startPosition,
            input: new Set<string>(),
            speed: characterData.stats.speed,
            radius: GAME_CONFIG.PLAYER_RADIUS,
        });
    });

    socket.on('player_input', (inputKeys: string[]) => {
        const player = players.get(socket.id);
        if (player) {
            player.input = new Set(inputKeys);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        players.delete(socket.id);
    });
});

// Server-side game loop
setInterval(() => {
    for (const [id, player] of players.entries()) {
        let moveX = 0;
        let moveY = 0;
        if (player.input.has('w')) moveY -= 1;
        if (player.input.has('s')) moveY += 1;
        if (player.input.has('a')) moveX -= 1;
        if (player.input.has('d')) moveX += 1;

        if (moveX !== 0 || moveY !== 0) {
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            player.position.x += (moveX / length) * player.speed;
            player.position.y += (moveY / length) * player.speed;

            // World bounds clamping
            player.position.x = Math.max(player.radius, Math.min(GAME_CONFIG.WORLD_WIDTH - player.radius, player.position.x));
            player.position.y = Math.max(player.radius, Math.min(GAME_CONFIG.WORLD_HEIGHT - player.radius, player.position.y));
        }
    }

    const gameState: { [id: string]: { position: Vector2D, characterData: CharacterData } } = {};
    for (const [id, player] of players.entries()) {
        gameState[id] = {
            position: player.position,
            characterData: player.characterData,
        };
    }

    io.emit('game_state', gameState);
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
