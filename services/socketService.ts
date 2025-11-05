import { io, Socket } from "socket.io-client";
import { CharacterData } from "../game/types";

// The type for the game state object received from the server
type GameStatePayload = Record<string, {
  position: { x: number; y: number };
  characterData: CharacterData;
}>;


let socket: Socket;

export const socketService = {
  connect(callback: (id: string) => void) {
    if (socket && socket.connected) {
      if (socket.id) {
          callback(socket.id);
      }
      return;
    }
    
    // In a development environment, the server might be on a different port.
    // In a production environment, it would connect to the same host.
    // FIX: Replaced Vite-specific `import.meta.env.DEV` with a runtime check to resolve a type error.
    const serverUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
    socket = io(serverUrl);

    socket.on('connect', () => {
      console.log('Connected to server with id:', socket.id);
      callback(socket.id);
    });
  },

  joinGame(characterData: CharacterData) {
    if (socket) {
      socket.emit('join_game', characterData);
    }
  },

  sendInput(keys: string[]) {
    if (socket) {
      socket.emit('player_input', keys);
    }
  },

  onGameState(callback: (gameState: GameStatePayload) => void) {
    if (socket) {
      socket.on('game_state', callback);
    }
  },
  
  offGameState() {
      if(socket) {
          socket.off('game_state');
      }
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
    }
  }
};