
import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import CharacterSelectScreen from './components/CharacterSelectScreen';
import CharacterCreationScreen from './components/CharacterCreationScreen';
import Game from './components/Game';
import DeathScreen from './components/DeathScreen';
import { authService, GoogleUser } from './services/auth';
import { storageService } from './services/storage';
import { CharacterData, CharacterClass, GameStats } from './game/types';
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
    const [isOnlineMode, setOnlineMode] = useState(false); // New state for world type

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged(authUser => {
            if (authUser) {
                setUser(authUser);
                setCharacters(storageService.getCharacters(authUser.uid));
                setGameState('char_select');
            } else {
                setUser(null);
                setGameState('login');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async (email: string) => {
        setLoading(true);
        try {
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
    
    const handleSelectCharacter = (character: CharacterData) => {
        if (isOnlineMode) {
            alert("Error: Online servers are currently unavailable.");
            return;
        }

        let finalCharacterData = character;
        if (isDevMode) {
            // Create a deep copy to avoid mutating the original character state
            const devCharacter = JSON.parse(JSON.stringify(character)) as CharacterData;
            
            devCharacter.level = GAME_CONFIG.MAX_LEVEL;
            devCharacter.gold = 1000000;
            devCharacter.xp = 0;

            // Unlock all Waypoints
            devCharacter.discoveredWaypoints = WAYPOINTS.map(wp => wp.id);

            // Spawn All Items
            const allItems = [...Object.values(MATERIALS_DB), ...ALL_EQUIPMENT];
            // Expand inventory to fit everything + some buffer
            const inventorySize = Math.max(20, allItems.length + 5);
            devCharacter.inventory = Array(inventorySize).fill(null);

            for (let i = 0; i < allItems.length; i++) {
                const item = allItems[i];
                if (item.type === 'Material') {
                    devCharacter.inventory[i] = { ...item, quantity: 999 };
                } else {
                    devCharacter.inventory[i] = { ...item };
                }
            }

            finalCharacterData = devCharacter;
        }
        setCurrentCharacter(finalCharacterData);
        setGameState('in_game');
    };

    const handleCreateNew = () => {
        setGameState('char_create');
    };
    
    const handleCreateCharacter = (name: string, characterClass: CharacterClass) => {
        if (user) {
            const newChar = storageService.createCharacter(user.uid, name, characterClass);
            if (newChar) {
                setCharacters(storageService.getCharacters(user.uid));
                handleSelectCharacter(newChar);
            } else {
                setGameState('char_select');
            }
        }
    };

    const handleDeleteCharacter = (characterId: string) => {
        if (user && window.confirm("Are you sure you want to delete this character? This cannot be undone.")) {
            storageService.deleteCharacter(user.uid, characterId);
            setCharacters(storageService.getCharacters(user.uid));
        }
    };

    const handleDeath = (stats: GameStats, finalCharacterData: CharacterData) => {
        if (user) {
            storageService.saveCharacter(user.uid, finalCharacterData);
            setCharacters(storageService.getCharacters(user.uid));
        }
        setDeathStats(stats);
        setGameState('dead');
    };
    
    const handleReturnToSelect = (finalCharacterData: CharacterData) => {
        if (user) {
            storageService.saveCharacter(user.uid, finalCharacterData);
            setCharacters(storageService.getCharacters(user.uid));
        }
        setCurrentCharacter(null);
        setGameState('char_select');
    };

    const handleReturnToMenu = () => {
        setDeathStats(null);
        setGameState('char_select');
    };

    const handleRespawnInGame = () => {
        if (!currentCharacter || !user) return;

        const playerToRespawn = new Player(currentCharacter);
        playerToRespawn.respawn();
        const respawnedCharacterData = playerToRespawn.toCharacterData();

        storageService.saveCharacter(user.uid, respawnedCharacterData);
        setCharacters(storageService.getCharacters(user.uid));
        
        setCurrentCharacter(respawnedCharacterData);
        setDeathStats(null);
        setGameState('in_game');
    };

    const renderContent = () => {
        if (loading) {
            return <div className="text-white text-2xl">Loading...</div>;
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
