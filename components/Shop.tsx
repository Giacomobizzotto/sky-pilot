import React from 'react';
import { PlaneSkin, UserData } from '../types';
import { SKINS } from '../constants';

interface ShopProps {
  userData: UserData;
  onClose: () => void;
  onEquip: (skinId: string) => void;
  onBuy: (skinId: string, cost: number) => void;
}

const Shop: React.FC<ShopProps> = ({ userData, onClose, onEquip, onBuy }) => {
  
  const renderPlanePreview = (skin: PlaneSkin) => {
    if (skin.model === 'biplane') {
      return (
        <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-lg transition-transform group-hover:scale-110 duration-300">
          <rect x="10" y="30" width="80" height="15" fill={skin.color} />
          <rect x="10" y="55" width="80" height="15" fill={skin.color} />
          <rect x="25" y="30" width="8" height="40" fill="#4b5563" />
          <rect x="67" y="30" width="8" height="40" fill="#4b5563" />
          <ellipse cx="50" cy="50" rx="10" ry="25" fill={skin.accent} />
          <path d="M50 25 L50 5 L55 25 Z" fill={skin.color} />
        </svg>
      );
    } else if (skin.model === 'ufo') {
      return (
        <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-lg transition-transform group-hover:scale-110 duration-300">
           <path d="M30 45 A 20 20 0 0 1 70 45" fill="#60a5fa" stroke={skin.color} strokeWidth="2"/>
           <ellipse cx="50" cy="50" rx="45" ry="12" fill={skin.color} />
           <circle cx="20" cy="50" r="3" fill={skin.accent} />
           <circle cx="50" cy="55" r="3" fill={skin.accent} />
           <circle cx="80" cy="50" r="3" fill={skin.accent} />
        </svg>
      );
    } else {
      // Jet
      return (
        <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-lg transition-transform group-hover:scale-110 duration-300">
           <path d="M50 10 L65 80 L35 80 Z" fill={skin.color} />
           <path d="M50 30 L90 70 L90 80 L50 60 Z" fill={skin.accent} />
           <path d="M50 30 L10 70 L10 80 L50 60 Z" fill={skin.accent} />
           <circle cx="50" cy="80" r="5" fill="#f59e0b" />
        </svg>
      );
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-900 z-20 flex flex-col p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white tracking-widest">HANGAR</h2>
        <div className="bg-slate-800 px-4 py-2 rounded-full border border-slate-700 shadow-inner">
           <span className="text-yellow-400 font-bold text-xl drop-shadow-md">${userData.coins}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        {SKINS.map((skin) => {
          const owned = userData.ownedSkins.includes(skin.id);
          const equipped = userData.selectedSkinId === skin.id;

          return (
            <div 
              key={skin.id}
              className={`relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border-2 transition-all group ${
                equipped ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="h-40 bg-slate-950/50 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                 {/* Radial Burst BG */}
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-700/30 to-transparent"></div>
                 {renderPlanePreview(skin)}
              </div>
              
              <div className="flex justify-between items-end mb-4">
                <div>
                    <h3 className="text-white font-black text-xl italic uppercase">{skin.name}</h3>
                    <p className="text-slate-400 text-xs uppercase tracking-wider">{skin.model} TYPE</p>
                </div>
              </div>

              {owned ? (
                <button
                  onClick={() => onEquip(skin.id)}
                  disabled={equipped}
                  className={`w-full py-3 rounded-lg font-bold transition-all transform active:scale-95 ${
                    equipped 
                      ? 'bg-green-600 text-white cursor-default shadow-lg' 
                      : 'bg-slate-700 hover:bg-slate-600 text-white shadow-md'
                  }`}
                >
                  {equipped ? 'FLIGHT READY' : 'EQUIP'}
                </button>
              ) : (
                <button
                  onClick={() => onBuy(skin.id, skin.price)}
                  disabled={userData.coins < skin.price}
                  className={`w-full py-3 rounded-lg font-bold transition-all transform active:scale-95 flex justify-center items-center gap-2 ${
                    userData.coins >= skin.price
                      ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white shadow-lg shadow-orange-900/50'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <span>UNLOCK</span>
                  <span className={userData.coins >= skin.price ? 'text-yellow-100' : ''}>${skin.price}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-0 left-0 w-full p-4 bg-slate-900/95 border-t border-slate-800 backdrop-blur-sm">
         <button 
           onClick={onClose}
           className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition-colors border-b-4 border-slate-900"
         >
           BACK TO MENU
         </button>
      </div>
    </div>
  );
};

export default Shop;