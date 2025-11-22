
import { Character } from './Character';
import { CharacterData, ItemSlot, Item, GameContext, SkillState, DeathLogEvent, Recipe, ItemRarity } from '../types';
import { normalizeVector, getDistance } from '../math';
import { GAME_CONFIG, LEVEL_XP_REQUIREMENTS, WORLD_IDS } from '../constants';
import { SKILLS_DB } from '../skills';
import { FloatingText } from './FloatingText';
import { calculateFinalStats } from '../stats';
import { socketService } from '../../services/socketService';

export class Player extends Character {
    name: string;
    characterClass: CharacterData['characterClass'];
    xp: number;
    gold: number;
    kills: number;
    inventory: (Item | null)[];
    equipment: Record<ItemSlot, Item | null>;
    
    // Bank Storage
    bank: (Item | null)[];
    bankGold: number;

    baseStats: CharacterData['stats'];
    skills: SkillState[];
    discoveredWaypoints: string[];
    hasClaimedDevRewards: boolean;
    currentWorldId: string; 
    
    lastAttackTime: number = 0;
    attackCooldown: number = 500;
    lastDamagedBy: string | null = null;
    totalDamageTaken: number = 0;
    deathLog: DeathLogEvent[] = [];
    
    lastCombatTime: number = 0;
    lastRegenTime: number = 0;
    isInSafeZone: boolean = false;
    
    overflowItems: Item[] = [];
    
    // Difficulty Modifier
    statMultiplier: number = 1;

    constructor(data: CharacterData) {
        // SANITIZATION: Recalculate base stats from level to fix any DB corruption / exploits.
        const cleanBaseStats = {
            maxHealth: GAME_CONFIG.PLAYER_HEALTH + (data.level - 1) * 10,
            health: GAME_CONFIG.PLAYER_HEALTH + (data.level - 1) * 10,
            damage: GAME_CONFIG.PLAYER_DAMAGE + (data.level - 1) * 2,
            speed: GAME_CONFIG.PLAYER_SPEED,
            healthRegen: GAME_CONFIG.PLAYER_HEALTH_REGEN,
            itemFind: GAME_CONFIG.PLAYER_ITEM_FIND,
            bossDamageMultiplier: 1,
        };

        // Use shared calculation with the clean base stats
        const finalStats = calculateFinalStats(cleanBaseStats, data.equipment);
        
        super(data.position || { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 }, GAME_CONFIG.PLAYER_RADIUS, finalStats.maxHealth, '#4299e1', finalStats.damage, data.level);

        this.id = data.id;
        this.name = data.name;
        this.characterClass = data.characterClass;
        this.xp = data.xp;
        this.gold = data.gold;
        this.kills = data.kills;
        this.inventory = [...data.inventory];
        this.equipment = { ...data.equipment };
        
        this.bank = data.bank ? [...data.bank] : Array(100).fill(null);
        while(this.bank.length < 100) this.bank.push(null);
        this.bankGold = data.bankGold || 0;
        
        this.baseStats = cleanBaseStats;
        
        // FIX: Robust health initialization.
        // If data.stats.health is a valid number, use it.
        // Otherwise (new character or corrupted data), use full maxHealth.
        const storedHealth = data.stats && data.stats.health;
        if (typeof storedHealth === 'number' && !isNaN(storedHealth)) {
            this.health = Math.min(storedHealth, finalStats.maxHealth);
        } else {
            this.health = finalStats.maxHealth;
        }
        
        this.discoveredWaypoints = data.discoveredWaypoints || ['wp_spawn'];
        this.hasClaimedDevRewards = data.hasClaimedDevRewards || false;
        this.currentWorldId = data.currentWorldId || WORLD_IDS.WORLD_1;

        this.skills = SKILLS_DB[this.characterClass].map(def => ({
            definition: def,
            lastUsed: 0,
        }));

        // Removed setInvulnerable from constructor to prevent immunity exploit on item swap
        this.updateInventoryCapacity();
    }

    applyInsaneModeNerfs() {
        this.statMultiplier = 0.5;
        this.recalculateStats();
        this.health = Math.min(this.health, this.maxHealth);
    }

    getFinalStats(isOnline: boolean = false) {
        const stats = calculateFinalStats(this.baseStats, this.equipment, this.position, isOnline, this.currentWorldId);
        if (this.statMultiplier !== 1) {
            stats.maxHealth *= this.statMultiplier;
            stats.damage *= this.statMultiplier;
            stats.healthRegen *= this.statMultiplier;
        }
        return stats;
    }

    getMaxInventorySize(): number {
        return GAME_CONFIG.DEFAULT_INVENTORY_SIZE + this.getFinalStats().maxInventorySlots;
    }

    updateInventoryCapacity() {
        const maxSlots = this.getMaxInventorySize();
        
        if (maxSlots > this.inventory.length) {
            const slotsToAdd = maxSlots - this.inventory.length;
            for(let i=0; i<slotsToAdd; i++) {
                this.inventory.push(null);
            }
        } 
        else if (maxSlots < this.inventory.length) {
            const removedItems = this.inventory.slice(maxSlots);
            this.inventory = this.inventory.slice(0, maxSlots);
            removedItems.forEach(item => {
                if (item) this.overflowItems.push(item);
            });
        }
    }
    
    flushOverflowItems(): Item[] {
        const items = [...this.overflowItems];
        this.overflowItems = [];
        return items;
    }

    update(pressedKeys: Set<string>, game: GameContext) {
        this.processStatusEffects(game);
        if (this.hasStatus('stun')) {
            this.isMoving = false;
            this.updateAnimation();
            return;
        }

        const stats = this.getFinalStats(game.isOnlineMode);
        
        let currentSpeed = stats.speed;
        if (this.hasStatus('slow')) {
            const factor = this.statusEffects.find(e => e.type === 'slow')?.slowFactor || 0.5;
            currentSpeed *= (1 - factor);
        }
        if (this.hasStatus('haste')) {
            const factor = this.statusEffects.find(e => e.type === 'haste')?.speedMultiplier || 1.5;
            currentSpeed *= factor;
        }

        let currentDamage = stats.damage;
        if (this.hasStatus('empowered')) {
            const factor = this.statusEffects.find(e => e.type === 'empowered')?.damageMultiplier || 1.5;
            currentDamage *= factor;
        }
        this.damage = currentDamage;
        
        let moveX = 0;
        let moveY = 0;
        if (pressedKeys.has('w')) moveY -= 1;
        if (pressedKeys.has('s')) moveY += 1;
        if (pressedKeys.has('a')) moveX -= 1;
        if (pressedKeys.has('d')) moveX += 1;
        
        this.isMoving = (moveX !== 0 || moveY !== 0);
        this.updateAnimation();

        if (this.isMoving) {
            const normalized = normalizeVector({ x: moveX, y: moveY });
            this.position.x += normalized.x * currentSpeed;
            this.position.y += normalized.y * currentSpeed;
        }

        this.position.x = Math.max(this.radius, Math.min(GAME_CONFIG.WORLD_WIDTH - this.radius, this.position.x));
        this.position.y = Math.max(this.radius, Math.min(GAME_CONFIG.WORLD_HEIGHT - this.radius, this.position.y));
        
        // Whirlwind
        const whirlwindEffect = this.statusEffects.find(e => e.type === 'whirlwind_active');
        if (whirlwindEffect) {
            const now = Date.now();
            if (!whirlwindEffect.lastTick) {
                whirlwindEffect.lastTick = whirlwindEffect.startTime;
            }

            if (now - whirlwindEffect.lastTick >= 250) {
                whirlwindEffect.lastTick = now;
                
                if (!this.isInSafeZone) {
                    let hitAny = false;
                    
                    game.enemies.forEach(enemy => {
                        if (getDistance(this.position, enemy.position) < 120 + enemy.radius) {
                            let dmg = this.damage * 0.5;
                            if (enemy.isBoss) {
                                dmg *= stats.bossDamageMultiplier;
                            }
                            const ft = enemy.takeDamage(dmg, { name: this.name, level: this.level });
                            
                            if(ft) {
                                game.addFloatingText(ft);
                                hitAny = true;
                            }
                            if (game.isOnlineMode) {
                                socketService.damageEnemy(enemy.id as string, dmg);
                            }
                        }
                    });
                    
                    if (hitAny) {
                        game.playSound('hit');
                    }
                }
            }
        }

        const now = Date.now();
        if (now - this.lastRegenTime >= 1000) {
            this.lastRegenTime = now;
            const regenStats = this.getFinalStats(game.isOnlineMode); 
            
            // Safe Zone Regeneration Buff (5x + 10)
            let regenAmount = regenStats.healthRegen;
            if (this.isInSafeZone) {
                regenAmount = (regenAmount * 5) + 10;
            }

            if (this.health < regenStats.maxHealth && !this.isDead && regenAmount > 0) {
                this.health = Math.min(regenStats.maxHealth, this.health + regenAmount);
            }
        }
    }
    
    enterCombat() {
        this.lastCombatTime = Date.now();
    }
    
    useSkill(index: number, game: GameContext) {
        if (this.isInSafeZone) {
            game.addFloatingText(new FloatingText("Can't attack in Safe Zone", { x: this.position.x, y: this.position.y - 40 }, '#ef4444', 20));
            return;
        }

        const skill = this.skills[index];
        if (skill && this.level >= skill.definition.unlockLevel && Date.now() - skill.lastUsed > skill.definition.cooldown) {
            skill.definition.use(this, game);
            skill.lastUsed = Date.now();
            this.attackAnimationTimer = 15;
        }
    }

    getXpToNextLevel(): number {
        if (this.level >= GAME_CONFIG.MAX_LEVEL) return Infinity;
        return LEVEL_XP_REQUIREMENTS[this.level] || Infinity;
    }

    gainXP(amount: number, addFloatingText: (ft: FloatingText) => void, enemyLevel: number) {
        if (this.level >= GAME_CONFIG.MAX_LEVEL) return;

        let finalXP = amount;
        const levelDiff = enemyLevel - this.level;
        
        if (levelDiff > 5) {
            const penaltySteps = levelDiff - 5;
            const multiplier = Math.pow(0.5, penaltySteps);
            finalXP = Math.floor(amount * multiplier);
        }

        if (finalXP < 1) finalXP = 1;

        this.xp += finalXP;
        addFloatingText(new FloatingText(`+${finalXP} XP`, {x: this.position.x, y: this.position.y + 20}, '#b197fc'));
        
        while (this.xp >= this.getXpToNextLevel()) {
            this.xp -= this.getXpToNextLevel();
            this.levelUp();
        }
    }
    
    gainGold(amount: number, addFloatingText: (ft: FloatingText) => void) {
        const stats = this.getFinalStats();
        const bonusMultiplier = 1 + (stats.itemFind || 0);
        const finalGold = Math.floor(amount * bonusMultiplier);
        
        this.gold += finalGold;
        addFloatingText(new FloatingText(`+${finalGold} G`, {x: this.position.x + 20, y: this.position.y - 20}, '#facc15'));
    }

    levelUp() {
        this.level++;
        this.baseStats.maxHealth += 10;
        this.baseStats.damage += 2;
        this.recalculateStats();
    }
    
    pickupItem(item: Item): boolean {
        if (item.type === 'Material') {
            const existingStack = this.inventory.find(i => i && i.id === item.id);
            if (existingStack && existingStack.quantity) {
                existingStack.quantity += (item.quantity || 1);
                return true;
            }
        }
        
        const emptySlotIndex = this.inventory.findIndex(slot => slot === null);
        if (emptySlotIndex !== -1) {
            this.inventory[emptySlotIndex] = item;
            return true;
        }
        return false;
    }
    
    buyItem(item: Item, cost: number): boolean {
        if (this.gold >= cost) {
            const qty = item.quantity || 1;
            if (this.pickupItem({ ...item, quantity: qty })) {
                this.gold -= cost;
                return true;
            }
        }
        return false;
    }

    toggleItemLock(inventoryIndex: number) {
        const item = this.inventory[inventoryIndex];
        if (item) {
            item.locked = !item.locked;
        }
    }

    equipItem(inventoryIndex: number) {
        const item = this.inventory[inventoryIndex];
        if (!item || item.type !== 'Equipment' || !item.slot) return;
        
        const currentItem = this.equipment[item.slot];
        this.equipment[item.slot] = item;
        this.inventory[inventoryIndex] = currentItem;
        this.recalculateStats();
        this.updateInventoryCapacity();
    }

    unequipItem(slot: ItemSlot) {
        const item = this.equipment[slot];
        if (!item) return;

        const emptySlotIndex = this.inventory.findIndex(s => s === null);
        if (emptySlotIndex === -1) return;

        this.inventory[emptySlotIndex] = item;
        this.equipment[slot] = null;
        this.recalculateStats();
        this.updateInventoryCapacity();
    }

    moveItem(fromIndex: number, toIndex: number) {
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || fromIndex >= this.inventory.length) return;
        if (toIndex < 0 || toIndex >= this.inventory.length) return;

        const itemA = this.inventory[fromIndex];
        const itemB = this.inventory[toIndex];
        
        if (itemA && itemB && itemA.id === itemB.id && itemA.type === 'Material') {
            if (itemB.quantity && itemA.quantity) {
                itemB.quantity += itemA.quantity;
                this.inventory[fromIndex] = null;
                return;
            }
        }

        this.inventory[toIndex] = itemA;
        this.inventory[fromIndex] = itemB;
    }
    
    craftItem(recipe: Recipe): boolean {
        if (!this.inventory.some(slot => !slot)) return false;
        for (const ing of recipe.ingredients) {
            const mat = this.inventory.find(i => i?.id === ing.materialId);
            if (!mat || !mat.quantity || mat.quantity < ing.quantity) return false;
        }
        recipe.ingredients.forEach(ing => {
            const mat = this.inventory.find(i => i?.id === ing.materialId)!;
            mat.quantity! -= ing.quantity;
            if (mat.quantity! <= 0) {
                this.inventory[this.inventory.indexOf(mat)] = null;
            }
        });
        this.pickupItem({...recipe.result});
        return true;
    }
    
    sellItem(inventoryIndex: number, sellFullStack: boolean): boolean {
        const item = this.inventory[inventoryIndex];
        if (!item) return false;
        if (item.locked) return false;

        if (item.type === 'Material' && item.quantity && item.quantity > 1 && !sellFullStack) {
            this.gold += item.sellPrice;
            item.quantity--;
        } else {
            this.gold += item.sellPrice * (item.quantity || 1);
            this.inventory[inventoryIndex] = null;
        }
        return true;
    }

    sellUnlockedItemsByRarity(rarity: ItemRarity): number {
        let goldGained = 0;
        for (let i = 0; i < this.inventory.length; i++) {
            const item = this.inventory[i];
            if (item && item.type === 'Equipment' && item.rarity === rarity && !item.locked) {
                const value = item.sellPrice * (item.quantity || 1);
                goldGained += value;
                this.inventory[i] = null;
            }
        }
        this.gold += goldGained;
        return goldGained;
    }

    discoverWaypoint(waypointId: string): boolean {
        if (!this.discoveredWaypoints.includes(waypointId)) {
            this.discoveredWaypoints.push(waypointId);
            return true;
        }
        return false;
    }
    
    recalculateStats() {
        const finalStats = this.getFinalStats();
        const oldMax = this.maxHealth;
        const oldHealth = this.health; // Capture current health
        
        this.maxHealth = finalStats.maxHealth;
        this.damage = finalStats.damage;
        
        // FIX: Infinite Healing & Exploit Prevention
        // 1. If player was fully healed (>= oldMax), update to new max (maintains full health).
        // 2. If player was damaged, keep exact current health (clamped to new max).
        // This prevents swapping items to gain free HP when injured.
        if (oldHealth >= oldMax) {
            this.health = this.maxHealth;
        } else {
            this.health = Math.min(oldHealth, this.maxHealth);
        }
    }

    takeDamage(amount: number, source?: { name: string, level?: number }): FloatingText | null {
        const result = super.takeDamage(amount, source);
        if (result && source) {
            this.lastDamagedBy = source.name;
            const damageTaken = Number(result.text);
            this.totalDamageTaken += damageTaken;
            this.deathLog.push({ message: `Took ${damageTaken} damage from ${source.name}.` });
            if (this.deathLog.length > 5) this.deathLog.shift();
        }
        return result;
    }
    
    respawn() {
        this.gold = Math.floor(this.gold * 0.7); // Lose 30% gold
        this.position = { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 };
        this.isDead = false;
        this.recalculateStats();
        this.health = this.maxHealth;
        this.totalDamageTaken = 0;
        this.deathLog = [];
        // Immunity on respawn only (Explicitly called here)
        this.setInvulnerable(3000);
    }

    draw(ctx: CanvasRenderingContext2D) {
        super.draw(ctx);
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px sans-serif';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.fillText(this.name, 0, this.radius + 22);
        ctx.restore();
    }

    toCharacterData(): CharacterData {
        const syncedStats = { ...this.baseStats, health: this.health };
        return {
            id: this.id as string,
            name: this.name,
            characterClass: this.characterClass,
            level: this.level,
            xp: this.xp,
            gold: this.gold,
            kills: this.kills,
            stats: syncedStats, 
            inventory: this.inventory,
            equipment: this.equipment,
            bank: this.bank,
            bankGold: this.bankGold,
            position: this.position,
            discoveredWaypoints: this.discoveredWaypoints,
            hasClaimedDevRewards: this.hasClaimedDevRewards,
            currentWorldId: this.currentWorldId
        };
    }
}
