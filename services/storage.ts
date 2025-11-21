
import { CharacterClass, CharacterData, ItemSlot, Item } from '../game/types';
import { GAME_CONFIG } from '../game/constants';
import { supabase } from './supabaseClient';

class StorageService {

  // Helper to convert DB Snake_Case to App CamelCase
  private mapFromDB(row: any): CharacterData {
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
        position: row.position,
        discoveredWaypoints: row.discovered_waypoints,
        hasClaimedDevRewards: row.has_claimed_dev_rewards
    };
  }

  // Helper to convert App CamelCase to DB Snake_Case
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
        stats: data.stats,
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
      // Use upsert to update if exists, insert if not
      const { error } = await supabase
        .from('characters')
        .upsert(dbPayload);

      if (error) console.error("Supabase Save Error:", error);
    } catch (error) {
      console.error("Failed to save character", error);
    }
  }

  async createCharacter(userId: string, name: string, characterClass: CharacterClass): Promise<CharacterData | null> {
    const characters = await this.getCharacters(userId);
    if (characters.length >= 3) {
      alert("You can only have a maximum of 3 characters.");
      return null;
    }

    // We don't generate ID here anymore, we let Supabase generate the UUID
    
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

  // --- BANK METHODS ---
  async getBank(userId: string): Promise<Item[]> {
      try {
          // Ensure we select using the correct filter
          const { data, error } = await supabase
              .from('banks')
              .select('items')
              .eq('user_id', userId)
              .maybeSingle();
          
          if (error) {
              console.error("Supabase Bank Fetch Error:", error);
              return [];
          }
          
          // If no bank exists, return empty array (will be created on save)
          if (!data) return [];
          
          return data.items || [];
      } catch (error) {
          console.error("Failed to fetch bank", error);
          return [];
      }
  }

  async saveBank(userId: string, items: (Item | null)[]): Promise<void> {
      try {
          // Upsert requires a unique constraint on user_id in the database
          const { error } = await supabase
              .from('banks')
              .upsert(
                  { user_id: userId, items: items }, 
                  { onConflict: 'user_id' }
              );
          
          if (error) console.error("Supabase Bank Save Error:", error);
      } catch (error) {
          console.error("Failed to save bank", error);
      }
  }
}

export const storageService = new StorageService();
