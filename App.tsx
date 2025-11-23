import React, { useState, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import Shop from './components/Shop';
import GameOver from './components/GameOver';
import { GameState, UserData } from './types';
import { loadUserData, saveUserData } from './services/storage';
import { getSkinById } from './utils/gameUtils';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [userData, setUserData] = useState<UserData>(loadUserData());
  const [lastRunStats, setLastRunStats] = useState({ score: 0, coins: 0 });

  // Persist user data whenever it changes
  useEffect(() => {
    saveUserData(userData);
  }, [userData]);

  const startGame = () => {
    setGameState(GameState.PLAYING);
  };

  const openShop = () => {
    setGameState(GameState.SHOP);
  };

  const closeShop = () => {
    setGameState(GameState.MENU);
  };

  const handleGameOver = useCallback((score: number, collectedCoins: number) => {
    setLastRunStats({ score, coins: collectedCoins });
    
    setUserData(prev => ({
      ...prev,
      coins: prev.coins + collectedCoins,
      highScore: Math.max(prev.highScore, score)
    }));
    
    setGameState(GameState.GAME_OVER);
  }, []);

  const handleCoinCollected = useCallback(() => {
    // Sound effect trigger could go here
  }, []);

  const handleBuySkin = (skinId: string, cost: number) => {
    if (userData.coins >= cost && !userData.ownedSkins.includes(skinId)) {
        setUserData(prev => ({
            ...prev,
            coins: prev.coins - cost,
            ownedSkins: [...prev.ownedSkins, skinId],
            selectedSkinId: skinId // Auto equip
        }));
    }
  };

  const handleEquipSkin = (skinId: string) => {
    if (userData.ownedSkins.includes(skinId)) {
        setUserData(prev => ({
            ...prev,
            selectedSkinId: skinId
        }));
    }
  };

  const currentSkin = getSkinById(userData.selectedSkinId);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 font-sans select-none">
      {/* Game Engine runs in background to keep 3D context alive, or pause it */}
      <GameCanvas 
        gameState={gameState} 
        skin={currentSkin}
        onGameOver={handleGameOver}
        onCoinCollected={handleCoinCollected}
      />

      {/* UI Layers */}
      {gameState === GameState.MENU && (
        <MainMenu 
          onStart={startGame} 
          onOpenShop={openShop} 
          userData={userData}
        />
      )}

      {gameState === GameState.SHOP && (
        <Shop 
          userData={userData}
          onClose={closeShop}
          onBuy={handleBuySkin}
          onEquip={handleEquipSkin}
        />
      )}

      {gameState === GameState.GAME_OVER && (
        <GameOver 
          score={lastRunStats.score}
          coins={lastRunStats.coins}
          onRetry={startGame}
          onMenu={() => setGameState(GameState.MENU)}
        />
      )}
    </div>
  );
};

export default App;