
import { CharacterClass, CharacterData, ItemSlot } from '../game/types';
import { GAME_CONFIG, WORLD_IDS } from '../game/constants';
import { supabase } from './supabaseClient';

class StorageService {

  // Helper to convert DB Snake_Case to App CamelCase
  private mapFromDB(row: any): CharacterData {
    // Fallback: Check 'stats' JSON for bank data if top-level columns are missing/empty
    const bankItems = (row.stats && row.stats.bank) ? row.stats.bank : (row.bank || []);
    const bankGoldVal = (row.stats && row.stats.bankGold) !== undefined ? row.stats.bankGold : (row.bank_gold || 0);
    const worldId = (row.stats && row.stats.currentWorldId) ? row.stats.currentWorldId : WORLD_IDS.WORLD_1;

    return {
        id: row.id,
        name: row.name,
        characterClass: row.char_class,
        level: row.level,
        xp: row.xp,
        gold: row.gold,
        kills: row.kills,
        stats: row.stats,
        inventory: row.inventory,
        equipment: row.equipment,
        bank: bankItems, 
        bankGold: bankGoldVal,
        position: row.position,
        discoveredWaypoints: row.discovered_waypoints,
        hasClaimedDevRewards: row.has_claimed_dev_rewards,
        currentWorldId: worldId
    };
  }

  // Helper to convert App CamelCase to DB Snake_Case
  private mapToDB(userId: string, data: CharacterData) {
      const statsWithBank = {
          ...data.stats,
          bank: data.bank,
          bankGold: data.bankGold,
          currentWorldId: data.currentWorldId
      };

      return {
        id: data.id,
        user_id: userId,
        name: data.name,
        char_class: data.characterClass,
        level: data.level,
        xp: data.xp,
        gold: data.gold,
        kills: data.kills,
        stats: statsWithBank, 
        inventory: data.inventory,
        equipment: data.equipment,
        position: data.position,
        discovered_waypoints: data.discoveredWaypoints,
        has_claimed_dev_rewards: data.hasClaimedDevRewards
      };
  }

  async getCharacters(userId: string): Promise<CharacterData[]> {
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', userId);

      if (error) {
          console.error("Supabase Fetch Error:", error);
          return [];
      }
      return data.map(this.mapFromDB);
    } catch (error) {
      console.error("Failed to fetch characters", error);
      return [];
    }
  }

  async saveCharacter(userId: string, characterData: CharacterData): Promise<void> {
    try {
      const dbPayload = this.mapToDB(userId, characterData);
      const { error } = await supabase
        .from('characters')
        .upsert(dbPayload);

      if (error) console.error("Supabase Save Error:", error);
    } catch (error) {
      console.error("Failed to save character", error);
    }
  }

  async checkCharacterNameExists(name: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('id')
        .ilike('name', name)
        .limit(1);

      if (error) {
        console.error("Error checking name uniqueness:", error);
        return false; // Don't block creation on API error, but ideally should handle better
      }
      return data && data.length > 0;
    } catch (err) {
      console.error("Failed to check name", err);
      return false;
    }
  }

  async createCharacter(userId: string, name: string, characterClass: CharacterClass): Promise<CharacterData | null> {
    const characters = await this.getCharacters(userId);
    if (characters.length >= 3) {
      alert("You can only have a maximum of 3 characters.");
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
        bank: Array(100).fill(null),
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
        console.error("Error creating character:", error);
        return null;
    }

    return this.mapFromDB(data);
  }

  async deleteCharacter(userId: string, characterId: string): Promise<void> {
    await supabase
        .from('characters')
        .delete()
        .eq('id', characterId)
        .eq('user_id', userId);
  }
}

export const storageService = new StorageService();
