
import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import CharacterSelectScreen from './components/CharacterSelectScreen';
import CharacterCreationScreen from './components/CharacterCreationScreen';
import Game from './components/Game';
import DeathScreen from './components/DeathScreen';
import { authService, GoogleUser } from './services/auth';
import { storageService } from './services/storage';
import { CharacterData, CharacterClass, GameStats, ItemRarity, Item } from './game/types';
import { Player } from './game/entities/Player';
import { MATERIALS_DB, ALL_EQUIPMENT } from './game/items';
import { GAME_CONFIG, WAYPOINTS } from './game/constants';

type GameState = 'login' | 'char_select' | 'char_create' | 'in_game' | 'dead';

const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>('login');
    const [user, setUser] = useState<GoogleUser | null>(null);
    const [characters, setCharacters] = useState<CharacterData[]>([]);
    const [currentCharacter, setCurrentCharacter] = useState<CharacterData | null>(null);
    const [deathStats, setDeathStats] = useState<GameStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDevMode, setDevMode] = useState(false);
    const [isOnlineMode, setOnlineMode] = useState(false);

    // Load characters function
    const refreshCharacters = async (uid: string) => {
        setLoading(true);
        const chars = await storageService.getCharacters(uid);
        setCharacters(chars);
        setLoading(false);
    };

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged(async (authUser) => {
            if (authUser) {
                setUser(authUser);
                await refreshCharacters(authUser.uid);
                setGameState('char_select');
            } else {
                setUser(null);
                setGameState('login');
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async (email: string) => {
        setLoading(true);
        try {
            // Google Auth redirects away, so we won't reach the next lines usually
            await authService.signInWithGoogle(email);
        } catch (error) {
            console.error("Login failed:", error);
            alert("Failed to sign in.");
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await authService.signOut();
        setCurrentCharacter(null);
        setCharacters([]);
    };
    
    const handleSelectCharacter = async (character: CharacterData) => {
        if (isOnlineMode) {
            alert("Error: Online servers are currently unavailable.");
            return;
        }

        let finalCharacterData = character;

        // Dev Mode Logic
        if (isDevMode && !character.hasClaimedDevRewards) {
            const devCharacter = JSON.parse(JSON.stringify(character)) as CharacterData;
            
            devCharacter.level = GAME_CONFIG.MAX_LEVEL;
            devCharacter.gold = 10000000;
            devCharacter.xp = 0;
            devCharacter.discoveredWaypoints = WAYPOINTS.map(wp => wp.id);

            const maxRarity = Math.max(...ALL_EQUIPMENT.map(i => i.rarity));
            const topTierEquipment = ALL_EQUIPMENT.filter(i => i.rarity === maxRarity);
            
            const allMaterials = Object.values(MATERIALS_DB);
            const materialItems: Item[] = [];
            allMaterials.forEach(mat => {
                materialItems.push({ ...mat, quantity: 999 });
                materialItems.push({ ...mat, quantity: 999 });
            });
            
            const devItems = [...topTierEquipment, ...materialItems];
            const inventorySize = Math.max(GAME_CONFIG.DEFAULT_INVENTORY_SIZE, devItems.length + 5);
            devCharacter.inventory = Array(inventorySize).fill(null);

            for (let i = 0; i < devItems.length; i++) {
                const item = devItems[i];
                devCharacter.inventory[i] = { ...item };
            }

            devCharacter.hasClaimedDevRewards = true;
            
            if (user) {
                // Async save
                await storageService.saveCharacter(user.uid, devCharacter);
                await refreshCharacters(user.uid);
            }

            finalCharacterData = devCharacter;
        }

        setCurrentCharacter(finalCharacterData);
        setGameState('in_game');
    };

    const handleCreateNew = () => {
        setGameState('char_create');
    };
    
    const handleCreateCharacter = async (name: string, characterClass: CharacterClass) => {
        if (user) {
            setLoading(true);
            const newChar = await storageService.createCharacter(user.uid, name, characterClass);
            if (newChar) {
                await refreshCharacters(user.uid);
                handleSelectCharacter(newChar);
            } else {
                setLoading(false);
                setGameState('char_select');
            }
        }
    };

    const handleDeleteCharacter = async (characterId: string) => {
        if (user && window.confirm("Are you sure you want to delete this character? This cannot be undone.")) {
            setLoading(true);
            await storageService.deleteCharacter(user.uid, characterId);
            await refreshCharacters(user.uid);
        }
    };

    const handleDeath = async (stats: GameStats, finalCharacterData: CharacterData) => {
        if (user) {
            await storageService.saveCharacter(user.uid, finalCharacterData);
            await refreshCharacters(user.uid);
        }
        setDeathStats(stats);
        setGameState('dead');
    };
    
    const handleReturnToSelect = async (finalCharacterData: CharacterData) => {
        if (user) {
            // Optimistic update
            setLoading(true);
            await storageService.saveCharacter(user.uid, finalCharacterData);
            await refreshCharacters(user.uid);
        }
        setCurrentCharacter(null);
        setGameState('char_select');
    };

    const handleReturnToMenu = () => {
        setDeathStats(null);
        setGameState('char_select');
    };

    const handleRespawnInGame = async () => {
        if (!currentCharacter || !user) return;

        const playerToRespawn = new Player(currentCharacter);
        playerToRespawn.respawn();
        const respawnedCharacterData = playerToRespawn.toCharacterData();

        await storageService.saveCharacter(user.uid, respawnedCharacterData);
        await refreshCharacters(user.uid);
        
        setCurrentCharacter(respawnedCharacterData);
        setDeathStats(null);
        setGameState('in_game');
    };

    const renderContent = () => {
        if (loading) {
            return <div className="text-white text-2xl animate-pulse">Loading data...</div>;
        }
        switch (gameState) {
            case 'login':
                return <LoginScreen onLogin={handleLogin} />;
            case 'char_select':
                return user && <CharacterSelectScreen 
                                    user={user}
                                    characters={characters} 
                                    onSelectCharacter={handleSelectCharacter}
                                    onCreateNew={handleCreateNew}
                                    onDeleteCharacter={handleDeleteCharacter}
                                    onLogout={handleLogout}
                                    isDevMode={isDevMode}
                                    onSetDevMode={setDevMode}
                                    isOnlineMode={isOnlineMode}
                                    onSetOnlineMode={setOnlineMode}
                                />;
            case 'char_create':
                return <CharacterCreationScreen 
                            onCreate={handleCreateCharacter} 
                            onCancel={() => setGameState('char_select')} 
                        />;
            case 'in_game':
                return currentCharacter && <Game 
                                                characterData={currentCharacter} 
                                                onDeath={handleDeath}
                                                onReturnToSelect={handleReturnToSelect}
                                                isDevMode={isDevMode}
                                                isOnlineMode={isOnlineMode}
                                            />;
            case 'dead':
                return <DeathScreen 
                            stats={deathStats} 
                            onReturnToMenu={handleReturnToMenu} 
                            onRespawnInGame={handleRespawnInGame}
                        />;
            default:
                return <LoginScreen onLogin={handleLogin} />;
        }
    };

    return (
        <div className="w-screen h-screen bg-gray-900 text-white flex items-center justify-center font-sans overflow-hidden">
            <div className="absolute inset-0 bg-[url('/background.png')] bg-cover bg-center opacity-20"></div>
            
            {renderContent()}
        </div>
    );
};

export default App;
