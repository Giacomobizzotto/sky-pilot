import { STORAGE_KEY, SKINS } from '../constants';
import { UserData } from '../types';

const DEFAULT_DATA: UserData = {
  coins: 0,
  highScore: 0,
  ownedSkins: ['default'],
  selectedSkinId: 'default'
};

export const loadUserData = (): UserData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_DATA, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error("Failed to load save data", e);
  }
  return DEFAULT_DATA;
};

export const saveUserData = (data: UserData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save data", e);
  }
};