
import { io, Socket } from "socket.io-client";
import { CharacterData, ServerEnemy, Item, Vector2D, Party, TradeSession } from "../game/types";

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

interface InvitePayload {
    fromId: string;
    fromName: string;
    type: 'party' | 'trade';
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

  // --- Party ---
  inviteToParty(targetName: string) {
      if(socket) socket.emit('party_invite', targetName);
  },
  acceptPartyInvite(fromId: string) {
      if(socket) socket.emit('party_accept', fromId);
  },
  leaveParty() {
      if(socket) socket.emit('party_leave');
  },

  // --- Trading ---
  requestTrade(targetId: string) {
      if(socket) socket.emit('trade_request', targetId);
  },
  acceptTradeRequest(fromId: string) {
      if(socket) socket.emit('trade_accept', fromId);
  },
  updateTradeOffer(gold: number, items: {item: Item, inventoryIndex: number}[]) {
      if(socket) socket.emit('trade_update', { gold, items });
  },
  lockTrade(isLocked: boolean) {
      if(socket) socket.emit('trade_lock', isLocked);
  },
  cancelTrade() {
      if(socket) socket.emit('trade_cancel');
  },


  // --- Listeners ---
  onGameState(callback: (gameState: GameStatePayload) => void) {
    if (socket) socket.on('game_state', callback);
  },
  
  onLootDropped(callback: (drops: LootDropPayload[]) => void) {
      if (socket) socket.on('loot_dropped', callback);
  },
  
  onEnemyKilled(callback: (data: EnemyKillPayload) => void) {
      if (socket) socket.on('enemy_killed', callback);
  },
  
  onPartyUpdate(callback: (party: Party | null) => void) {
      if(socket) socket.on('party_update', callback);
  },
  
  onInviteReceived(callback: (invite: InvitePayload) => void) {
      if(socket) socket.on('invite_received', callback);
  },
  
  onTradeUpdate(callback: (session: TradeSession | null) => void) {
      if(socket) socket.on('trade_update', callback);
  },
  
  onTradeCompleted(callback: (success: boolean) => void) {
      if(socket) socket.on('trade_completed', callback);
  },

  onCharacterUpdate(callback: (data: CharacterData) => void) {
      if(socket) socket.on('update_character', callback);
  },
  
  offGameState() {
      if(socket) {
          socket.off('game_state');
          socket.off('loot_dropped');
          socket.off('enemy_killed');
          socket.off('party_update');
          socket.off('invite_received');
          socket.off('trade_update');
          socket.off('trade_completed');
          socket.off('update_character');
      }
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
    }
  }
};
