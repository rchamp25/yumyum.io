import { CharacterClass, CharacterData } from '../game/types';
import { CharacterStore, MAX_CHARACTERS, createStartingCharacter } from './storage';

// Guest heroes live only in this browser's localStorage. Nothing is sent to Supabase.
const GUEST_CHARACTERS_KEY = 'yumyum_guest_characters';
const GUEST_SESSION_KEY = 'yumyum_guest_session';

const readCharacters = (): CharacterData[] => {
  try {
    const stored = localStorage.getItem(GUEST_CHARACTERS_KEY);
    const characters: CharacterData[] = stored ? JSON.parse(stored) : [];
    // Dev characters are an account-only feature
    return characters.map(c => ({ ...c, isDev: false }));
  } catch (error) {
    console.error("Failed to load guest characters:", error);
    return [];
  }
};

/** Returns false when the browser refuses to store data (storage full or disabled). */
const writeCharacters = (characters: CharacterData[]): boolean => {
  try {
    localStorage.setItem(GUEST_CHARACTERS_KEY, JSON.stringify(characters));
    return true;
  } catch (error) {
    console.error("Failed to save guest characters:", error);
    return false;
  }
};

class GuestCharacterStore implements CharacterStore {
  async getCharacters(): Promise<CharacterData[]> {
    return readCharacters();
  }

  async saveCharacter(_userId: string, characterData: CharacterData): Promise<boolean> {
    const characters = readCharacters();
    const index = characters.findIndex(c => c.id === characterData.id);
    if (index === -1) characters.push(characterData);
    else characters[index] = characterData;
    return writeCharacters(characters);
  }

  // Guest names only need to be unique among this browser's guest heroes
  async checkCharacterNameExists(name: string): Promise<boolean> {
    const lowerName = name.toLowerCase();
    return readCharacters().some(c => c.name.toLowerCase() === lowerName);
  }

  async createCharacter(_userId: string, name: string, characterClass: CharacterClass): Promise<CharacterData | null> {
    const characters = readCharacters();
    if (characters.length >= MAX_CHARACTERS) {
      alert(`You can only have a maximum of ${MAX_CHARACTERS} characters.`);
      return null;
    }
    const character = createStartingCharacter(crypto.randomUUID(), name, characterClass);
    if (!writeCharacters([...characters, character])) {
      alert("Couldn't save your hero. Your browser may be blocking site storage.");
      return null;
    }
    return character;
  }

  async deleteCharacter(_userId: string, characterId: string): Promise<void> {
    writeCharacters(readCharacters().filter(c => c.id !== characterId));
  }
}

export const guestStorage = new GuestCharacterStore();

/** Whether this browser was last playing as a guest, so a reload returns to guest mode. */
export const isGuestSessionActive = (): boolean => {
  try {
    return localStorage.getItem(GUEST_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setGuestSessionActive = (active: boolean): void => {
  try {
    if (active) localStorage.setItem(GUEST_SESSION_KEY, 'true');
    else localStorage.removeItem(GUEST_SESSION_KEY);
  } catch {
    // Storage unavailable; guest mode just won't survive a reload
  }
};
