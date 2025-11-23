import React from 'react';

interface GameOverProps {
  score: number;
  coins: number;
  onRetry: () => void;
  onMenu: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ score, coins, onRetry, onMenu }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/40 backdrop-blur-md z-20 text-white animate-in fade-in duration-300">
      <h2 className="text-5xl font-black text-red-500 mb-2 drop-shadow-lg">CRASHED!</h2>
      
      <div className="bg-slate-800/80 p-8 rounded-2xl border border-slate-700 shadow-2xl min-w-[300px] text-center mb-8">
        <div className="mb-6">
            <p className="text-slate-400 text-sm">FINAL SCORE</p>
            <p className="text-4xl font-bold text-white">{score}</p>
        </div>
        <div className="mb-2 flex justify-center items-center gap-2">
             <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
             <p className="text-xl text-yellow-300">+{coins} Coins</p>
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={onRetry}
          className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg transform transition hover:scale-105 active:scale-95 border-b-4 border-green-800"
        >
          RETRY
        </button>
        <button 
          onClick={onMenu}
          className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg transform transition hover:scale-105 active:scale-95 border-b-4 border-slate-800"
        >
          MENU
        </button>
      </div>
    </div>
  );
};

export default GameOver;