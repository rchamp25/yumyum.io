
import { CharacterClass, CharacterData, ItemSlot } from '../game/types';
import { GAME_CONFIG } from '../game/constants';

const CHARACTERS_STORAGE_KEY_PREFIX = 'rpg_characters_';

class StorageService {

  private getStorageKey(userId: string): string {
    return `${CHARACTERS_STORAGE_KEY_PREFIX}${userId}`;
  }

  getCharacters(userId: string): CharacterData[] {
    try {
      const storedData = localStorage.getItem(this.getStorageKey(userId));
      if (storedData) {
        return JSON.parse(storedData);
      }
    } catch (error) {
      console.error("Failed to parse characters from localStorage", error);
    }
    return [];
  }

  saveCharacters(userId: string, characters: CharacterData[]): void {
    try {
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(characters));
    } catch (error) {
      console.error("Failed to save characters to localStorage", error);
    }
  }

  createCharacter(userId: string, name: string, characterClass: CharacterClass): CharacterData | null {
    const characters = this.getCharacters(userId);
    if (characters.length >= 3) {
      alert("You can only have a maximum of 3 characters.");
      return null;
    }

    const newCharacter: CharacterData = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      characterClass,
      level: 1,
      xp: 0,
      gold: 0,
      kills: 0,
      stats: {
        maxHealth: GAME_CONFIG.PLAYER_HEALTH,
        health: GAME_CONFIG.PLAYER_HEALTH,
        damage: GAME_CONFIG.PLAYER_DAMAGE,
        speed: GAME_CONFIG.PLAYER_SPEED,
        healthRegen: GAME_CONFIG.PLAYER_HEALTH_REGEN,
        itemFind: GAME_CONFIG.PLAYER_ITEM_FIND,
      },
      inventory: Array(GAME_CONFIG.DEFAULT_INVENTORY_SIZE).fill(null),
      equipment: {
          [ItemSlot.Weapon]: null,
          [ItemSlot.Armor]: null,
          [ItemSlot.Boots]: null,
          [ItemSlot.Accessory]: null,
          [ItemSlot.Bag]: null,
      },
      discoveredWaypoints: ['wp_spawn'],
    };

    characters.push(newCharacter);
    this.saveCharacters(userId, characters);
    return newCharacter;
  }

  saveCharacter(userId: string, characterData: CharacterData): void {
    const characters = this.getCharacters(userId);
    const charIndex = characters.findIndex(c => c.id === characterData.id);
    if (charIndex !== -1) {
      characters[charIndex] = characterData;
      this.saveCharacters(userId, characters);
    } else {
        console.warn("Could not find character to save:", characterData.id);
    }
  }

  deleteCharacter(userId: string, characterId: string): void {
    let characters = this.getCharacters(userId);
    characters = characters.filter(c => c.id !== characterId);
    this.saveCharacters(userId, characters);
  }
}

export const storageService = new StorageService();
