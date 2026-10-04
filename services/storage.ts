import { CharacterClass, CharacterData, ItemSlot } from '../game/types';
import { GAME_CONFIG, WORLD_IDS } from '../game/constants';
import { supabase } from './supabaseClient';

export const MAX_CHARACTERS = 3;

// Row shape of the `characters` table. Bank data and the current world live inside the
// `stats` JSON column; older rows may also have top-level `bank` / `bank_gold` columns.
interface CharacterRow {
  id: string;
  user_id: string;
  name: string;
  char_class: CharacterClass;
  level: number;
  xp: number;
  gold: number;
  kills: number;
  stats: CharacterData['stats'] & { bank?: CharacterData['bank']; bankGold?: number; currentWorldId?: string };
  inventory: CharacterData['inventory'];
  equipment: CharacterData['equipment'];
  position: CharacterData['position'] | null;
  discovered_waypoints: string[] | null;
  has_claimed_dev_rewards: boolean | null;
  is_dev: boolean | null;
  bank?: CharacterData['bank'];
  bank_gold?: number;
}

class StorageService {

  private mapFromDB(row: CharacterRow): CharacterData {
    const stats = row.stats || ({} as CharacterRow['stats']);
    return {
        id: row.id,
        name: row.name,
        characterClass: row.char_class,
        level: row.level,
        xp: row.xp,
        gold: row.gold,
        kills: row.kills,
        stats,
        inventory: row.inventory,
        equipment: row.equipment,
        bank: stats.bank ?? row.bank ?? [],
        bankGold: stats.bankGold ?? row.bank_gold ?? 0,
        position: row.position ?? undefined,
        discoveredWaypoints: row.discovered_waypoints ?? undefined,
        hasClaimedDevRewards: row.has_claimed_dev_rewards ?? false,
        isDev: row.is_dev ?? false,
        currentWorldId: stats.currentWorldId || WORLD_IDS.WORLD_1,
    };
  }

  // `is_dev` is deliberately left out: it's only ever set from the Supabase dashboard,
  // and a database trigger ignores attempts to change it from the game.
  private mapToDB(userId: string, data: CharacterData) {
      return {
        id: data.id,
        user_id: userId,
        name: data.name,
        char_class: data.characterClass,
        level: data.level,
        xp: data.xp,
        gold: data.gold,
        kills: data.kills,
        stats: {
            ...data.stats,
            bank: data.bank,
            bankGold: data.bankGold,
            currentWorldId: data.currentWorldId,
        },
        inventory: data.inventory,
        equipment: data.equipment,
        position: data.position,
        discovered_waypoints: data.discoveredWaypoints,
        has_claimed_dev_rewards: data.hasClaimedDevRewards,
      };
  }

  async getCharacters(userId: string): Promise<CharacterData[]> {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', userId);

    if (error) {
        console.error("Failed to load characters:", error);
        return [];
    }
    return (data as CharacterRow[]).map(row => this.mapFromDB(row));
  }

  async saveCharacter(userId: string, characterData: CharacterData): Promise<boolean> {
    const { error } = await supabase
      .from('characters')
      .upsert(this.mapToDB(userId, characterData));

    if (error) {
        console.error("Failed to save character:", error);
        return false;
    }
    return true;
  }

  async checkCharacterNameExists(name: string): Promise<boolean> {
    // ILIKE gives a case-insensitive match, but names may contain characters that act as
    // wildcards (% and _ in Postgres, * in PostgREST). Swap them for the single-character
    // wildcard so the pattern still matches the exact name, then compare exactly here.
    const pattern = name.replace(/[%_*\\]/g, '_');
    const { data, error } = await supabase
      .from('characters')
      .select('name')
      .ilike('name', pattern)
      .limit(50);

    if (error) {
      console.error("Failed to check name availability:", error);
      return false; // Don't block creation on an API error
    }
    const lowerName = name.toLowerCase();
    return (data as { name: string }[]).some(row => row.name.toLowerCase() === lowerName);
  }

  async createCharacter(userId: string, name: string, characterClass: CharacterClass): Promise<CharacterData | null> {
    const characters = await this.getCharacters(userId);
    if (characters.length >= MAX_CHARACTERS) {
      alert(`You can only have a maximum of ${MAX_CHARACTERS} characters.`);
      return null;
    }

    const newCharPayload = {
      user_id: userId,
      name,
      char_class: characterClass,
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
        bossDamageMultiplier: 1,
        bank: Array(GAME_CONFIG.BANK_SIZE).fill(null),
        bankGold: 0,
        currentWorldId: WORLD_IDS.WORLD_1
      },
      inventory: Array(GAME_CONFIG.DEFAULT_INVENTORY_SIZE).fill(null),
      equipment: {
          [ItemSlot.Weapon]: null,
          [ItemSlot.Armor]: null,
          [ItemSlot.Boots]: null,
          [ItemSlot.Accessory]: null,
          [ItemSlot.Bag]: null,
      },
      discovered_waypoints: ['wp_spawn'],
      has_claimed_dev_rewards: false
    };

    const { data, error } = await supabase
        .from('characters')
        .insert(newCharPayload)
        .select()
        .single();

    if (error || !data) {
        console.error("Failed to create character:", error);
        // 23505 = unique_violation, raised when the database enforces unique character names
        alert(error?.code === '23505' ? "That name is already taken." : "Couldn't create your character. Please try again.");
        return null;
    }

    return this.mapFromDB(data as CharacterRow);
  }

  async deleteCharacter(userId: string, characterId: string): Promise<void> {
    const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', characterId)
        .eq('user_id', userId);

    if (error) console.error("Failed to delete character:", error);
  }
}

export const storageService = new StorageService();
