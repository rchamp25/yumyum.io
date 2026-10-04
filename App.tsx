import React, { useState, useEffect, useRef, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import CharacterSelectScreen from './components/CharacterSelectScreen';
import CharacterCreationScreen from './components/CharacterCreationScreen';
import Game from './components/Game';
import DeathScreen from './components/DeathScreen';
import { authService, AuthUser } from './services/auth';
import { storageService } from './services/storage';
import { guestStorage, isGuestSessionActive, setGuestSessionActive } from './services/guestStorage';
import { CharacterData, CharacterClass, GameStats, Item } from './game/types';
import { Player } from './game/entities/Player';
import { MATERIALS_DB, ALL_EQUIPMENT } from './game/items';
import { GAME_CONFIG, WAYPOINTS } from './game/constants';

type GameState = 'login' | 'char_select' | 'char_create' | 'in_game' | 'dead';

// Characters flagged with `is_dev` in the database get max level, gold and top-tier items
// the first time they're played. The flag can only be set from the Supabase dashboard.
const applyDevRewards = (character: CharacterData): CharacterData => {
    const devCharacter = structuredClone(character);
    devCharacter.level = GAME_CONFIG.MAX_LEVEL;
    devCharacter.gold = 10000000;
    devCharacter.discoveredWaypoints = WAYPOINTS.map(wp => wp.id);

    const maxRarity = Math.max(...ALL_EQUIPMENT.map(i => i.rarity));
    const topTierEquipment = ALL_EQUIPMENT.filter(i => i.rarity === maxRarity);
    const materialItems: Item[] = Object.values(MATERIALS_DB).map(mat => ({ ...mat, quantity: 999 }));
    const devItems = [...topTierEquipment, ...materialItems];

    devCharacter.inventory = Array(Math.max(GAME_CONFIG.DEFAULT_INVENTORY_SIZE, devItems.length + 5)).fill(null);
    devItems.forEach((item, i) => { devCharacter.inventory[i] = { ...item }; });
    devCharacter.hasClaimedDevRewards = true;
    return devCharacter;
};

const GUEST_USER: AuthUser = { uid: 'guest', displayName: 'Guest', email: '', isGuest: true };

/** Brings a dead character back to town at full health, applying the death gold penalty. */
const respawnCharacter = (character: CharacterData): CharacterData => {
    const player = new Player(character);
    player.respawn();
    return player.toCharacterData();
};

const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>('login');
    const [user, setUser] = useState<AuthUser | null>(null);
    const [characters, setCharacters] = useState<CharacterData[]>([]);
    const [currentCharacter, setCurrentCharacter] = useState<CharacterData | null>(null);
    const [deathInfo, setDeathInfo] = useState<{ stats: GameStats; goldLost: number } | null>(null);
    const [loading, setLoading] = useState(true);
    // Bumped every time a game session starts so <Game> remounts with fresh state (e.g. after world travel)
    const [gameSessionKey, setGameSessionKey] = useState(0);

    // Guests keep their heroes in this browser; signed-in players keep theirs in Supabase
    const store = user?.isGuest ? guestStorage : storageService;

    // Supabase re-emits the signed-in user on token refresh and when the tab regains focus.
    // Only a change of user should reset the app; otherwise players get kicked out mid-game.
    const currentUidRef = useRef<string | null | undefined>(undefined);

    /** Switches to a signed-in player, a guest, or nobody (the login screen). */
    const enterSession = useCallback(async (nextUser: AuthUser | null) => {
        currentUidRef.current = nextUser?.uid ?? null;
        setCurrentCharacter(null);
        setDeathInfo(null);
        setUser(nextUser);
        if (nextUser) {
            setLoading(true);
            const sessionStore = nextUser.isGuest ? guestStorage : storageService;
            setCharacters(await sessionStore.getCharacters(nextUser.uid));
            setGameState('char_select');
        } else {
            setCharacters([]);
            setGameState('login');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        return authService.onAuthStateChanged((authUser) => {
            // Signing in with Google ends guest mode
            if (authUser) setGuestSessionActive(false);
            const nextUser = authUser ?? (isGuestSessionActive() ? GUEST_USER : null);
            if ((nextUser?.uid ?? null) === currentUidRef.current) return;
            void enterSession(nextUser);
        });
    }, [enterSession]);

    /** Keeps the character list in sync with the latest data so the menu never shows stale progress. */
    const updateLocalCharacter = useCallback((data: CharacterData) => {
        setCharacters(prev => prev.map(c => (c.id === data.id ? data : c)));
    }, []);

    const saveCharacter = useCallback(async (data: CharacterData) => {
        updateLocalCharacter(data);
        if (!user) return;
        const saved = await store.saveCharacter(user.uid, data);
        if (!saved) alert("Your progress couldn't be saved. Check your connection and try again.");
    }, [user, store, updateLocalCharacter]);

    const checkNameTaken = useCallback((name: string) => store.checkCharacterNameExists(name), [store]);

    const startGame = (character: CharacterData) => {
        setCurrentCharacter(character);
        setGameSessionKey(k => k + 1);
        setGameState('in_game');
    };

    const handleLogin = async () => {
        setLoading(true);
        try {
            await authService.signInWithGoogle();
        } catch (error) {
            console.error("Login failed:", error);
            alert("Failed to sign in.");
            setLoading(false);
        }
    };

    const handlePlayAsGuest = () => {
        setGuestSessionActive(true);
        void enterSession(GUEST_USER);
    };

    const handleLogout = async () => {
        if (user?.isGuest) {
            // Guest heroes stay in this browser for next time
            setGuestSessionActive(false);
            await enterSession(null);
        } else {
            await authService.signOut();
        }
    };

    const handleSelectCharacter = async (character: CharacterData) => {
        let data = character;
        // Characters saved mid-death by older versions of the game come back at 0 HP
        if (data.stats.health <= 0) data = respawnCharacter(data);
        if (data.isDev && !data.hasClaimedDevRewards) data = applyDevRewards(data);

        if (data !== character) {
            setLoading(true);
            await saveCharacter(data);
            setLoading(false);
        }
        startGame(data);
    };

    const handleCreateCharacter = async (name: string, characterClass: CharacterClass) => {
        if (!user) return;
        setLoading(true);
        const newChar = await store.createCharacter(user.uid, name, characterClass);
        if (newChar) {
            setCharacters(prev => [...prev, newChar]);
            setLoading(false);
            await handleSelectCharacter(newChar);
        } else {
            setLoading(false);
            setGameState('char_select');
        }
    };

    const handleDeleteCharacter = async (characterId: string) => {
        if (!user || !window.confirm("Are you sure you want to delete this character? This cannot be undone.")) return;
        setLoading(true);
        await store.deleteCharacter(user.uid, characterId);
        setCharacters(await store.getCharacters(user.uid));
        setLoading(false);
    };

    const handleDeath = (stats: GameStats, finalCharacterData: CharacterData) => {
        // Apply the death penalty right away, so the saved character is never left dead
        const respawned = respawnCharacter(finalCharacterData);
        setDeathInfo({ stats, goldLost: finalCharacterData.gold - respawned.gold });
        setCurrentCharacter(respawned);
        setGameState('dead');
        void saveCharacter(respawned);
    };

    const handleLeave = async (finalCharacterData: CharacterData) => {
        setLoading(true);
        await saveCharacter(finalCharacterData);
        setCurrentCharacter(null);
        setGameState('char_select');
        setLoading(false);
    };

    const handleTravelToWorld = async (characterData: CharacterData) => {
        setLoading(true);
        await saveCharacter(characterData);
        startGame(characterData);
        setLoading(false);
    };

    const handleReturnToMenu = () => {
        setDeathInfo(null);
        setCurrentCharacter(null);
        setGameState('char_select');
    };

    const handleRespawnInGame = () => {
        if (!currentCharacter) return;
        setDeathInfo(null);
        startGame(currentCharacter);
    };

    const renderContent = () => {
        if (loading) return <div className="text-white text-2xl animate-pulse">Loading adventure...</div>;
        switch (gameState) {
            case 'login':
                return <LoginScreen onLogin={handleLogin} onPlayAsGuest={handlePlayAsGuest} />;
            case 'char_select':
                return user && (
                    <CharacterSelectScreen
                        user={user}
                        characters={characters}
                        onSelectCharacter={handleSelectCharacter}
                        onCreateNew={() => setGameState('char_create')}
                        onDeleteCharacter={handleDeleteCharacter}
                        onLogout={handleLogout}
                    />
                );
            case 'char_create':
                return (
                    <CharacterCreationScreen
                        checkNameTaken={checkNameTaken}
                        onCreate={handleCreateCharacter}
                        onCancel={() => setGameState('char_select')}
                    />
                );
            case 'in_game':
                return currentCharacter && user && (
                    <Game
                        key={gameSessionKey}
                        characterData={currentCharacter}
                        onSave={(data) => store.saveCharacter(user.uid, data)}
                        onDeath={handleDeath}
                        onLeave={handleLeave}
                        onTravelToWorld={handleTravelToWorld}
                    />
                );
            case 'dead':
                return (
                    <DeathScreen
                        stats={deathInfo?.stats ?? null}
                        goldLost={deathInfo?.goldLost ?? 0}
                        onReturnToMenu={handleReturnToMenu}
                        onRespawnInGame={handleRespawnInGame}
                    />
                );
        }
    };

    if (gameState === 'in_game' && !loading) {
        return <div className="w-screen h-dvh bg-gray-950 text-white font-sans overflow-hidden">{renderContent()}</div>;
    }

    // Menus scroll on small screens instead of being cut off
    return (
        <div className="w-screen h-dvh bg-gray-950 text-white font-sans relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-b from-gray-900 to-black opacity-50 pointer-events-none"></div>
            <div className="absolute inset-0 overflow-y-auto">
                <div className="min-h-full flex items-center justify-center p-4">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default App;
