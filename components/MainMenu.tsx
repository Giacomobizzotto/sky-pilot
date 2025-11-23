import React from 'react';
import { UserData } from '../types';

interface MainMenuProps {
  onStart: () => void;
  onOpenShop: () => void;
  userData: UserData;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart, onOpenShop, userData }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10 text-white">
      <h1 className="text-6xl font-black italic tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 drop-shadow-[0_2px_10px_rgba(56,189,248,0.5)]">
        SKY PILOT 3D
      </h1>
      
      <div className="mb-8 text-center">
        <p className="text-gray-300 text-lg mb-1">HIGH SCORE</p>
        <p className="text-4xl font-bold text-yellow-400">{userData.highScore}</p>
      </div>

      <div className="flex flex-col gap-4 w-64">
        <button 
          onClick={onStart}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-lg shadow-lg transform transition hover:scale-105 active:scale-95 border-b-4 border-blue-800"
        >
          TAKEOFF
        </button>
        
        <button 
          onClick={onOpenShop}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition hover:scale-105 active:scale-95 border-b-4 border-purple-800 flex justify-center items-center gap-2"
        >
          <span>HANGAR</span>
          <span className="bg-purple-800 text-xs py-0.5 px-2 rounded-full text-yellow-300">
            ${userData.coins}
          </span>
        </button>
      </div>

      <div className="mt-12 text-gray-500 text-sm">
        <p>PC: Mouse to fly</p>
        <p>Mobile: Drag to fly</p>
      </div>
    </div>
  );
};

export default MainMenu;