
import { Item, ItemRarity, ItemSlot } from "./types";

export const ITEMS_DB: Record<string, Item> = {
    // Common
    'rusty_sword': {
        id: 'rusty_sword', name: 'Rusty Sword', description: 'A bit of sharpened metal.', rarity: ItemRarity.Common, slot: ItemSlot.Weapon,
        icon: 'sword', bonuses: { damage: 2 }, levelRequirement: 1
    },
    'leather_vest': {
        id: 'leather_vest', name: 'Leather Vest', description: 'Better than nothing.', rarity: ItemRarity.Common, slot: ItemSlot.Armor,
        icon: 'vest', bonuses: { maxHealth: 10 }, levelRequirement: 1
    },
    'worn_boots': {
        id: 'worn_boots', name: 'Worn Boots', description: 'These have seen better days.', rarity: ItemRarity.Common, slot: ItemSlot.Boots,
        icon: 'boots', bonuses: { speed: 0.2 }, levelRequirement: 1
    },

    // Uncommon
    'iron_sword': {
        id: 'iron_sword', name: 'Iron Sword', description: 'A sturdy and reliable blade.', rarity: ItemRarity.Uncommon, slot: ItemSlot.Weapon,
        icon: 'sword', bonuses: { damage: 5 }, levelRequirement: 5
    },
    'chainmail_armor': {
        id: 'chainmail_armor', name: 'Chainmail Armor', description: 'Offers decent protection.', rarity: ItemRarity.Uncommon, slot: ItemSlot.Armor,
        icon: 'vest', bonuses: { maxHealth: 25, armor: 5 }, levelRequirement: 5
    },
    'sturdy_boots': {
        id: 'sturdy_boots', name: 'Sturdy Boots', description: 'For long journeys.', rarity: ItemRarity.Uncommon, slot: ItemSlot.Boots,
        icon: 'boots', bonuses: { speed: 0.4, maxHealth: 10 }, levelRequirement: 5
    },
     'glowing_amulet': {
        id: 'glowing_amulet', name: 'Glowing Amulet', description: 'It hums with a faint energy.', rarity: ItemRarity.Uncommon, slot: ItemSlot.Accessory,
        icon: 'amulet', bonuses: { critChance: 0.05 }, levelRequirement: 8
    },

    // Rare
    'flaming_longsword': {
        id: 'flaming_longsword', name: 'Flaming Longsword', description: 'It burns with an eternal flame.', rarity: ItemRarity.Rare, slot: ItemSlot.Weapon,
        icon: 'sword', bonuses: { damage: 12, critChance: 0.05 }, levelRequirement: 10
    },
};

export function getRandomItem(playerLevel: number): Item | null {
    const possibleItems = Object.values(ITEMS_DB).filter(item => item.levelRequirement <= playerLevel);
    if (possibleItems.length === 0) return null;

    // A simple weighted random based on rarity
    const weights = possibleItems.map(item => {
        switch (item.rarity) {
            case ItemRarity.Legendary: return 1;
            case ItemRarity.Epic: return 5;
            case ItemRarity.Rare: return 20;
            case ItemRarity.Uncommon: return 50;
            case ItemRarity.Common:
            default: return 100;
        }
    });
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < possibleItems.length; i++) {
        if (random < weights[i]) {
            return possibleItems[i];
        }
        random -= weights[i];
    }
    
    return possibleItems[possibleItems.length - 1];
}
