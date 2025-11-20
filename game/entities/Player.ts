
import { Character } from './Character';
import { CharacterData, Vector2D, ItemSlot, Item, GameContext, SkillState, DeathLogEvent, Recipe } from '../types';
import { normalizeVector, getDistance, findNearestEnemy } from '../utils';
import { GAME_CONFIG, LEVEL_XP_REQUIREMENTS, BOSS_ZONES, BOSS_CONFIG } from '../constants';
import { Projectile } from './Projectile';
import { SKILLS_DB } from '../skills';
import { ITEMS_DB, MATERIALS_DB } from '../items';
import { FloatingText } from './FloatingText';

export class Player extends Character {
    name: string;
    characterClass: CharacterData['characterClass'];
    xp: number;
    gold: number;
    kills: number;
    inventory: (Item | null)[];
    equipment: Record<ItemSlot, Item | null>;
    baseStats: CharacterData['stats'];
    skills: SkillState[];
    discoveredWaypoints: string[];
    
    lastAttackTime: number = 0;
    attackCooldown: number = 500; // ms
    lastDamagedBy: string | null = null;
    totalDamageTaken: number = 0;
    deathLog: DeathLogEvent[] = [];
    
    lastCombatTime: number = 0;
    lastRegenTime: number = 0;
    isInSafeZone: boolean = false;
    
    // Temporary storage for items that fall out of inventory when bag is removed
    overflowItems: Item[] = [];

    constructor(data: CharacterData) {
        // Handle backward compatibility for old character saves
        if (data.stats.healthRegen === undefined) data.stats.healthRegen = GAME_CONFIG.PLAYER_HEALTH_REGEN;
        if (data.stats.itemFind === undefined) data.stats.itemFind = GAME_CONFIG.PLAYER_ITEM_FIND;
        if (data.stats.bossDamageMultiplier === undefined) data.stats.bossDamageMultiplier = 1;

        const finalStats = Player.calculateFinalStats(data.stats, data.equipment);
        super(data.position || { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 }, GAME_CONFIG.PLAYER_RADIUS, finalStats.maxHealth, '#4299e1', finalStats.damage, data.level);

        this.id = data.id;
        this.name = data.name;
        this.characterClass = data.characterClass;
        this.xp = data.xp;
        this.gold = data.gold;
        this.kills = data.kills;
        this.inventory = [...data.inventory];
        this.equipment = { ...data.equipment };
        this.baseStats = { ...data.stats };
        this.health = Math.min(data.stats.health, finalStats.maxHealth);
        this.discoveredWaypoints = data.discoveredWaypoints || ['wp_spawn'];

        this.skills = SKILLS_DB[this.characterClass].map(def => ({
            definition: def,
            lastUsed: 0,
        }));

        // Invulnerability on login/spawn
        this.setInvulnerable(3000);
        
        // Ensure inventory matches current capacity on load
        this.updateInventoryCapacity();
    }

    private static calculateFinalStats(baseStats: CharacterData['stats'], equipment: Record<ItemSlot, Item | null>): CharacterData['stats'] & { maxInventorySlots: number } {
        const final = { ...baseStats, maxInventorySlots: 0 };
        if (final.healthRegen === undefined) final.healthRegen = GAME_CONFIG.PLAYER_HEALTH_REGEN;
        if (final.itemFind === undefined) final.itemFind = GAME_CONFIG.PLAYER_ITEM_FIND;
        if (final.bossDamageMultiplier === undefined) final.bossDamageMultiplier = 1;

        Object.values(equipment).forEach(item => {
            if (item && item.stats) {
                final.maxHealth += item.stats.maxHealth || 0;
                final.damage += item.stats.damage || 0;
                final.speed += item.stats.speed || 0;
                final.healthRegen += item.stats.healthRegen || 0;
                final.maxInventorySlots += item.stats.maxInventorySlots || 0;
                final.itemFind += item.stats.itemFind || 0;
                final.bossDamageMultiplier += item.stats.bossDamageMultiplier || 0;
            }
        });
        return final;
    }

    getFinalStats() {
        const stats = Player.calculateFinalStats(this.baseStats, this.equipment);
        
        // Check if in Boss Zone
        let inBossZone = false;
        for (const zone of BOSS_ZONES) {
             if (getDistance(this.position, {x: zone.x, y: zone.y}) < BOSS_CONFIG.ZONE_RADIUS) {
                 inBossZone = true;
                 break;
             }
        }

        // Apply Boss Zone Item Find Multiplier (500% increase -> 6x multiplier)
        if (inBossZone) {
            stats.itemFind = (stats.itemFind || 0) * BOSS_CONFIG.BOSS_ITEM_FIND_MULTIPLIER;
        }

        return stats;
    }

    getMaxInventorySize(): number {
        return GAME_CONFIG.DEFAULT_INVENTORY_SIZE + this.getFinalStats().maxInventorySlots;
    }

    updateInventoryCapacity() {
        const maxSlots = this.getMaxInventorySize();
        
        // If expanding
        if (maxSlots > this.inventory.length) {
            const slotsToAdd = maxSlots - this.inventory.length;
            for(let i=0; i<slotsToAdd; i++) {
                this.inventory.push(null);
            }
        } 
        // If shrinking
        else if (maxSlots < this.inventory.length) {
            const removedItems = this.inventory.slice(maxSlots);
            this.inventory = this.inventory.slice(0, maxSlots);
            
            // Collect non-null items that were cut off
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

        const stats = this.getFinalStats();
        
        // Apply Haste Buff / Slow Debuff
        let currentSpeed = stats.speed;
        if (this.hasStatus('slow')) {
            const factor = this.statusEffects.find(e => e.type === 'slow')?.slowFactor || 0.5;
            currentSpeed *= (1 - factor);
        }
        if (this.hasStatus('haste')) {
            const factor = this.statusEffects.find(e => e.type === 'haste')?.speedMultiplier || 1.5;
            currentSpeed *= factor;
        }

        // Apply Empowered Buff (Update damage property for skills to use)
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
        
        // Update moving status for animation
        this.isMoving = (moveX !== 0 || moveY !== 0);
        this.updateAnimation();

        if (this.isMoving) {
            const normalized = normalizeVector({ x: moveX, y: moveY });
            this.position.x += normalized.x * currentSpeed;
            this.position.y += normalized.y * currentSpeed;
        }

        // World bounds
        this.position.x = Math.max(this.radius, Math.min(GAME_CONFIG.WORLD_WIDTH - this.radius, this.position.x));
        this.position.y = Math.max(this.radius, Math.min(GAME_CONFIG.WORLD_HEIGHT - this.radius, this.position.y));
        
        // Whirlwind Logic
        const whirlwindEffect = this.statusEffects.find(e => e.type === 'whirlwind_active');
        if (whirlwindEffect) {
            const now = Date.now();
            // Initialize lastTick if undefined
            if (!whirlwindEffect.lastTick) {
                whirlwindEffect.lastTick = whirlwindEffect.startTime;
            }

            // Tick 4 times per second = every 250ms
            if (now - whirlwindEffect.lastTick >= 250) {
                whirlwindEffect.lastTick = now;
                
                game.enemies.forEach(enemy => {
                    if (getDistance(this.position, enemy.position) < 120 + enemy.radius) {
                        // 50% damage per tick. 12 ticks total = 600% Damage over 3s.
                        let dmg = this.damage * 0.5;
                        if (enemy.isBoss) {
                            dmg *= stats.bossDamageMultiplier;
                        }
                        const ft = enemy.takeDamage(dmg, { name: this.name, level: this.level });
                        if(ft) game.addFloatingText(ft);
                    }
                });
            }
        }

        // Health Regeneration
        const now = Date.now();
        if (now - this.lastRegenTime >= 1000) {
            this.lastRegenTime = now;
            // Use fresh stats variable for regen calc
            const regenStats = this.getFinalStats(); 
            if (this.health < regenStats.maxHealth && !this.isDead && regenStats.healthRegen > 0) {
                this.health = Math.min(regenStats.maxHealth, this.health + regenStats.healthRegen);
            }
        }
    }
    
    enterCombat() {
        this.lastCombatTime = Date.now();
    }
    
    useSkill(index: number, game: GameContext) {
        const skill = this.skills[index];
        if (skill && this.level >= skill.definition.unlockLevel && Date.now() - skill.lastUsed > skill.definition.cooldown) {
            skill.definition.use(this, game);
            skill.lastUsed = Date.now();
            // Trigger attack animation
            this.attackAnimationTimer = 15;
        }
    }

    getXpToNextLevel(): number {
        if (this.level >= GAME_CONFIG.MAX_LEVEL) return Infinity;
        return LEVEL_XP_REQUIREMENTS[this.level] || Infinity;
    }

    gainXP(amount: number, addFloatingText: (ft: FloatingText) => void, enemyLevel: number) {
        if (this.level >= GAME_CONFIG.MAX_LEVEL) return;

        // Calculate XP Penalty for high level gap
        let finalXP = amount;
        const levelDiff = enemyLevel - this.level;
        
        if (levelDiff > 5) {
            const penaltySteps = levelDiff - 5;
            // 6 levels up = 50%, 7 levels = 25%, 8 levels = 12.5%
            const multiplier = Math.pow(0.5, penaltySteps);
            finalXP = Math.floor(amount * multiplier);
        }

        // Minimum 1 XP if we killed something valid (unless penalty effectively zeroes it, but let's keep 1)
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
        this.health = this.getFinalStats().maxHealth;
        this.maxHealth = this.health;
    }
    
    pickupItem(item: Item): boolean {
        // Handle materials stacking
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

    equipItem(inventoryIndex: number) {
        const item = this.inventory[inventoryIndex];
        if (!item || item.type !== 'Equipment' || !item.slot) return;
        
        const currentItem = this.equipment[item.slot];
        this.equipment[item.slot] = item;
        this.inventory[inventoryIndex] = currentItem; // Swap
        this.recalculateStats();
        // Stat change might change inventory capacity
        this.updateInventoryCapacity();
    }

    unequipItem(slot: ItemSlot) {
        const item = this.equipment[slot];
        if (!item) return;

        const emptySlotIndex = this.inventory.findIndex(s => s === null);
        if (emptySlotIndex === -1) {
            // No space, cannot unequip
            return;
        }

        this.inventory[emptySlotIndex] = item;
        this.equipment[slot] = null;
        this.recalculateStats();
        // Stat change might change inventory capacity (e.g. unequipping a bag)
        this.updateInventoryCapacity();
    }

    moveItem(fromIndex: number, toIndex: number) {
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || fromIndex >= this.inventory.length) return;
        if (toIndex < 0 || toIndex >= this.inventory.length) return;

        const itemA = this.inventory[fromIndex];
        const itemB = this.inventory[toIndex];
        
        // Check if merging materials
        if (itemA && itemB && itemA.id === itemB.id && itemA.type === 'Material') {
            // Add A quantity to B
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
        // Check for inventory space
        if (!this.inventory.some(slot => !slot)) return false;
        // Check and consume ingredients
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

        if (item.type === 'Material' && item.quantity && item.quantity > 1 && !sellFullStack) {
            this.gold += item.sellPrice;
            item.quantity--;
        } else {
            this.gold += item.sellPrice * (item.quantity || 1);
            this.inventory[inventoryIndex] = null;
        }
        return true;
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
        const healthPercentage = this.health / this.maxHealth;
        this.maxHealth = finalStats.maxHealth;
        this.damage = finalStats.damage;
        this.health = this.maxHealth * healthPercentage;
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
        this.gold = Math.floor(this.gold * 0.9); // Lose 10% gold
        this.position = { x: GAME_CONFIG.WORLD_WIDTH / 2, y: GAME_CONFIG.WORLD_HEIGHT / 2 };
        this.isDead = false;
        this.health = this.maxHealth;
        this.totalDamageTaken = 0;
        this.deathLog = [];
        this.setInvulnerable(3000);
    }

    draw(ctx: CanvasRenderingContext2D) {
        super.draw(ctx);
        
        // Draw name below player
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
        // Before saving, clamp health to maxHealth
        const finalStats = this.getFinalStats();
        const clampedHealth = Math.min(this.health, finalStats.maxHealth);

        return {
            id: this.id as string,
            name: this.name,
            characterClass: this.characterClass,
            level: this.level,
            xp: this.xp,
            gold: this.gold,
            kills: this.kills,
            stats: { ...this.baseStats, health: clampedHealth },
            inventory: this.inventory,
            equipment: this.equipment,
            position: this.position,
            discoveredWaypoints: this.discoveredWaypoints
        };
    }
}
