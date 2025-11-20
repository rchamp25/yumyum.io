
import { io, Socket } from "socket.io-client";
import { CharacterData, ServerEnemy, Item, Vector2D } from "../game/types";

interface GameStatePayload {
    players: Record<string, {
        position: Vector2D;
        characterData: CharacterData;
    }>;
    enemies: ServerEnemy[];
}

interface LootDropPayload {
    item: Item;
    position: Vector2D;
}

interface EnemyKillPayload {
    enemyId: string;
    xp: number;
    gold: number;
    enemyLevel: number;
}

let socket: Socket;

export const socketService = {
  connect(callback: (id: string) => void) {
    if (socket && socket.connected) {
      if (socket.id) {
          callback(socket.id);
      }
      return;
    }
    
    const serverUrl = (import.meta as any).env.VITE_SERVER_URL || 'http://localhost:3000';
    socket = io(serverUrl);

    socket.on('connect', () => {
      console.log('Connected to server with id:', socket.id);
      callback(socket.id || '');
    });
  },
  
  get id() {
      return socket?.id;
  },

  joinGame(characterData: CharacterData) {
    if (socket) {
      socket.emit('join_game', characterData);
    }
  },
  
  updateCharacter(characterData: CharacterData) {
      if (socket) {
          socket.emit('update_character', characterData);
      }
  },

  sendInput(keys: string[]) {
    if (socket) {
      socket.emit('player_input', keys);
    }
  },
  
  damageEnemy(enemyId: string, damage: number) {
      if (socket) {
          socket.emit('hit_enemy', { enemyId, damage });
      }
  },

  onGameState(callback: (gameState: GameStatePayload) => void) {
    if (socket) {
      socket.on('game_state', callback);
    }
  },
  
  onLootDropped(callback: (drops: LootDropPayload[]) => void) {
      if (socket) {
          socket.on('loot_dropped', callback);
      }
  },
  
  onEnemyKilled(callback: (data: EnemyKillPayload) => void) {
      if (socket) {
          socket.on('enemy_killed', callback);
      }
  },
  
  offGameState() {
      if(socket) {
          socket.off('game_state');
          socket.off('loot_dropped');
          socket.off('enemy_killed');
      }
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
    }
  }
};
